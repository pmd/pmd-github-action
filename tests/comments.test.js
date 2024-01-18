const core = require('@actions/core');
const path = require('path');
const sarif = require('../lib/sarif');
const nock = require('nock');
const comments = require('../lib/comments');

core.error = jest.fn();
core.warning = jest.fn();
core.notice = jest.fn();
process.cwd = jest.fn();

describe('pmd-github-action-comments', function () {
    beforeEach(() => {
        core.error.mockClear();
        core.warning.mockClear();
        core.notice.mockClear();
        process.cwd.mockClear();
        process.cwd.mockReturnValue('/folder');
    });

    it('can create comments', async () => {
        process.env['RUNNER_DEBUG'] = '1';
        process.env['GITHUB_REPOSITORY'] = 'pmd/pmd-github-action-tests';
        process.env['GITHUB_EVENT_NAME'] = 'pull_request';
        process.env['GITHUB_EVENT_PATH'] = __dirname + '/data/pull-request-event-data.json';
        nock('https://api.github.com').post('/repos/pmd/pmd-github-action-tests/issues/1/comments').reply(201, {
            id: 1,
        });
        const report = sarif.loadReport(path.join(__dirname, 'data', 'pmd-report.sarif'));

        await comments.createComments(report, 'test_token');

        expect(core.error).not.toHaveBeenCalled();
        expect(core.warning).not.toHaveBeenCalled();
    });

    it('can handle null report', async () => {
        await comments.createComments(null, null);
        expect(core.notice).not.toHaveBeenCalled();
    });
});
