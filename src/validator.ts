import * as path from 'path'
import * as semver from 'semver'

function validateVersion(version: string): string {
  if (
    typeof version === 'string' &&
    (version === 'latest' || semver.valid(version) === version)
  ) {
    // valid
    return version
  }

  throw new Error('Invalid version')
}

function validateSourcePath(sourcePath: string): string {
  const normalized = path.normalize(sourcePath)
  if (
    path.isAbsolute(normalized) ||
    typeof normalized !== 'string' ||
    normalized.match(/[ ;:"'$]/)
  ) {
    throw new Error('Invalid sourcePath')
  }
  return normalized
}

function validateRulesets(rulesets: string): string {
  if (typeof rulesets !== 'string' || rulesets.match(/[;:"'$"]/))
    throw new Error('Invalid rulesets')

  const normalized = rulesets.replace(/ /g, '')
  return normalized
}

function validateDownloadUrl(url: string): string {
  if (typeof url === 'string' && (url === '' || url.match(/^https?:\/\//)))
    // valid
    return url

  throw new Error('Invalid downloadUrl')
}

function validateMinimumPriority(priority: string): string {
  const priorities = ['1', '2', '3', '4', '5']
  if (typeof priority === 'string' && priorities.includes(priority)) {
    // valid
    return priority
  }
  throw new Error('Invalid minimum priority')
}

export {
  validateVersion,
  validateSourcePath,
  validateRulesets,
  validateDownloadUrl,
  validateMinimumPriority
}
