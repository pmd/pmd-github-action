const core = require('@actions/core');
const github = require('@actions/github');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const semver = require('semver');

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

const executePmd = async function(pmdInfo, sourcePath, ruleset, reportFormat, reportFile) {
    const execOutput = await exec.getExecOutput(`${pmdInfo.path}/bin/run.sh`,
        [
            'pmd',
            useNewArgsFormat(pmdInfo.version) ? '--no-cache' : '-no-cache',
            '-d', sourcePath,
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

module.exports.downloadPmd = downloadPmd;
module.exports.executePmd = executePmd;
