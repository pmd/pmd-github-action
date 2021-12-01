const core = require('@actions/core');
const path = require('path');
const sarif = require('../lib/sarif');
const annotations = require('../lib/annotations');

core.error = jest.fn();
core.warning = jest.fn();
core.notice = jest.fn();
process.cwd = jest.fn();

describe('pmd-github-action-annotations', function () {

    beforeEach(() => {
        core.error.mockClear();
        core.warning.mockClear();
        core.notice.mockClear();
        process.cwd.mockClear();
        process.cwd.mockReturnValue('/folder');
    });

    it('can create annotation', () => {
        const report = sarif.loadReport(path.join(__dirname, 'data', 'pmd-report.sarif'));

        annotations.processSarifReport(report);

        expect(core.notice).toHaveBeenCalledTimes(1);
        expect(core.notice).toHaveBeenCalledWith('Variable \'x\' defined but not used', {
            file: '/home/andreas/PMD/source/pmd-github-action-test/src/classes/UnusedLocalVariableSample.cls',
            startLine: 3
        });
        expect(core.error).not.toHaveBeenCalled();
        expect(core.warning).not.toHaveBeenCalled();
    });

    it('can deal with null report', () => {
        annotations.processSarifReport(null);
        expect(core.notice).not.toHaveBeenCalled();
    });

    it('can deal with error, warning and notice', () => {
        const report = sarif.loadReport(path.join(__dirname, 'data', 'pmd-report-priorities.sarif'));
        annotations.processSarifReport(report);

        expect(core.error).toHaveBeenCalledTimes(2);
        expect(core.error).toHaveBeenNthCalledWith(1, 'High Prio Rule', { file: 'file1.txt', startLine: 4 });
        expect(core.error).toHaveBeenNthCalledWith(2, 'Medium High Prio Rule', { file: 'dir/file2.txt', startLine: 5 });
        expect(core.warning).toHaveBeenCalledTimes(2);
        expect(core.warning).toHaveBeenNthCalledWith(1, 'Medium Prio Rule', { file: 'file3.txt', startLine: 6 });
        expect(core.warning).toHaveBeenNthCalledWith(2, 'Medium Low Prio Rule', { file: 'file4.txt', startLine: 7 });
        expect(core.notice).toHaveBeenCalledTimes(2);
        expect(core.notice).toHaveBeenNthCalledWith(1, 'Low Prio Rule', { file: 'file5.txt', startLine: 8 });
        expect(core.notice).toHaveBeenNthCalledWith(2, 'Low Prio Rule', { file: 'file6.txt', startLine: 9 });
    });
});
