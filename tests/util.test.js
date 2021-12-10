const process = require('process');
const path = require('path');
const nock = require('nock');
const io = require('@actions/io');
const os = require('os');
const fs = require('fs');
const exec = require('@actions/exec');
const util = require('../lib/util');

const cachePath = path.join(__dirname, 'CACHE')
const tempPath = path.join(__dirname, 'TEMP')
// Set temp and tool directories before importing (used to set global state)
process.env['RUNNER_TEMP'] = tempPath
process.env['RUNNER_TOOL_CACHE'] = cachePath

describe('pmd-github-action-util', function () {
  let platformMock;
  let execMock;

  beforeAll(function() {
    setGlobal('TEST_DOWNLOAD_TOOL_RETRY_MIN_SECONDS', 0)
    setGlobal('TEST_DOWNLOAD_TOOL_RETRY_MAX_SECONDS', 0)
  })

  beforeEach(async function () {
    platformMock = jest.spyOn(os, 'platform');
    execMock = jest.spyOn(exec, 'getExecOutput');
    await io.rmRF(cachePath)
    await io.rmRF(tempPath)
    await io.mkdirP(cachePath)
    await io.mkdirP(tempPath)
  })

  afterEach(function () {
    platformMock.mockRestore();
    execMock.mockRestore();
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

    const pmdInfo = await util.downloadPmd('latest', 'my_test_token');

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
    const pmdInfo = await util.downloadPmd('6.39.0', 'my_test_token');

    const toolCache = path.join(cachePath, 'pmd', '6.39.0', os.arch(), 'pmd-bin-6.39.0');
    expect(pmdInfo).toStrictEqual({ path: toolCache, version: '6.39.0' });
    expect(fs.existsSync(toolCache)).toBeTruthy();
  })

  it('use cached PMD version', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/tags/pmd_releases%2F6.39.0')
        .once()
        .replyWithFile(200, __dirname + '/data/releases-6.39.0.json', {
          'Content-Type': 'application/json',
        })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.39.0/pmd-bin-6.39.0.zip')
      .once()
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.39.0.zip');
    const pmdInfo = await util.downloadPmd('6.39.0', 'my_test_token');
    const pmdInfo2 = await util.downloadPmd('6.39.0', 'my_test_token');

    const toolCache = path.join(cachePath, 'pmd', '6.39.0', os.arch(), 'pmd-bin-6.39.0');
    expect(pmdInfo).toStrictEqual({ path: toolCache, version: '6.39.0' });
    expect(pmdInfo2).toStrictEqual({ path: pmdInfo.path, version: '6.39.0' });
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

    const pmdInfo = await util.downloadPmd('latest', 'my_test_token');
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

    const pmdInfo = await util.downloadPmd('6.41.0', 'my_test_token');
    const execOutput = await util.executePmd(pmdInfo, '.', 'ruleset.xml', 'sarif', 'pmd-report.sarif');
    const reportFile = path.join('.', 'pmd-report.sarif');
    expect(fs.existsSync(reportFile)).toBeTruthy();
    const report = JSON.parse(fs.readFileSync(reportFile));
    expect(report.runs[0].tool.driver.version).toBe('6.41.0');
    expect(execOutput.exitCode).toBe(0);
    expect(execOutput.stdout).toBe('Running PMD 6.41.0 with: pmd --no-cache -d . -f sarif -R ruleset.xml -r pmd-report.sarif\n');
    await io.rmRF(reportFile)
  })

  it('failure while downloading PMD', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/latest')
        .reply(503, 'Test Internal Server Error');

    expect(() => util.downloadPmd('latest', 'my_test_token')).rejects.toThrow();
  })

  it('failure while executing PMD', async () => {
    expect(() => util.executePmd({ path: 'non-existing-pmd-path' }, '.', 'ruleset.xml', 'sarif', 'pmd-report.sarif')).rejects.toThrow();
  })

  it('can execute PMD win32', async () => {
    platformMock.mockReturnValueOnce('win32');
    execMock.mockReturnValueOnce({ exitCode: 0, stdout: '', stderr: '' });
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/latest')
        .replyWithFile(200, __dirname + '/data/releases-latest.json', {
          'Content-Type': 'application/json',
        })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.40.0/pmd-bin-6.40.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.40.0.zip')

    const pmdInfo = await util.downloadPmd('latest', 'my_test_token');
    await util.executePmd(pmdInfo, '.', 'ruleset.xml', 'sarif', 'pmd-report.sarif');

    expect(execMock).toBeCalledWith(`${pmdInfo.path}\\bin\\pmd.bat`, [
          '-no-cache',
          '-d', '.',
          '-f', 'sarif',
          '-R', 'ruleset.xml',
          '-r', 'pmd-report.sarif',
      ],
      {
          ignoreReturnCode: true
      });
  })
});

function setGlobal(key, value) {
  if (value === undefined) {
    delete global[key];
  } else {
    global[key] = value;
  }
}
