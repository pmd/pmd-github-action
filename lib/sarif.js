const fs = require('fs');

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

module.exports.countViolations = countViolations;
module.exports.loadReport = loadReport;
