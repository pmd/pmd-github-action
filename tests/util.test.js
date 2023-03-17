const process = require('process');
const path = require('path');
const nock = require('nock');
const io = require('@actions/io');
const os = require('os');
const fs = require('fs').promises;
const exec = require('@actions/exec');
const util = require('../lib/util');
const github_utils = require('@actions/github/lib/utils')

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

    // disable ACTIONS_STEP_DEBUG
    delete process.env['RUNNER_DEBUG'];

    delete process.env['GITHUB_API_URL'];
    github_utils.defaults.baseUrl = 'https://api.github.com';
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
    await expect(fs.access(toolCache)).resolves.toBe(undefined);
  })

  it('use latest PMD with custom API URL', async () => {
    // simulate that the env variable GITHUB_API_URL has been set to something
    github_utils.defaults.baseUrl = 'https://api.example.com';

    const latestReleaseResponse = (await fs.readFile(__dirname + '/data/releases-latest.json')).toString();
    const fetchMock = require('fetch-mock');
    fetchMock.mock({url: 'https://api.github.com/repos/pmd/pmd/releases/latest'},
      {'body': latestReleaseResponse, status: 200, headers: {'Content-Type': 'application/json'}});

    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.40.0/pmd-bin-6.40.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.40.0.zip')

    const pmdInfo = await util.downloadPmd('latest', 'my_test_token');

    const toolCache = path.join(cachePath, 'pmd', '6.40.0', os.arch(), 'pmd-bin-6.40.0');
    expect(pmdInfo).toStrictEqual({ path: toolCache, version: '6.40.0' });
    await expect(fs.access(toolCache)).resolves.toBe(undefined);
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
    await expect(fs.access(toolCache)).resolves.toBe(undefined);
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
    await expect(fs.access(toolCache)).resolves.toBe(undefined);
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
    await expect(fs.access(reportFile)).resolves.toBe(undefined);
    const report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
    expect(report.runs[0].tool.driver.version).toBe('6.40.0');
    expect(execOutput.exitCode).toBe(0);
    expect(execOutput.stdout.trim()).toBe('Running PMD 6.40.0 with: pmd -no-cache -d . -f sarif -R ruleset.xml -r pmd-report.sarif');
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
    await expect(fs.access(reportFile)).resolves.toBe(undefined);
    const report = JSON.parse(await fs.readFile(reportFile, 'utf8'));
    expect(report.runs[0].tool.driver.version).toBe('6.41.0');
    expect(execOutput.exitCode).toBe(0);
    expect(execOutput.stdout.trim()).toBe('Running PMD 6.41.0 with: pmd --no-cache -d . -f sarif -R ruleset.xml -r pmd-report.sarif');
    await io.rmRF(reportFile);
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

  test('can determine modified files from pull request (with debug)', async () => {
    // enable ACTIONS_STEP_DEBUG
    process.env['RUNNER_DEBUG'] = '1';
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/pull-request-event-data.json';
    nock('https://api.github.com')
      .get('/repos/pmd/pmd-github-action-tests/pulls/1/files?per_page=30&page=1')
      .replyWithFile(200, __dirname + '/data/pull-request-files.json', {
        'Content-Type': 'application/json',
      });
    nock('https://api.github.com')
      .get('/repos/pmd/pmd-github-action-tests/pulls/1/files?per_page=30&page=2')
      .reply(200, []);
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java/NewFile.java', 'src/main/java/ChangedFile.java']
      .map(f => path.normalize(f)));
  })

  test('can determine modified files from pull request (without debug)', async () => {
    // disable ACTIONS_STEP_DEBUG
    delete process.env['RUNNER_DEBUG'];
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/pull-request-event-data.json';
    nock('https://api.github.com')
      .get('/repos/pmd/pmd-github-action-tests/pulls/1/files?per_page=30&page=1')
      .replyWithFile(200, __dirname + '/data/pull-request-files.json', {
        'Content-Type': 'application/json',
      });
    nock('https://api.github.com')
      .get('/repos/pmd/pmd-github-action-tests/pulls/1/files?per_page=30&page=2')
      .reply(200, []);
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java/NewFile.java', 'src/main/java/ChangedFile.java']
      .map(f => path.normalize(f)));
  })

  test('can determine modified files from pull request with max page', async () => {
    // disable ACTIONS_STEP_DEBUG
    delete process.env['RUNNER_DEBUG'];
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/pull-request-event-data.json';
    for (let page = 1; page <= 10; page++) {
      nock('https://api.github.com')
        .get(`/repos/pmd/pmd-github-action-tests/pulls/1/files?per_page=30&page=${page}`)
        .replyWithFile(200, __dirname + '/data/pull-request-files.json', {
          'Content-Type': 'application/json',
        });
    }
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java/NewFile.java', 'src/main/java/ChangedFile.java']
      .map(f => path.normalize(f)));
  })

  test('return undefined for unsupported event', async () => {
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'workflow_dispatch';
    let result = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java'));
    expect(result).toBe(undefined);
  })

  it('can execute PMD with list of files', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/latest')
      .replyWithFile(200, __dirname + '/data/releases-latest.json', {
        'Content-Type': 'application/json',
      })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.40.0/pmd-bin-6.40.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.40.0.zip')

    const pmdInfo = await util.downloadPmd('latest', 'my_test_token');
    const execOutput = await util.executePmd(pmdInfo, ['src/file1.txt', 'src/file2.txt'], 'ruleset.xml', 'sarif', 'pmd-report.sarif');
    const pmdFilelist = path.join('.', 'pmd.filelist');
    await expect(fs.access(pmdFilelist)).resolves.toBe(undefined);
    const pmdFilelistContent = await fs.readFile(pmdFilelist, 'utf8');
    expect(pmdFilelistContent).toBe('src/file1.txt,src/file2.txt');
    expect(execOutput.exitCode).toBe(0);
    expect(execOutput.stdout.trim()).toBe('Running PMD 6.40.0 with: pmd -no-cache -filelist pmd.filelist -f sarif -R ruleset.xml -r pmd-report.sarif');
    await io.rmRF(pmdFilelist);
    await io.rmRF(path.join('.', 'pmd-report.sarif'));
  })

  it('can execute PMD with list of files >= 6.41.0', async () => {
    nock('https://api.github.com')
      .get('/repos/pmd/pmd/releases/tags/pmd_releases%2F6.41.0')
      .replyWithFile(200, __dirname + '/data/releases-6.41.0.json', {
        'Content-Type': 'application/json',
      })
    nock('https://github.com')
      .get('/pmd/pmd/releases/download/pmd_releases/6.41.0/pmd-bin-6.41.0.zip')
      .replyWithFile(200, __dirname + '/data/pmd-bin-6.41.0.zip')

    const pmdInfo = await util.downloadPmd('6.41.0', 'my_test_token');
    const execOutput = await util.executePmd(pmdInfo, ['src/file1.txt', 'src/file2.txt'], 'ruleset.xml', 'sarif', 'pmd-report.sarif');
    const pmdFilelist = path.join('.', 'pmd.filelist');
    await expect(fs.access(pmdFilelist)).resolves.toBe(undefined);
    const pmdFilelistContent = await fs.readFile(pmdFilelist, 'utf8');
    expect(pmdFilelistContent).toBe('src/file1.txt,src/file2.txt');
    expect(execOutput.exitCode).toBe(0);
    expect(execOutput.stdout.trim()).toBe('Running PMD 6.41.0 with: pmd --no-cache --file-list pmd.filelist -f sarif -R ruleset.xml -r pmd-report.sarif');
    await io.rmRF(pmdFilelist);
    await io.rmRF(path.join('.', 'pmd-report.sarif'));
  })

  test('can determine modified files from push event (with debug)', async () => {
    // enable ACTIONS_STEP_DEBUG
    process.env['RUNNER_DEBUG'] = '1';
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/push-event-data.json';
    nock('https://api.github.com')
      .get('/repos/pmd/pmd-github-action-tests/compare/44c1557134c7dbaf46ecdf796fb871c8df8989e4...8a7a25638d8ca5207cc824dea9571325b243c6a1?per_page=30&page=1')
      .replyWithFile(200, __dirname + '/data/compare-files-page1.json', {
        'Content-Type': 'application/json',
      });
    nock('https://api.github.com')
      .get('/repos/pmd/pmd-github-action-tests/compare/44c1557134c7dbaf46ecdf796fb871c8df8989e4...8a7a25638d8ca5207cc824dea9571325b243c6a1?per_page=30&page=2')
      .replyWithFile(200, __dirname + '/data/compare-files-page2.json', {
        'Content-Type': 'application/json',
      });
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java/NewFile.java', 'src/main/java/ChangedFile.java']
      .map(f => path.normalize(f)));
  })

  test('can determine modified files from push event with max page', async () => {
    // disable ACTIONS_STEP_DEBUG
    delete process.env['RUNNER_DEBUG'];
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/push-event-data.json';
    for (let page = 1; page <= 10; page++) {
      nock('https://api.github.com')
        .get(`/repos/pmd/pmd-github-action-tests/compare/44c1557134c7dbaf46ecdf796fb871c8df8989e4...8a7a25638d8ca5207cc824dea9571325b243c6a1?per_page=30&page=${page}`)
        .replyWithFile(200, __dirname + '/data/compare-files-page1.json', {
          'Content-Type': 'application/json',
        });
    }
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java/NewFile.java', 'src/main/java/ChangedFile.java']
      .map(f => path.normalize(f)));
  })

  test('sourcePath is applied correctly for analyzeModifiedFiles - issue #52', async () => {
    // disable ACTIONS_STEP_DEBUG
    delete process.env['RUNNER_DEBUG'];
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/push-event-data.json';
    for (let page = 1; page <= 10; page++) {
      nock('https://api.github.com')
        .get(`/repos/pmd/pmd-github-action-tests/compare/44c1557134c7dbaf46ecdf796fb871c8df8989e4...8a7a25638d8ca5207cc824dea9571325b243c6a1?per_page=30&page=${page}`)
        .replyWithFile(200, __dirname + '/data/compare-files-page1-issue52.json', {
          'Content-Type': 'application/json',
        });
    }
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java/ChangedFile.java']
      .map(f => path.normalize(f)));
  })

  test('sourcePath with trailing slash is applied correctly for analyzeModifiedFiles - issue #52', async () => {
    // disable ACTIONS_STEP_DEBUG
    delete process.env['RUNNER_DEBUG'];
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/push-event-data.json';
    for (let page = 1; page <= 10; page++) {
      nock('https://api.github.com')
        .get(`/repos/pmd/pmd-github-action-tests/compare/44c1557134c7dbaf46ecdf796fb871c8df8989e4...8a7a25638d8ca5207cc824dea9571325b243c6a1?per_page=30&page=${page}`)
        .replyWithFile(200, __dirname + '/data/compare-files-page1-issue52.json', {
          'Content-Type': 'application/json',
        });
    }
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('src/main/java/'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java/ChangedFile.java']
      .map(f => path.normalize(f)));
  })

  test('sourcePath with current dir is applied correctly for analyzeModifiedFiles - issue #52', async () => {
    // disable ACTIONS_STEP_DEBUG
    delete process.env['RUNNER_DEBUG'];
    process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests'
    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/push-event-data.json';
    for (let page = 1; page <= 10; page++) {
      nock('https://api.github.com')
        .get(`/repos/pmd/pmd-github-action-tests/compare/44c1557134c7dbaf46ecdf796fb871c8df8989e4...8a7a25638d8ca5207cc824dea9571325b243c6a1?per_page=30&page=${page}`)
        .replyWithFile(200, __dirname + '/data/compare-files-page1-issue52.json', {
          'Content-Type': 'application/json',
        });
    }
    let fileList = await util.determineModifiedFiles('my_test_token', path.normalize('.'));
    expect(fileList).toStrictEqual(['src/main/java/AvoidCatchingThrowableSample.java', 'src/main/java2/NewFile.java', 'src/main/java/ChangedFile.java', 'README.md']
      .map(f => path.normalize(f)));
  })
});

function setGlobal(key, value) {
  if (value === undefined) {
    delete global[key];
  } else {
    global[key] = value;
  }
}
