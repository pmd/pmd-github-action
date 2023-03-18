const core = require('@actions/core');
const github = require('@actions/github');
const github_defaults = require('@actions/github/lib/utils').defaults;
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const semver = require('semver');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Load at most MAX_PAGE pages when determining modified files.
// This is used both for pull/{pull_number}/files as well as for
// repos/compareCommits API calls.
const MAX_PAGE = 10;

async function downloadPmdRelease(version, token) {
    let pmdVersion = version;
    let cachedPmdPath = tc.find('pmd', version);
    core.debug(`cached path result: ${cachedPmdPath}`);
    if (cachedPmdPath === '') {
        const pmdRelease = await determinePmdRelease(version, token);
        pmdVersion = getPmdVersionFromRelease(pmdRelease);
        const pathToZipDistribution = await tc.downloadTool(getDownloadURL(pmdRelease));
        const pmdExtractedFolder = await tc.extractZip(pathToZipDistribution);
        cachedPmdPath = await tc.cacheDir(pmdExtractedFolder, 'pmd', pmdVersion);
    }

    core.info(`Using PMD ${pmdVersion} from cached path ${cachedPmdPath}`);
    return {
        version: pmdVersion,
        path: path.join(cachedPmdPath, `pmd-bin-${pmdVersion}`)
    }
}

async function downloadPmdUrl(version, downloadUrl) {
    let pmdVersion = version;
    const pathToZipDistribution = await tc.downloadTool(downloadUrl);
    const pmdExtractedFolder = await tc.extractZip(pathToZipDistribution);
    core.info(`Downloaded PMD ${pmdVersion} from ${downloadUrl} to ${pmdExtractedFolder}`);
    const files = await fs.readdir(pmdExtractedFolder);
    core.debug(`ZIP archive content: ${files}`);
    let subpath = files[0];
    core.debug(`Using the first entry as basepath for PMD: ${subpath}`)
    return {
        version: pmdVersion,
        path: path.join(pmdExtractedFolder, subpath)
    }
}

const downloadPmd = async function(version, token, downloadUrl) {
    if (version === 'latest' && downloadUrl !== undefined && downloadUrl !== '')
        throw `Can't combine version=${version} with custom downloadUrl=${downloadUrl}`

    if (downloadUrl === undefined || downloadUrl === '') {
        return downloadPmdRelease(version, token);
    } else {
        return downloadPmdUrl(version, downloadUrl);
    }
}

const executePmd = async function(pmdInfo, fileListOrSourcePath, ruleset, reportFormat, reportFile) {
    let pmdExecutable = '/bin/run.sh pmd';
    if (isPmd7Cli(pmdInfo.version)) {
        pmdExecutable = '/bin/pmd';
    }
    if (os.platform() === 'win32') {
        pmdExecutable = '\\bin\\pmd.bat';
    }

    if (isPmd7Cli(pmdInfo.version)) {
        pmdExecutable += ' check';
    }

    let sourceParameter = ['-d', fileListOrSourcePath];
    if (Array.isArray(fileListOrSourcePath)) {
        await writeFileList(fileListOrSourcePath);
        sourceParameter = [useNewArgsFormat(pmdInfo.version) ? '--file-list' : '-filelist', 'pmd.filelist'];
        core.info(`Running PMD ${pmdInfo.version} on ${fileListOrSourcePath.length} modified files...`);
    } else {
        core.info(`Running PMD ${pmdInfo.version} on all files in path ${fileListOrSourcePath}...`);
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

function isPmd7Cli(pmdVersion) {
    return semver.major(pmdVersion) >= 7;
}

async function determinePmdRelease(pmdVersion, token) {
    core.debug(`determine release info for ${pmdVersion}`);


    const PUBLIC_GITHUB_API_URL = 'https://api.github.com';
    let octokit;
    if (github_defaults.baseUrl === PUBLIC_GITHUB_API_URL) {
        // only use authenticated token, if on public github and not on a custom GHES instance
        octokit = github.getOctokit(token);
        core.debug(`Using token to access repos/pmd/pmd/releases/latest on ${github_defaults.baseUrl}`);
    } else {
        // explicitly overwrite base url to be public github api, as pmd/pmd is only available there
        // not using the token, as that would only be valid for GHES
        octokit = new Octokit({ baseUrl: PUBLIC_GITHUB_API_URL });
        core.debug(`Not using token to access repos/pmd/pmd/releases/latest on ${PUBLIC_GITHUB_API_URL}, as token is for ${github_defaults.baseUrl}`);
    }

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

function getDownloadURL(release) {
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

        let modifiedFilenames = new Set();

        // maximum of 300 files are loaded (page size is 30, max 10 pages)
        let page;
        for(page = 1; page <= MAX_PAGE; page++) {
            const listFilesResponse = await octokit.rest.pulls.listFiles({
                ...context.repo,
                pull_number: eventData.number,
                per_page: 30,
                page: page
            });
            const allFiles = listFilesResponse.data;
            if (allFiles.length == 0) {
                break;
            }
            const filenames = extractFilenames(allFiles, page, sourcePath);
            filenames.forEach(f => modifiedFilenames.add(f));
        }
        if (page >= MAX_PAGE) {
            core.warning(`The pull request ${eventData.number} is too big - not all changed files will be analyzed!`);
        }

        return [...modifiedFilenames];
    } else if (context.eventName === 'push') {
        core.debug(`Push on ${eventData.ref}: ${eventData.before}...${eventData.after}`);

        let modifiedFilenames = new Set();

        // maximum of 300 files are loaded (page size is 30, max 10 pages)
        let page;
        for(page = 1; page <= MAX_PAGE; page++) {
            const compareResponse = await octokit.rest.repos.compareCommitsWithBasehead({
                ...context.repo,
                basehead: `${eventData.before}...${eventData.after}`,
                per_page: 30,
                page: page
            });
            const allFiles = compareResponse.data.files;
            if (allFiles === undefined || allFiles.length == 0) {
                break;
            }
            const filenames = extractFilenames(allFiles, page, sourcePath);
            filenames.forEach(f => modifiedFilenames.add(f));
        }
        if (page >= MAX_PAGE) {
            core.warning(`The push on ${eventData.ref} is too big - not all changed files will be analyzed!`);
        }

        return [...modifiedFilenames];
    } else {
        core.warning(`Unsupported github action event '${context.eventName}' - cannot determine modified files. All files will be analyzed.`);
        return undefined;
    }
}

function extractFilenames(allFiles, page, sourcePath) {
    core.debug(` got ${allFiles.length} entries from page ${page} to check...`);
    if (core.isDebug()) {
        // output can be enabled by adding repository secret "ACTIONS_STEP_DEBUG" with value "true".
        for (let i = 0; i < allFiles.length; i++) {
            core.debug(`   ${i}: ${allFiles[i].status} ${allFiles[i].filename}`);
        }
    }
    // add trailing slash
    sourcePath = sourcePath !== '.' ? path.normalize(`${sourcePath}/`) : sourcePath;
    const filenames = allFiles
        .filter(f => f.status === 'added' || f.status === 'changed' || f.status === 'modified')
        .map(f => path.normalize(f.filename))
        .filter(f => sourcePath === '.' || f.startsWith(sourcePath));
    if (core.isDebug()) {
        core.debug(`   after filtering by status and with '${sourcePath}' ${filenames.length} files remain:`);
        core.debug(`   ${filenames.join(', ')}`);
    }
    return filenames;
}

module.exports.downloadPmd = downloadPmd;
module.exports.executePmd = executePmd;
module.exports.determineModifiedFiles = determineModifiedFiles;
