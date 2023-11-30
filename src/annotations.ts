import { AnnotationProperties } from '@actions/core'
import type { Log, PhysicalLocation, ReportingDescriptor } from 'sarif'
import * as core from '@actions/core'

function processSarifReport(report: Log): void {
  const rules = report.runs[0].tool.driver.rules ?? []
  const results = report.runs[0].results ?? []

  core.startGroup('PMD Results')

  core.debug(`processing sarif report`)
  core.debug(`rules: ${rules.length}`)
  core.debug(`results: ${results.length}`)

  for (const violation of results) {
    if (violation.ruleIndex === undefined || !rules[violation.ruleIndex]) {
      return
    }

    const rule = rules[violation.ruleIndex]
    const logFunction = mapPriority(rule.properties?.priority)
    const locations = violation.locations ?? []
    for (const location of locations) {
      const annotation = createAnnotation(
        location.physicalLocation,
        violation.message.text
      )
      core.info(
        `\n${annotation.file}:${annotation.startLine}:${rule.id} (Priority: ${rule.properties?.priority}):${violation.message.text}`
      )
      logFunction(createDescription(rule), annotation)
    }
  }

  core.endGroup()
}

function mapPriority(pmdPriority: number | undefined): typeof core.error {
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
function createAnnotation(
  location: PhysicalLocation | undefined,
  title: string | undefined
): AnnotationProperties {
  return {
    title: title || 'unknown',
    file: location?.artifactLocation?.uri
      ? location.artifactLocation.uri
      : 'unknown',
    startLine: location?.region?.startLine ? location.region.startLine : 0,
    endLine: location?.region?.endLine ? location.region.endLine : undefined
  }
}

function createDescription(rule: ReportingDescriptor): string {
  const lines =
    rule.fullDescription?.text !== undefined
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

${rule.id} (Priority: ${rule.properties?.priority}, Ruleset: ${rule.properties
    ?.ruleset})
${rule.helpUri?.trim()}`
  return desc
}

export { processSarifReport }
