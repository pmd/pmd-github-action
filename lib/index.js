const core = require('@actions/core');
const {DefaultArtifactClient} = require('@actions/artifact');
const util = require('./util');
const sarif = require('./sarif');
const validator = require('./validator');
const annotations = require('./annotations');
const comments = require('./comments');

const reportFormat = 'sarif';
const reportFile = 'pmd-report.sarif'

async function main() {
  let pmdInfo, modifiedFiles, execOutput, violations;
  let token = core.getInput('token', { required: true });
  let sourcePath = validator.validateSourcePath(core.getInput('sourcePath', { required: true }));
  try {
    pmdInfo = await util.downloadPmd(
      validator.validateVersion(core.getInput('version'), { required: true }),
      token,
      validator.validateDownloadUrl(core.getInput('downloadUrl'), { required: true })
    );

    if (core.getInput('analyzeModifiedFilesOnly', { required: true }) === 'true') {
      core.info(`Determining modified files in ${sourcePath}...`);
      modifiedFiles = await util.determineModifiedFiles(token, sourcePath);
      if (modifiedFiles !== undefined && modifiedFiles.length === 0) {
        core.info(`No modified files have been found in ${sourcePath} - exiting`);
        core.setOutput('violations', 0);
        return;
      }
    }

    execOutput = await util.executePmd(pmdInfo,
      modifiedFiles || sourcePath,
      validator.validateRulesets(core.getInput('rulesets', { required: true })),
      reportFormat, reportFile)

    core.info(`PMD exited with ${execOutput.exitCode}`);

    sarif.relativizeReport(reportFile);
    sarif.fixResults(reportFile);

    violations = sarif.countViolations(reportFile);
    core.setOutput('violations', violations);
    core.info(`PMD detected ${violations} violations.`);

    if (core.getInput('createGitHubAnnotations', { required: false }) === 'true') {
      const report = sarif.loadReport(reportFile);
      annotations.processSarifReport(report);
    }

    if (core.getInput('createGitHubComments', { required: false}) === 'true') {
      const report = sarif.loadReport(reportFile);
      await comments.createComments(report, token);
    }

    if (core.getInput('uploadSarifReport', { required: false }) === 'true' ) {
      const artifactName = 'PMD Report';
      const artifactClient = new DefaultArtifactClient();
      const {id, size} = await artifactClient.uploadArtifact('PMD Report', [reportFile], '.');
      core.info(`Created artifact ${artifactName} with id: ${id} (bytes: ${size})`)
    }
  } catch (error) {
    core.setFailed(error.message || error);
  }
}

main();
