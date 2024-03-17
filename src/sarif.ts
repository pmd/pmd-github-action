import path from 'path'
import type { Log, Result } from 'sarif'
import * as fs from 'fs'
import * as core from '@actions/core'
import * as semver from 'semver'

function countViolations(reportFile: string): number {
  let count = 0

  const report = loadReport(reportFile)
  if (report) {
    count = report.runs[0].results?.length ? report.runs[0].results?.length : 0
  }

  return count
}

function loadReport(reportFile: string): Log | undefined {
  if (!fs.existsSync(reportFile)) {
    return undefined
  }

  return JSON.parse(fs.readFileSync(reportFile).toString())
}

function relativizeReport(reportFile: string): void {
  const report = loadReport(reportFile)
  if (!report || !report.runs[0].results) {
    return
  }

  const prefix = path.normalize(`${process.env['GITHUB_WORKSPACE']}/`)
  const prefixUri = new URL(`file://${prefix}`).href
  core.debug(`Relativizing sarif report '${reportFile}' against '${prefix}'`)
  for (const rule of report.runs[0].results) {
    if (rule.locations) {
      for (const location of rule.locations) {
        if (location.physicalLocation?.artifactLocation) {
          const artifactLocation = location.physicalLocation.artifactLocation

          let uri = artifactLocation.uri
          if (uri?.startsWith('file://')) {
            // sarif report already contains a file uri, remove the prefix "file://".
            // this is true for PMD 7.0.0-rc3 and later
            uri = uri.substring('file://'.length)
          }
          // note: this also converts any backslashes from Windows paths into forward slashes
          // forward slashes are needed in the sarif report for GitHub annotations and codeql upload
          uri = new URL(`file://${uri}`).href
          if (uri.startsWith(prefixUri)) {
            artifactLocation.uri = uri.substring(prefixUri.length)
          } else {
            // report contains already relative paths
            // still use the uri, in order to have forward slashes
            artifactLocation.uri = uri.substring('file://'.length)
          }
        }
      }
    }
  }
  fs.writeFileSync(reportFile, JSON.stringify(report))
}

/**
 * Due to https://github.com/pmd/pmd/issues/3768 violations for a single rule are
 * reported in a single result. This needs to be extracted, as each rule violation should
 * be a separate result.
 *
 * Note: This will be fixed with PMD 6.43.0, so this fix here is only needed for earlier versions.
 *
 * @param {String} reportFile
 */
function fixResults(reportFile: string): void {
  const report = loadReport(reportFile)
  if (!report || !report.runs[0].tool.driver.version) {
    return
  }
  const originalResults = report.runs[0].results
  if (!originalResults) {
    return
  }

  const pmdVersion = report.runs[0].tool.driver.version
  core.debug(`Sarif Report was created by PMD version ${pmdVersion}`)
  if (semver.gte(pmdVersion, '6.43.0')) {
    core.debug(`Sarif Report fix is not needed for PMD version ${pmdVersion}`)
    return
  }

  const fixedResults: Result[] = []
  core.debug(
    `Fixing Sarif Report results: count before: ${originalResults.length}`
  )
  for (const result of originalResults) {
    const originalLocations = result.locations
    delete result.locations
    if (originalLocations) {
      for (const location of originalLocations) {
        const copy = Object.assign({}, result)
        copy.locations = [location]
        fixedResults.push(copy)
      }
    }
  }
  core.debug(`Fixing Sarif Report results: count after: ${fixedResults.length}`)
  report.runs[0].results = fixedResults
  fs.writeFileSync(reportFile, JSON.stringify(report))
}

export { countViolations, loadReport, relativizeReport, fixResults }
