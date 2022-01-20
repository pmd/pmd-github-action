const fs = require('fs');
const path = require('path');
const core = require('@actions/core');

const countViolations = function (reportFile) {
    let count = 0;

    const report = loadReport(reportFile);
    if (report !== null) {
        const results = report.runs[0].results;
        results.forEach(rule => {
            count += rule.locations.length;
        });
    }

    return count;
}

const loadReport = function (reportFile) {
    if (!fs.existsSync(reportFile)) {
        return null;
    }

    return JSON.parse(fs.readFileSync(reportFile));
}

const relativizeReport = function (reportFile) {
    const report = loadReport(reportFile);
    if (report === null) {
        return;
    }

    const prefix = path.normalize(`${process.env['GITHUB_WORKSPACE']}/`);
    core.debug(`Relativizing sarif ${reportFile} report against ${prefix}`);
    report.runs[0].results.forEach(rule => {
        rule.locations.forEach(location => {
            const artifactLocation = location.physicalLocation.artifactLocation;
            const uri = artifactLocation.uri;
            if (uri.startsWith(prefix)) {
                artifactLocation.uri = uri.substr(prefix.length);
            }
        })
    });
    fs.writeFileSync(reportFile, JSON.stringify(report));
}

module.exports.countViolations = countViolations;
module.exports.loadReport = loadReport;
module.exports.relativizeReport = relativizeReport;
