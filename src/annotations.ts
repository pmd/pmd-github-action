const core = require('@actions/core')

const processSarifReport = function (report) {
  if (!report) {
    return
  }

  const rules = report.runs[0].tool.driver.rules
  const results = report.runs[0].results

  core.startGroup('PMD Results')

  core.debug(`processing sarif report`)
  core.debug(`rules: ${rules.length}`)
  core.debug(`results: ${results.length}`)

  results.forEach(violation => {
    const rule = rules[violation.ruleIndex]
    const logFunction = mapPriority(rule.properties.priority)
    violation.locations.forEach(location => {
      const annotation = createAnnotation(
        location.physicalLocation,
        violation.message.text
      )
      core.info(
        `\n${annotation.file}:${annotation.startLine}:${rule.id} (Priority: ${rule.properties.priority}):${violation.message.text}`
      )
      logFunction(createDescription(rule), annotation)
    })
  })

  core.endGroup()
}

function mapPriority(pmdPriority) {
  switch (pmdPriority) {
    case 1: // net.sourceforge.pmd.RulePriority.HIGH
    case 2: // net.sourceforge.pmd.RulePriority.MEDIUM_HIGH
      return core.error
    case 3: // net.sourceforge.pmd.RulePriority.MEDIUM
    case 4: // net.sourceforge.pmd.RulePriority.MEDIUM_LOW
      return core.warning
    default: // net.sourceforge.pmd.RulePriority.LOW (5)
      return core.notice
  }
}

// AnnotationProperties from @actions/core
function createAnnotation(location, title) {
  return {
    title: title,
    file: location.artifactLocation.uri,
    startLine: location.region.startLine,
    endLine: location.region.endLine
  }
}

function createDescription(rule) {
  const lines =
    rule.fullDescription.text !== undefined
      ? rule.fullDescription.text.split(/\n|\r\n/)
      : ['']

  // remove empty first line
  if (lines.length > 1 && lines[0] === '') {
    lines.splice(0, 1)
  }
  let indentation = ''
  const matchResult = lines[0].match(/^([ \t]+).*$/)
  if (matchResult !== null) {
    indentation = matchResult[1]
  }
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(indentation)) {
      lines[i] = lines[i].substr(indentation.length)
    }
  }
  // remove empty last line
  if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.splice(lines.length - 1, 1)
  }
  const description = lines.join('\n')
  const desc = `${description}

${rule.id} (Priority: ${rule.properties.priority}, Ruleset: ${
    rule.properties.ruleset
  })
${rule.helpUri.trim()}`
  return desc
}

module.exports.processSarifReport = processSarifReport
