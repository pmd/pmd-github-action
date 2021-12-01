const core = require('@actions/core');

const processSarifReport = function (report) {
    if (!report) {
        return;
    }

    const rules = report.runs[0].tool.driver.rules;
    const results = report.runs[0].results;

    results.forEach(violation => {
        const logFunction = mapPriority(rules[violation.ruleIndex].properties.priority);
        violation.locations.forEach(location => {
            const annotation = createAnnotation(location.physicalLocation);
            logFunction(violation.message.text, annotation);
        });
    });
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
function createAnnotation(location) {
    return {
        file: location.artifactLocation.uri,
        startLine: location.region.startLine
    };
}

module.exports.processSarifReport = processSarifReport;
