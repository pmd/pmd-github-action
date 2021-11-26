const path = require('path');
const sarif = require('../lib/sarif');

describe('pmd-github-action-sarif', function() {

  it('can count violations', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report.sarif'));
    expect(count).toBe(1);
  })

  it('can deal with empty report', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report-empty.sarif'));
    expect(count).toBe(0);
  })

  it('can deal with no report', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report-not-existing.sarif'));
    expect(count).toBe(0);
  })

});
