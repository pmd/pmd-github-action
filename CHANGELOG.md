# Changelog

## [Unreleased](https://github.com/pmd/pmd-github-action/tree/HEAD)

[Full Changelog](https://github.com/pmd/pmd-github-action/compare/v1.2.0...HEAD)

**Dependency updates:**

- Bump eslint from 8.8.0 to 8.9.0 [\#55](https://github.com/pmd/pmd-github-action/pull/55) (@dependabot[bot])

## [v1.2.0](https://github.com/pmd/pmd-github-action/tree/v1.2.0) (2022-02-10)

[Full Changelog](https://github.com/pmd/pmd-github-action/compare/v1.1.0...v1.2.0)

**Implemented enhancements:**

- Create a starter workflow [\#1](https://github.com/pmd/pmd-github-action/issues/1)
- Add an option to disable GitHub annotations \(`createGitHubAnnotations`\) [\#45](https://github.com/pmd/pmd-github-action/pull/45) (@smetanink)

**Fixed bugs:**

- Code scanning alert doesn't find file in repository [\#34](https://github.com/pmd/pmd-github-action/issues/34)

**Dependency updates:**

- Bump jest from 27.4.7 to 27.5.1 [\#50](https://github.com/pmd/pmd-github-action/pull/50) (@dependabot[bot])
- Bump nock from 13.2.2 to 13.2.4 [\#48](https://github.com/pmd/pmd-github-action/pull/48) (@dependabot[bot])
- Bump eslint from 8.7.0 to 8.8.0 [\#46](https://github.com/pmd/pmd-github-action/pull/46) (@dependabot[bot])
- Bump eslint from 8.5.0 to 8.7.0 [\#44](https://github.com/pmd/pmd-github-action/pull/44) (@dependabot[bot])
- Bump nock from 13.2.1 to 13.2.2 [\#43](https://github.com/pmd/pmd-github-action/pull/43) (@dependabot[bot])
- Bump jest from 27.4.5 to 27.4.7 [\#42](https://github.com/pmd/pmd-github-action/pull/42) (@dependabot[bot])
- Bump actions/setup-node from 2.5.0 to 2.5.1 [\#39](https://github.com/pmd/pmd-github-action/pull/39) (@dependabot[bot])
- Bump @vercel/ncc from 0.33.0 to 0.33.1 [\#38](https://github.com/pmd/pmd-github-action/pull/38) (@dependabot[bot])
- Bump eslint from 8.4.1 to 8.5.0 [\#33](https://github.com/pmd/pmd-github-action/pull/33) (@dependabot[bot])

**Closed issues:**

- Code scanning doesn't work well with analyzeModifiedFilesOnly [\#35](https://github.com/pmd/pmd-github-action/issues/35)

**Merged pull requests:**

- Update documentation for code scanning alerts [\#37](https://github.com/pmd/pmd-github-action/pull/37) (@adangel)
- Relativize paths in SARIF report [\#36](https://github.com/pmd/pmd-github-action/pull/36) (@adangel)

## [v1.1.0](https://github.com/pmd/pmd-github-action/tree/v1.1.0) (2021-12-17)

[Full Changelog](https://github.com/pmd/pmd-github-action/compare/v1.0.0...v1.1.0)

**Implemented enhancements:**

- Create inline annotations for found violations [\#7](https://github.com/pmd/pmd-github-action/issues/7)
- Support analyzing only modified files [\#6](https://github.com/pmd/pmd-github-action/issues/6)

**Fixed bugs:**

- Action doesn't work under Windows runner [\#21](https://github.com/pmd/pmd-github-action/issues/21)

**Dependency updates:**

- Bump @actions/artifact from 0.6.0 to 0.6.1 [\#27](https://github.com/pmd/pmd-github-action/pull/27) (@dependabot[bot])
- Bump jest from 27.4.3 to 27.4.5 [\#26](https://github.com/pmd/pmd-github-action/pull/26) (@dependabot[bot])
- Bump @actions/artifact from 0.5.2 to 0.6.0 [\#20](https://github.com/pmd/pmd-github-action/pull/20) (@dependabot[bot])
- Bump eslint from 8.3.0 to 8.4.1 [\#19](https://github.com/pmd/pmd-github-action/pull/19) (@dependabot[bot])
- Bump @vercel/ncc from 0.32.0 to 0.33.0 [\#15](https://github.com/pmd/pmd-github-action/pull/15) (@dependabot[bot])
- Bump jest from 27.4.2 to 27.4.3 [\#13](https://github.com/pmd/pmd-github-action/pull/13) (@dependabot[bot])
- Bump jest from 27.4.0 to 27.4.2 [\#10](https://github.com/pmd/pmd-github-action/pull/10) (@dependabot[bot])
- Bump jest from 27.3.1 to 27.4.0 [\#9](https://github.com/pmd/pmd-github-action/pull/9) (@dependabot[bot])
- Bump actions/setup-node from 2.4.1 to 2.5.0 [\#8](https://github.com/pmd/pmd-github-action/pull/8) (@dependabot[bot])

**Merged pull requests:**

- Determine modified files for pull requests and pushes [\#24](https://github.com/pmd/pmd-github-action/pull/24) (@adangel)
- Add "Check changelog" job [\#23](https://github.com/pmd/pmd-github-action/pull/23) (@adangel)
- Call pmd.bat under win32 [\#22](https://github.com/pmd/pmd-github-action/pull/22) (@adangel)
- Avoid using deprecated CLI options for PMD \>= 6.41.0 [\#17](https://github.com/pmd/pmd-github-action/pull/17) (@adangel)
- Add optional token parameter [\#16](https://github.com/pmd/pmd-github-action/pull/16) (@adangel)
- Create annotations from sarif report [\#12](https://github.com/pmd/pmd-github-action/pull/12) (@adangel)

## [v1.0.0](https://github.com/pmd/pmd-github-action/tree/v1.0.0) (2021-11-27)

[Full Changelog](https://github.com/pmd/pmd-github-action/compare/7a92e4f0f1a963c40cf10ad9d01e4140ffe354e2...v1.0.0)

First release of the official GitHub Action for PMD.

This action runs [PMD](https://pmd.github.io) static code analysis checks.

It can execute PMD with your own ruleset against your project. It creates a [SARIF](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) report which is uploaded as a build artifact. Furthermore the build can be failed based on the number of violations.




\* *This Changelog was automatically generated by [github_changelog_generator](https://github.com/github-changelog-generator/github-changelog-generator)*
