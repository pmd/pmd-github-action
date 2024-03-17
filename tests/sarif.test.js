const path = require('path');
const sarif = require('../lib/sarif');
const io = require('@actions/io');
const os = require('os');
const fs = require('fs');

const tempPath = path.join(__dirname, 'TEMP');

describe('pmd-github-action-sarif', function () {

  beforeEach(async function () {
    await io.rmRF(tempPath);
    await io.mkdirP(tempPath);
  })

  afterEach(function () {
    delete process.env['GITHUB_WORKSPACE'];
  })

  afterAll(async function () {
    await io.rmRF(tempPath);
  })

  it('can count violations', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report.sarif'));
    expect(count).toBe(1);
  })

  it('can count violations multiple', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report-multiple.sarif'));
    expect(count).toBe(1); // still only one violation, but with two locations
  })

  it('can deal with empty report', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report-empty.sarif'));
    expect(count).toBe(0);
  })

  it('can deal with no report', () => {
    const count = sarif.countViolations(path.join(__dirname, 'data', 'pmd-report-not-existing.sarif'));
    expect(count).toBe(0);
  })

  it('can load report', () => {
    const report = sarif.loadReport(path.join(__dirname, 'data', 'pmd-report.sarif'));
    expect(report).not.toBe(null);
    expect(report.runs[0].tool.driver.name).toBe('PMD');
  })

  it('can deal with missing report', () => {
    const report = sarif.loadReport(path.join(__dirname, 'data', 'pmd-report-not-existing.sarif'));
    expect(report).toBe(null);
  })

  test('relativize can deal with missing report', () => {
    const reportPath = path.join(__dirname, 'data', 'pmd-report-not-existing.sarif');
    sarif.relativizeReport(reportPath);
  })

  test('can properly relativize report', async () => {
    const isWindows = os.platform() === 'win32';

    const reportPath = path.join(tempPath, 'pmd-report.sarif');
    await io.cp(path.join(__dirname, 'data', isWindows ? 'pmd-report-win.sarif' : 'pmd-report.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    const fullPath = isWindows ? 'D:\\a\\pmd-github-action-test\\src\\classes\\UnusedLocalVariableSample.cls' : '/home/andreas/PMD/source/pmd-github-action-test/src/classes/UnusedLocalVariableSample.cls';
    expect(reportBefore.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(fullPath);

    process.env['GITHUB_WORKSPACE'] = isWindows ? 'D:\\a\\pmd-github-action-test' : '/home/andreas/PMD/source/pmd-github-action-test';
    sarif.relativizeReport(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    // note: not normalizing the paths to platform dependent paths - it must be a valid URI
    expect(reportAfter.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
      .toBe('src/classes/UnusedLocalVariableSample.cls');
  })

  test('can properly relativize report which contains already uris', async () => {
    const isWindows = os.platform() === 'win32';

    const reportPath = path.join(tempPath, 'pmd-report-uris.sarif');
    await io.cp(path.join(__dirname, 'data', isWindows ? 'pmd-report-win-uris.sarif' : 'pmd-report-uris.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    const fullPath = isWindows ? 'file:///D:/a/pmd-github-action-test/src/classes/UnusedLocalVariableSample.cls' : 'file:///home/andreas/PMD/source/pmd-github-action-test/src/classes/UnusedLocalVariableSample.cls';
    expect(reportBefore.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(fullPath);

    process.env['GITHUB_WORKSPACE'] = isWindows ? 'D:\\a\\pmd-github-action-test' : '/home/andreas/PMD/source/pmd-github-action-test';
    sarif.relativizeReport(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    // note: not normalizing the paths to platform dependent paths - it must be a valid URI
    expect(reportAfter.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
      .toBe('src/classes/UnusedLocalVariableSample.cls');
  })

  test('can properly relativize report - windows paths - issue #51', async () => {
    const reportPath = path.join(tempPath, 'pmd-report.sarif');
    await io.cp(path.join(__dirname, 'data', 'pmd-report-win.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    const fullPath = 'D:\\a\\pmd-github-action-test\\src\\classes\\UnusedLocalVariableSample.cls';
    expect(reportBefore.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(fullPath);

    process.env['GITHUB_WORKSPACE'] = 'D:\\a\\pmd-github-action-test';
    sarif.relativizeReport(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    // note: not normalizing the paths to platform dependent paths - it must be a valid URI
    expect(reportAfter.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
      .toBe('src/classes/UnusedLocalVariableSample.cls');
  })

  test('convert backslash to forward slash for already relativized report - windows paths - issue #177', async () => {
    const reportPath = path.join(tempPath, 'pmd-report.sarif');
    await io.cp(path.join(__dirname, 'data', 'pmd-report-win-relativized.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    const windowsPath = 'src\\classes\\UnusedLocalVariableSample.cls';
    expect(reportBefore.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(windowsPath);

    process.env['GITHUB_WORKSPACE'] = 'D:\\a\\pmd-github-action-test';
    sarif.relativizeReport(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    // note: not normalizing the paths to platform dependent paths - it must be a valid URI with forward slashes
    expect(reportAfter.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri)
      .toBe('src/classes/UnusedLocalVariableSample.cls');
  })

  test('can properly relativize already relativized report', async () => {
    const reportPath = path.join(tempPath, 'pmd-report.sarif');
    await io.cp(path.join(__dirname, 'data', 'pmd-report-relativized.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    expect(reportBefore.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/classes/UnusedLocalVariableSample.cls');

    process.env['GITHUB_WORKSPACE'] = '/home/andreas/PMD/source/pmd-github-action-test';
    sarif.relativizeReport(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    expect(reportAfter.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('src/classes/UnusedLocalVariableSample.cls');
  })

  test('sarif report result fix is skipped when no report', async () => {
    const reportPath = path.join(tempPath, 'pmd-report-not-existing.sarif');
    sarif.fixResults(reportPath);
  })

  test('sarif report results are fixed', async () => {
    const reportPath = path.join(tempPath, 'pmd-report-multiple.sarif');
    await io.cp(path.join(__dirname, 'data', 'pmd-report-multiple.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    expect(reportBefore.runs[0].results.length).toBe(1);
    sarif.fixResults(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    expect(reportAfter.runs[0].results.length).toBe(2);

    const expectedReport = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'pmd-report-multiple-fixed.sarif')));
    expect(reportAfter).toStrictEqual(expectedReport);
  })

  test('sarif report results are not fixed for PMD >= 6.43.0', async () => {
    const reportPath = path.join(tempPath, 'pmd-report-multiple.sarif');
    await io.cp(path.join(__dirname, 'data', 'pmd-report-multiple.sarif'), reportPath);

    const reportBefore = sarif.loadReport(reportPath);
    reportBefore.runs[0].tool.driver.version = '6.43.0';
    fs.writeFileSync(reportPath, JSON.stringify(reportBefore));

    expect(reportBefore.runs[0].results.length).toBe(1);
    sarif.fixResults(reportPath);
    const reportAfter = sarif.loadReport(reportPath);
    expect(reportAfter.runs[0].results.length).toBe(1);

    expect(reportAfter).toStrictEqual(reportBefore);
  })
});
