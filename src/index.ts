import * as core from '@actions/core'
import * as artifact from '@actions/artifact'
import * as util from './util'
import * as sarif from './sarif'
import * as validator from './validator'
import * as annotations from './annotations'

const reportFormat = 'sarif'
const reportFile = 'pmd-report.sarif'

async function main(): Promise<void> {
  let pmdInfo
  let modifiedFiles
  let execOutput
  let violations
  const token = core.getInput('token', { required: false })
  const sourcePath = validator.validateSourcePath(
    core.getInput('sourcePath', { required: false })
  )
  try {
    pmdInfo = await util.downloadPmd(
      validator.validateVersion(core.getInput('version', { required: false })),
      token,
      validator.validateDownloadUrl(
        core.getInput('downloadUrl', { required: false })
      )
    )

    if (
      core.getInput('analyzeModifiedFilesOnly', { required: false }) === 'true'
    ) {
      core.info(`Determining modified files in ${sourcePath}...`)
      modifiedFiles = await util.determineModifiedFiles(token, sourcePath)
      if (modifiedFiles !== undefined && modifiedFiles.length === 0) {
        core.info(
          `No modified files have been found in ${sourcePath} - exiting`
        )
        core.setOutput('violations', 0)
        return
      }
    }

    execOutput = await util.executePmd(
      pmdInfo,
      modifiedFiles || sourcePath,
      validator.validateRulesets(core.getInput('rulesets', { required: true })),
      reportFormat,
      reportFile
    )

    core.info(`PMD exited with ${execOutput.exitCode}`)

    sarif.relativizeReport(reportFile)
    sarif.fixResults(reportFile)

    violations = sarif.countViolations(reportFile)
    core.setOutput('violations', violations)
    core.info(`PMD detected ${violations} violations.`)

    if (
      core.getInput('createGitHubAnnotations', { required: false }) === 'true'
    ) {
      const report = sarif.loadReport(reportFile)
      if (report) {
        annotations.processSarifReport(report)
      }
    }

    if (core.getInput('uploadSarifReport', { required: false }) === 'true') {
      const artifactName = 'PMD Report'
      const artifactClient = new artifact.DefaultArtifactClient()
      const { id, size } = await artifactClient.uploadArtifact(
        'PMD Report',
        [reportFile],
        '.'
      )
      core.info(
        `Created artifact ${artifactName} with id: ${id} (bytes: ${size})`
      )
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(String(error))
    }
  }
}

main()
