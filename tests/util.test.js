const process = require('process');
const path = require('path');
const nock = require('nock');
const io = require('@actions/io');
const os = require('os');
const fs = require('fs');
const util = require('../lib/util');

const cachePath = path.join(__dirname, 'CACHE')
const tempPath = path.join(__dirname, 'TEMP')
// Set temp and tool directories before importing (used to set global state)
process.env['RUNNER_TEMP'] = tempPath
process.env['RUNNER_TOOL_CACHE'] = cachePath

describe('pmd-github-action-util', function () {
  beforeAll(function () {
    setGlobal('TEST_DOWNLOAD_TOOL_RETRY_MIN_SECONDS', 0)
    setGlobal('TEST_DOWNLOAD_TOOL_RETRY_MAX_SECONDS', 0)
  })

  beforeEach(async function () {
    await io.rmRF(cachePath)
    await io.rmRF(tempPath)
    await io.mkdirP(cachePath)
    await io.mkdirP(tempPath)
  })

  afterEach(function () {
  })

  afterAll(async function () {
    await io.rmRF(tempPath)
    await io.rmRF(cachePath)
    setGlobal('TEST_DOWNLOAD_TOOL_RETRY_MIN_SECONDS', undefined)
    setGlobal('TEST_DOWNLOAD_TOOL_RETRY_MAX_SECONDS', undefined)
  })

  it('use latest PMD', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/latest')
      .replyWithFile(200, __dirname + '/data/releases-latest.json', {
        'Content-Type': 'application/json',
      })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.40.0/pmd-bin-6.40.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.40.0.zip')

    const pmdInfo = await util.downloadPmd('latest');

    const toolCache = path.join(cachePath, 'pmd', '6.40.0', os.arch(), 'pmd-bin-6.40.0');
    expect(pmdInfo).toStrictEqual({ path: toolCache, version: '6.40.0' });
    expect(fs.existsSync(toolCache)).toBeTruthy();
  })

  it('use specific PMD version', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/tags/pmd_releases%2F6.39.0')
      .replyWithFile(200, __dirname + '/data/releases-6.39.0.json', {
        'Content-Type': 'application/json',
      })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.39.0/pmd-bin-6.39.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.39.0.zip');
    const pmdInfo = await util.downloadPmd('6.39.0');

    const toolCache = path.join(cachePath, 'pmd', '6.39.0', os.arch(), 'pmd-bin-6.39.0');
    expect(pmdInfo).toStrictEqual({ path: toolCache, version: '6.39.0' });
    expect(fs.existsSync(toolCache)).toBeTruthy();
  })

  it('can execute PMD', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/latest')
      .replyWithFile(200, __dirname + '/data/releases-latest.json', {
        'Content-Type': 'application/json',
      })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.40.0/pmd-bin-6.40.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.40.0.zip')

    const pmdInfo = await util.downloadPmd('latest');
    const execOutput = await util.executePmd(pmdInfo, '.', 'ruleset.xml', 'sarif', 'pmd-report.sarif');
    const reportFile = path.join('.', 'pmd-report.sarif');
    expect(fs.existsSync(reportFile)).toBeTruthy();
    const report = JSON.parse(fs.readFileSync(reportFile));
    expect(report.runs[0].tool.driver.version).toBe('6.40.0');
    expect(execOutput.exitCode).toBe(0);
    expect(execOutput.stdout).toBe('Running PMD 6.40.0 with: pmd -no-cache -d . -f sarif -R ruleset.xml -r pmd-report.sarif\n');
    await io.rmRF(reportFile)
  })

  it('can execute PMD >= 6.41.0', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/tags/pmd_releases%2F6.41.0')
      .replyWithFile(200, __dirname + '/data/releases-6.41.0.json', {
        'Content-Type': 'application/json',
      })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.41.0/pmd-bin-6.41.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.41.0.zip')

    const pmdInfo = await util.downloadPmd('6.41.0');
    const execOutput = await util.executePmd(pmdInfo, '.', 'ruleset.xml', 'sarif', 'pmd-report.sarif');
    const reportFile = path.join('.', 'pmd-report.sarif');
    expect(fs.existsSync(reportFile)).toBeTruthy();
    const report = JSON.parse(fs.readFileSync(reportFile));
    expect(report.runs[0].tool.driver.version).toBe('6.41.0');
    expect(execOutput.exitCode).toBe(0);
    expect(execOutput.stdout).toBe('Running PMD 6.41.0 with: pmd --no-cache -d . -f sarif -R ruleset.xml -r pmd-report.sarif\n');
    await io.rmRF(reportFile)
  })
});

function setGlobal(key, value) {
  if (value === undefined) {
    delete global[key];
  } else {
    global[key] = value;
  }
}
