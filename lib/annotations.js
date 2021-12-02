const core = require('@actions/core');

const processSarifReport = function (report) {
    if (!report) {
        return;
    }

    const basedir = process.cwd();
    const rules = report.runs[0].tool.driver.rules;
    const results = report.runs[0].results;

    core.startGroup('PMD Results');

    core.debug(`processing sarif report. basedir=${basedir}`);
    core.debug(`rules: ${rules.length}`);
    core.debug(`results: ${results.length}`);


    results.forEach(violation => {
        const rule = rules[violation.ruleIndex];
        const logFunction = mapPriority(rule.properties.priority);
        violation.locations.forEach(location => {
            const annotation = createAnnotation(location.physicalLocation, basedir, violation.message.text);
            core.info(`${annotation.file}:${annotation.startLine}:${rule.id} (Priority: ${rule.properties.priority}):${violation.message.text}`);
            logFunction(createDescription(rule), annotation);
        });
    });

    core.endGroup();
}

function mapPriority(pmdPriority) {
    switch (pmdPriority) {
        case 1: // net.sourceforge.pmd.RulePriority.HIGH
        case 2: // net.sourceforge.pmd.RulePriority.MEDIUM_HIGH
            return core.error;
        case 3: // net.sourceforge.pmd.RulePriority.MEDIUM
        case 4: // net.sourceforge.pmd.RulePriority.MEDIUM_LOW
            return core.warning;
        default: // net.sourceforge.pmd.RulePriority.LOW (5)
            return core.notice;
    }
}

// AnnotationProperties from @actions/core
function createAnnotation(location, basedir, title) {
    return {
        title: title,
        file: makeRelative(location.artifactLocation.uri, basedir),
        startLine: location.region.startLine
    };
}

function makeRelative(fullPath, basedir) {
    if (fullPath.startsWith(`${basedir}/`)) {
        return fullPath.substr(basedir.length + 1);
    }
    return fullPath;
}

function createDescription(rule) {
const desc =
`${rule.fullDescription.text.trim()}

${rule.helpUri.trim()}`;
return desc;
}

module.exports.processSarifReport = processSarifReport;
