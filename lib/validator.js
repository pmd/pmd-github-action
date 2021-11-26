const path = require('path');

const validateVersion = function(version) {
    if (typeof(version) === 'string'
       && (version === 'latest' || version.match(/^\d+\.\d+\.\d+$/))) {
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

module.exports.validateVersion = validateVersion;
module.exports.validateSourcePath = validateSourcePath;
module.exports.validateRulesets = validateRulesets;

