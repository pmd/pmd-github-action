const core = require('@actions/core');
const artifact = require('@actions/artifact');
const util = require('./util');
const sarif = require('./sarif');
const validator = require('./validator');
const annotations = require('./annotations');

const reportFormat = 'sarif';
const reportFile = 'pmd-report.sarif'

async function main() {
  let pmdInfo, execOutput, violations;
  try {
    pmdInfo = await util.downloadPmd(
      validator.validateVersion(core.getInput('version'), { required: true }),
      core.getInput('token', { required: true })
    );
    execOutput = await util.executePmd(pmdInfo,
      validator.validateSourcePath(core.getInput('sourcePath', { required: true })),
      validator.validateRulesets(core.getInput('rulesets', { required: true })),
      reportFormat, reportFile)

    core.info(`PMD exited with ${execOutput.exitCode}`);

    violations = sarif.countViolations(reportFile);
    core.setOutput('violations', violations);
    core.info(`PMD detected ${violations} violations.`);

    const report = sarif.loadReport(reportFile);
    annotations.processSarifReport(report);

    const artifactClient = artifact.create();
    await artifactClient.uploadArtifact('PMD Report', [reportFile], '.', {
      continueOnError: false
    });
  } catch (error) {
    core.setFailed(error.message || error);
  }
}

main();
