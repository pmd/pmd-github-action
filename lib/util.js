const core = require('@actions/core');
const github = require('@actions/github');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const semver = require('semver');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

const downloadPmd = async function(version, token) {
    let pmdVersion = version;
    let cachedPmdPath = tc.find('pmd', version);
    core.debug(`cached path result: ${cachedPmdPath}`);
    if (cachedPmdPath === '') {
        const pmdRelease = await determinePmdRelease(version, token);
        pmdVersion = getPmdVersionFromRelease(pmdRelease);
        const pathToZipDistribution = await tc.downloadTool(await getDownloadURL(pmdRelease));
        const pmdExtractedFolder = await tc.extractZip(pathToZipDistribution);
        cachedPmdPath = await tc.cacheDir(pmdExtractedFolder, 'pmd', pmdVersion);
    }

    core.info(`Using PMD ${pmdVersion} from cached path ${cachedPmdPath}`);
    return {
        version: pmdVersion,
        path: `${cachedPmdPath}/pmd-bin-${pmdVersion}`
    }
}

const executePmd = async function(pmdInfo, fileListOrSourcePath, ruleset, reportFormat, reportFile) {
    let pmdExecutable = '/bin/run.sh pmd';
    if (os.platform() === 'win32') {
        pmdExecutable = '\\bin\\pmd.bat';
    }

    let sourceParameter = ['-d', fileListOrSourcePath];
    if (Array.isArray(fileListOrSourcePath)) {
        await writeFileList(fileListOrSourcePath);
        sourceParameter = [useNewArgsFormat(pmdInfo.version) ? '--file-list' : '-filelist', 'pmd.filelist'];
    }

    const execOutput = await exec.getExecOutput(`${pmdInfo.path}${pmdExecutable}`,
        [
            useNewArgsFormat(pmdInfo.version) ? '--no-cache' : '-no-cache',
            ...sourceParameter,
            '-f', reportFormat,
            '-R', ruleset,
            '-r', reportFile,
        ],
        {
            ignoreReturnCode: true
        });
    core.debug(`stdout: ${execOutput.stdout}`);
    core.debug(`stderr: ${execOutput.stderr}`);
    core.debug(`exitCode: ${execOutput.exitCode}`);
    return execOutput;
}

function useNewArgsFormat(pmdVersion) {
    return semver.gte(pmdVersion, '6.41.0');
}

async function determinePmdRelease(pmdVersion, token) {
    core.debug(`determine release info for ${pmdVersion}`);
    const octokit = github.getOctokit(token);
    let release;
    if (pmdVersion === 'latest') {
        release = await octokit.rest.repos.getLatestRelease({
        owner: 'pmd',
        repo: 'pmd',
        });
    } else {
        release = await octokit.rest.repos.getReleaseByTag({
        owner: 'pmd',
        repo: 'pmd',
        tag: `pmd_releases/${pmdVersion}`,
        });
    }
    core.debug(`found release: ${release.data.name}`);
    return release;
}

function getPmdVersionFromRelease(release) {
    return release.data.tag_name.replace('pmd_releases/', '');
}

async function getDownloadURL(release) {
    const asset = release.data.assets.filter(a => a.name === `pmd-bin-${getPmdVersionFromRelease(release)}.zip`)[0];
    core.debug(`url: ${asset.browser_download_url}`);
    return asset.browser_download_url;
}

async function writeFileList(fileList) {
    await fs.writeFile(path.join('.', 'pmd.filelist'), fileList.join(','), 'utf8');
}

const determineModifiedFiles = async function(token, sourcePath) {
    // creating new context instead of using "github.context" to reinitialize for unit testing
    const context = new github.context.constructor();
    const eventData = context.payload;
    const octokit = github.getOctokit(token);
    if (context.eventName === 'pull_request') {
        core.debug(`Pull request ${eventData.number}: ${eventData.pull_request.html_url}`);

        let modifiedFilenames = [];

        // maximum of 300 files are loaded (page size is 30, max 10 pages)
        for(let page = 1; page < 10; page++) {
            const allFiles = await octokit.rest.pulls.listFiles({
                ...context.repo,
                pull_number: eventData.number,
                per_page: 30,
                page: page
            });
            if (allFiles.data.length == 0) {
                break;
            }
            const filenames = allFiles.data
                .filter(f => f.status === 'added' || f.status === 'changed' || f.status === 'modified')
                .map(f => f.filename)
                .filter(f => sourcePath === '.' || f.startsWith(sourcePath));
            modifiedFilenames.push(...filenames);
        }

        return modifiedFilenames;
    } else {
        throw new Error(`Unsupported github action event '${context.eventName}'`);
    }
}

module.exports.downloadPmd = downloadPmd;
module.exports.executePmd = executePmd;
module.exports.determineModifiedFiles = determineModifiedFiles;
