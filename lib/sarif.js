const fs = require('fs');

const countViolations = function(reportFile) {
    if (!fs.existsSync(reportFile)) {
        return 0;
    }

    const report = JSON.parse(fs.readFileSync(reportFile));
    const results = report.runs[0].results;
    let count = 0;
    results.forEach(rule => {
        count += rule.locations.length;
    });
    return count;
}

module.exports.countViolations = countViolations;
