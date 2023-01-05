# sfdx-code-review-action
GitHub Pull Request code review using Salesforce Code Analyzer
## Description
Action will checkout the repository and fetch the Head and base branches of the Pull Request. It will then install the Salesforce CLI and Code Analyzer plugin.

The Run of the analyzer produces an issue report which compared to the GitHub Pull Request diff and issues relevant for visible changes in the PR are included (comments cannot be added outside of the diff).

Will add a maximum of 39 comments as part of the review (due to time limits on API request). Any additional comments will be added separately outside of the review if the max_comments setting is set to a higher value (in 5s intervals to protect from API Rate Limits). 

If the Step is repeated (e.g. adding commits to the PR) the action will retrieve existing reviews and only add comments that are not present already. 
## Usage
Add the action to your workflow for Pull Requests. Tested running on 'ubuntu-latest' image (needs bash, jq, python and node).
## Configurability
Most parameters are not required. The scanner runs with the --normalise-severity argument so severity is 1-3. It is possibly to specify the categories of issues to include/exclude (use same value as you would with the plugin directly for the equivalent argument). Otherwise the analyzer runs with default settings.
(more configuration options will be added in the future)

If reject threshold is specified review may request changes based on the results. If approval threshold is specific review may give approval if no issues are found or they are of lower importance. If no thresholds are specified the review will always be "COMMENT". 

It is possible to configure the maximum number of comments to be added. The most severe issues are added first. All found issues are considered for the final results evaluation (approve vs request changes) even if they would not be added as comments.
### Parameters
| Parameter         | Required     | Notes |
|--------------|-----------|------------|
| github_token | yes      | Pass in the GITHUB_TOKEN secret to be able to make the Create PR Review API Call        |
| source_path      | no  | Path to the package folder containing source to be analysed. Defaults to ```force-app```      |
| reject_threshold  | no | Single Issue with this severity will cause the review to request changes. |
| approve_threshold | no | If all Issues are less severe than this the review will give approval - categor(ies) of rules to run |
| category          | no | Only scanner argument currently supported, https://forcedotcom.github.io/sfdx-scanner/en/scanner-commands/run/ |
| max_comments          | no | Chooses the maximum number of inline review comments added at one time. Default is 39. |


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
                  max_comments: 20
                  category: '!Documentation'
                  github_token: ${{ secrets.GITHUB_TOKEN }}
```

