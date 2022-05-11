# sfdx-code-review-action (beta)
GitHub Pull Request code review using Salesforce Code Analyzer
## Description
Action will checkout the repository and fetch the Head and base branches of the Pull Request. It will then install the Salesforce CLI and Code Analyzer plugin.

The Run of the analyzer produces an issue report which is converted into acceptable format for GitHub Code Review inline Comments. Finally the GitHub Pull Request giff is retrieved and processed in order to filter out any issues that fall out of the diff visible in the PR (comments cannot be added outside of the diff)
## Usage
Add the action to your workflow for Pull Requests. Tested running on 'ubuntu-latest' image (needs bash, python and node).
## Configurability
Most parameters are not required. The scanner runs with the --normalise-severity argument so severity is 1-3. If no thresholds are specified the review will always be "COMMENT". 
### Parameters
| Parameter         | Required     | Notes |
|--------------|-----------|------------|
| github_token | yes      | Pass in the GITHUB_TOKEN secret to be able to make the Create PR Review API Call        |
| source_path      | no  | Path to the package folder containing source to be analysed. Defaults to ```force-app```      |
| reject_threshold  | no | Single Issue with this severity will cause the review to request changes. |
| approve_threshold | no | If all Issues are less severe than this the review will give approval - categor(ies) of rules to run |
| category          | no | Only scanner argument currently supported, https://forcedotcom.github.io/sfdx-scanner/en/scanner-commands/run/ |


## Example YAML

```
name: Review
on:
    workflow_dispatch:
    pull_request:
        types: [opened, synchronize, reopened]
        branches: [main]
jobs:
    review:
        name: ReviewSource
        runs-on: 'ubuntu-latest'
        steps:
            - name: Code Review
              uses: packocz/sfdx-code-review-action@v0.0.1
              with:
                  source_path: 'invest-app/**/*'
                  reject_threshold: 1
                  category: '!Documentation'
                  github_token: ${{ secrets.GITHUB_TOKEN }}
```

