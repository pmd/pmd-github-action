const core = require('@actions/core');
const { Octokit } = require("@octokit/rest");
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const semver = require('semver');

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
        return {
            version: pmdVersion,
            path: `${cachedPmdPath}/pmd-bin-${pmdVersion}`
        };
    } catch (error) {
        core.setFailed(error.message || error);
    }
}

const executePmd = async function(pmdInfo, sourcePath, ruleset, reportFormat, reportFile) {
    try {
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
    } catch (error) {
        core.setFailed(error.message || error);
    }
}

function useNewArgsFormat(pmdVersion) {
    return semver.gte(pmdVersion, '6.41.0');
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
