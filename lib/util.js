const core = require('@actions/core');
const { Octokit } = require("@octokit/rest");
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const os = require('os');

const downloadPmd = async function(version) {
    try {
        let pmdVersion = version;
        let cachedPmdPath = tc.find('pmd', version);
        core.debug(`cached path result: ${cachedPmdPath}`);
        if (cachedPmdPath === '') {
            const pmdRelease = await determinePmdRelease(version);
            pmdVersion = getPmdVersionFromRelease(pmdRelease);
            const pathToZipDistribution = await tc.downloadTool(await getDownloadURL(pmdRelease));
            const pmdExtractedFolder = await tc.extractZip(pathToZipDistribution);
            cachedPmdPath = await tc.cacheDir(pmdExtractedFolder, 'pmd', pmdVersion);
        }

        core.info(`Using PMD ${pmdVersion} from cached path ${cachedPmdPath}`);
        return `${cachedPmdPath}/pmd-bin-${pmdVersion}`;
    } catch (error) {
        core.setFailed(error.message || error);
    }
}

const executePmd = async function(pmdPath, sourcePath, ruleset, reportFormat, reportFile) {
    try {
        let pmdExecutable = '/bin/run.sh pmd';
        if (os.platform() === 'win32') {
            pmdExecutable = '\\bin\\pmd.bat';
        }
        const { exitCode, stdout, stderr } = await exec.getExecOutput(`${pmdPath}${pmdExecutable}`,
            [
                '-no-cache',
                '-d', sourcePath,
                '-f', reportFormat,
                '-R', ruleset,
                '-r', reportFile,
            ],
            {
                ignoreReturnCode: true
            });
        core.debug(`stdout: ${stdout}`);
        core.debug(`stderr: ${stderr}`);
        core.debug(`exitCode: ${exitCode}`);
        return exitCode;
    } catch (error) {
        core.setFailed(error.message || error);
    }
}

async function determinePmdRelease(pmdVersion) {
    core.debug(`determine release info for ${pmdVersion}`);
    const octokit = new Octokit({baseUrl: getGithubBaseUrl()});
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

function getGithubBaseUrl() {
    return process.env['GITHUB_API_URL'] || 'https://api.github.com';
}

module.exports.downloadPmd = downloadPmd;
module.exports.executePmd = executePmd;
