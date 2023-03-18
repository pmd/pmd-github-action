const path = require('path');
const semver = require('semver');

const validateVersion = function(version) {
    if (typeof(version) === 'string'
       && (version === 'latest' || semver.valid(version) === version)) {
        // valid
        return version;
    }

    throw 'Invalid version';
}

const validateSourcePath = function(sourcePath) {
    const normalized = path.normalize(sourcePath);
    if (path.isAbsolute(normalized)
        || typeof(normalized) !== 'string'
        || normalized.match(/[ ;:"'$]/)) {
        throw 'Invalid sourcePath';
    }
    return normalized;
}

const validateRulesets = function(rulesets) {
    if (typeof(rulesets) !== 'string' || rulesets.match(/[;:"'$"]/)) throw 'Invalid rulesets';

    const normalized = rulesets.replace(/ /g, '');
    return normalized;
}

const validateDownloadUrl = function(url) {
    if (typeof(url) === 'string' && (url === '' || url.match(/^https?:\/\//)))
        // valid
        return url;

    throw 'Invalid downloadUrl';
}

module.exports.validateVersion = validateVersion;
module.exports.validateSourcePath = validateSourcePath;
module.exports.validateRulesets = validateRulesets;
module.exports.validateDownloadUrl = validateDownloadUrl;
