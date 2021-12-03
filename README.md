# GitHub Action for PMD

<a href="https://github.com/pmd/pmd-github-action/actions"><img alt="pmd-github-action status" src="https://github.com/pmd/pmd-github-action/actions/workflows/test.yml/badge.svg"></a>
<a href="https://img.shields.io/github/v/release/pmd/pmd-github-action"><img alt="release" src="https://img.shields.io/github/v/release/pmd/pmd-github-action"></a>

This action runs [PMD](https://pmd.github.io) static code analysis checks.

It can execute PMD with your own ruleset against your project. It creates a [SARIF](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
report which is uploaded as a build artifact. Furthermore the build can be failed based on the number of violations (see the extended examples).

## Usage

The input `rulesets` is mandatory.

### Basic

```yaml
steps:
  - uses: actions/setup-java@v2
    with:
      distribution: 'temurin'
      java-version: '11'
  - uses: pmd/pmd-github-action@v1
    with:
      rulesets: 'ruleset.xml'
```

### Extended

Fail the build based on the number of violations:

```yaml
steps:
  - uses: actions/setup-java@v2
    with:
      distribution: 'temurin'
      java-version: '11'
  - uses: pmd/pmd-github-action@v1
    id: pmd
    with:
      version: '6.40.0'
      sourcePath: 'src/main/java'
      rulesets: 'rulesets/java/quickstart.xml,ruleset.xml'
  - name: Fail build if there a violations
    if: steps.pmd.outputs.violations != 0
    run: exit 1
```

Uploading a SARIF file to GitHub:

```yaml
steps:
  - uses: actions/setup-java@v2
    with:
      distribution: 'temurin'
      java-version: '11'
  - uses: pmd/pmd-github-action@v1
    id: pmd
    with:
      rulesets: 'ruleset.xml'
  - name: Upload SARIF file
    uses: github/codeql-action/upload-sarif@v1
    with:
      sarif_file: pmd-report.sarif
```

See also [Uploading a SARIF file to GitHub](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github).

## Inputs

|input       |required|default|description|
|------------|---|--------|---------------|
|`token`     |no |"github.token"|Personal access token (PAT) used to query the latest PMD release and the download URL for PMD.<br>By default the automatic token for GitHub Actions is used.<br>[Learn more about automatic token authentication](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)<br>[Learn more about creating and using encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)|
|`version`   |no |"latest"|PMD version to use. Using "latest" automatically downloads the latest version.<br>Available versions: https://github.com/pmd/pmd/releases|
|`sourcePath`|no |"."     |Root directory for sources. Uses by default the current directory|
|`rulesets`  |yes|        |Comma separated list of ruleset names to use.|

## Outputs

|output      |description|
|------------|-----------|
|`violations`|Number of detected violations. Can be used to fail the build.|

## Limitations

Below are a list of known limitations for the **PMD GitHub Action**:

*   You can analyze Java sources. But this actions current lacks the ability to configure the `auxclasspath` hence
    the results won't be as good as they could be. For Java projects, integrating PMD via maven or gradle is
    recommended. Furthermore, the project is analyzed as is. No build is initiated before by this action.
    For Java this means, that the project is not compiled.

*   While you can provide a custom ruleset, you can only use custom rules entirely defined within your ruleset.
    This means that this action is limited to XPath rules for custom rules. In order to support custom Java based
    rules, the accompanying jar file containing the custom rule implementation would need to be provided.

*   Setting additional environment variables is not possible. This might be needed for some languages,
    e.g. [Visualforce](https://pmd.github.io/latest/pmd_languages_visualforce.html).

## Other similar actions for PMD

[Github Marketplace PMD Actions](https://github.com/marketplace?type=actions&query=pmd):

| Marketplace | Github | License |
|-------------|--------|---------|
|https://github.com/marketplace/actions/pmd-analyser | https://github.com/synergy-au/pmd-analyser-action | MIT |
|https://github.com/marketplace/actions/push-pmd-report | https://github.com/jwgmeligmeyling/pmd-github-action | MIT |
|https://github.com/marketplace/actions/pmd-automatic-reviewer | https://github.com/krukmat/setup-pmd | MIT |
|https://github.com/marketplace/actions/pmd-code-analyzer-action | https://github.com/billyan2018/setup-pmd | MIT |
|https://github.com/marketplace/actions/pmd-analyzer-action | https://github.com/RTJL/pmd-analyzer-action | ? |
|https://github.com/marketplace/actions/pmd-source-code-analyzer-action | https://github.com/sfdx-actions/setup-pmd | MIT |
|https://github.com/marketplace/actions/pmd-source-code-analyzer-action-for-sap | https://github.com/ashkumar-wtc/setup-pmd | MIT |
|https://github.com/marketplace/actions/pmd-salesforce-apex-code-analyzer-action | https://github.com/legetz/setup-pmd | MIT |
|https://github.com/marketplace/actions/powermode-scan | https://github.com/ncino/powermode-scan |

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
