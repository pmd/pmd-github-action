const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');
const github_defaults = require('@actions/github/lib/utils').defaults;

const commentLimit = 65536;
const concurrentRequestsLimit = 100;

/**
 * Function to create comments for the Pull Request
 * @param {Object} report Content of the pmd-report.sarif file as an Object (JSON)
 * @param {String} token API token to reach GitHub Rest API
 */
const createComments = (report, token) => {
    if (!report || !token) {
        core.warning("Missing report or missing token. Won't create comments");
        return;
    }
    const context = new github.context.constructor();
    const PUBLIC_GITHUB_API_URL = 'https://api.github.com';
    const octokit =
        (github_defaults.baseUrl === PUBLIC_GITHUB_API_URL && github.getOctokit(token)) ||
        new Octokit({ baseUrl: PUBLIC_GITHUB_API_URL });
    const rules = report.runs[0].tool.driver.rules;
    const results = report.runs[0].results;

    const violations = results.reduce((allComments, violation) => {
        const rule = rules[violation.ruleIndex];
        allComments.push(
            ...violation.locations.reduce((comments, location) => {
                comments.push(createCommentText(rule, location));
                return comments;
            }, [])
        );
        return allComments;
    }, []);
    const promises = [];
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const issue = context.issue.number;
    const comments = createCommentData(owner, repo, issue, violations);
    core.info(`About to create ${comments.length} comments now for PR #${issue}`);
    if (concurrentRequestsLimit >= comments.length) {
        comments.forEach((data) => {
            promises.push(octokit.request(`POST /repos/${owner}/${repo}/issues/${issue}/comments`, data));
        });
        Promise.allSettled(promises).catch((issue) => {
            core.error(issue);
        });
        core.info("Finished creating comments.");
    } else {
        core.warning(`Too many comments. Over ${concurrentRequestsLimit} comments needed to fit all the violations.`);
    }
};

const mapPriority = (pmdPriority) => {
    switch (pmdPriority) {
        case 1: // net.sourceforge.pmd.RulePriority.HIGH
            return ':bangbang:';
        case 2: // net.sourceforge.pmd.RulePriority.MEDIUM_HIGH
            return ':heavy_exclamation_mark:';
        case 3: // net.sourceforge.pmd.RulePriority.MEDIUM
        case 4: // net.sourceforge.pmd.RulePriority.MEDIUM_LOW
            return ':warning:';
        default: // net.sourceforge.pmd.RulePriority.LOW (5)
            return ':bookmark:';
    }
};

const getFileName = (location) => {
    const regex = /([A-Za-z0-9_-]*)(\..*)$/gm;
    const details = location.physicalLocation;
    return `${details.artifactLocation.uri.match(regex).pop()} (Line:${details.region.startLine})`;
};

const createCommentData = (owner, repo, pullRequestNumber, comments) => {
    const chunks = [];
    let part = '';
    comments.forEach((comment, index) => {
        if (part.length === 0 && comment.length <= commentLimit) {
            part = `${comment}`;
        } else if (part.length + comment.length <= commentLimit - 2) {
            part = `${part}\n${comment}`;
        } else {
            chunks.push({
                owner,
                repo,
                issue_number: pullRequestNumber,
                body: part,
            });
            part = `${comment}`;
        }
        if (index === comments.length - 1) {
            chunks.push({
                owner,
                repo,
                issue_number: pullRequestNumber,
                body: part,
            });
        }
    });
    return chunks;
};

const createCommentText = (rule, location) => {
    const priority = rule.properties.priority;
    return `${mapPriority(priority)} (${priority}) - ${getFileName(location)}`;
};

module.exports.createComments = createComments;
