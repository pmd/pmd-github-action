const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const semver = require('semver')

const countViolations = function (reportFile) {
  let count = 0

  const report = loadReport(reportFile)
  if (report !== null) {
    count = report.runs[0].results.length
  }

  return count
}

const loadReport = function (reportFile) {
  if (!fs.existsSync(reportFile)) {
    return null
  }

  return JSON.parse(fs.readFileSync(reportFile))
}

const relativizeReport = function (reportFile) {
  const report = loadReport(reportFile)
  if (report === null) {
    return
  }

  const prefix = path.normalize(`${process.env['GITHUB_WORKSPACE']}/`)
  const prefixUri = new URL(`file:///${prefix}`).href
  core.debug(`Relativizing sarif report '${reportFile}' against '${prefix}'`)
  report.runs[0].results.forEach(rule => {
    rule.locations.forEach(location => {
      const artifactLocation = location.physicalLocation.artifactLocation
      // note: this also converts any backslashes from Windows paths into forward slashes
      // forward slashes are needed in the sarif report for GitHub annotations and codeql upload
      const uri = new URL(`file:///${artifactLocation.uri}`).href
      if (uri.startsWith(prefixUri)) {
        artifactLocation.uri = uri.substring(prefixUri.length)
      } else {
        // report contains already relative paths
        // still use the uri, in order to have forward slashes
        artifactLocation.uri = uri.substring('file:///'.length)
      }
    })
  })
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
const fixResults = function (reportFile) {
  const report = loadReport(reportFile)
  if (report === null) {
    return
  }

  const pmdVersion = report.runs[0].tool.driver.version
  core.debug(`Sarif Report was created by PMD version ${pmdVersion}`)
  if (semver.gte(pmdVersion, '6.43.0')) {
    core.debug(`Sarif Report fix is not needed for PMD version ${pmdVersion}`)
    return
  }

  const originalResults = report.runs[0].results
  const fixedResults = []
  core.debug(
    `Fixing Sarif Report results: count before: ${originalResults.length}`
  )
  originalResults.forEach(result => {
    const originalLocations = result.locations
    delete result.locations
    originalLocations.forEach(location => {
      const copy = Object.assign({}, result)
      copy.locations = [location]
      fixedResults.push(copy)
    })
  })
  core.debug(`Fixing Sarif Report results: count after: ${fixedResults.length}`)
  report.runs[0].results = fixedResults
  fs.writeFileSync(reportFile, JSON.stringify(report))
}

module.exports.countViolations = countViolations
module.exports.loadReport = loadReport
module.exports.relativizeReport = relativizeReport
module.exports.fixResults = fixResults
