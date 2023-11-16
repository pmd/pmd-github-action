import * as path from "path"
import * as semver from "semver"

const validateVersion = function (version : string) : string {
  if (
    typeof version === 'string' &&
    (version === 'latest' || semver.valid(version) === version)
  ) {
    // valid
    return version
  }

  throw new Error('Invalid version')
}

const validateSourcePath = function (sourcePath : string) : string {
  const normalized = path.normalize(sourcePath)
  if (
    path.isAbsolute(normalized) ||
    typeof normalized !== 'string' ||
    normalized.match(/[ ;:"'$]/)
  ) {
    throw 'Invalid sourcePath'
  }
  return normalized
}

const validateRulesets = function (rulesets : string) : string {
  if (typeof rulesets !== 'string' || rulesets.match(/[;:"'$"]/))
    throw new Error('Invalid rulesets')

  const normalized = rulesets.replace(/ /g, '')
  return normalized
}

const validateDownloadUrl = function (url : string) : string {
  if (typeof url === 'string' && (url === '' || url.match(/^https?:\/\//)))
    // valid
    return url

  throw new Error('Invalid downloadUrl')
}

export { validateVersion, validateSourcePath, validateRulesets, validateDownloadUrl }
