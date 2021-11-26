const core = require('@actions/core');
const artifact = require('@actions/artifact');
const util = require('./util');
const sarif = require('./sarif');
const validator = require('../lib/validator');

const reportFormat = 'sarif';
const reportFile = 'pmd-report.sarif'

let pmdPath, exitCode, violations;

async function run() {
  try {
    pmdPath = await util.downloadPmd(validator.validateVersion(core.getInput('version'), { required: true }));
    exitCode = await util.executePmd(pmdPath,
      validator.validateSourcePath(core.getInput('sourcePath', { required: true })),
      validator.validateRulesets(core.getInput('rulesets', { required: true })),
      reportFormat, reportFile)

    core.info(`PMD exited with ${exitCode}`);

    violations = sarif.countViolations(reportFile);
    core.setOutput('violations', violations);
    core.info(`PMD detected ${violations} violations.`);

    const artifactClient = artifact.create();
    await artifactClient.uploadArtifact('PMD Report', [reportFile], '.', {
      continueOnError: false
    });
  } catch (error) {
    core.setFailed(error.message || error);
  }
}

run();
