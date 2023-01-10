# sfdx-code-review-action
GitHub Pull Request code review using [Salesforce Code Analyzer](https://forcedotcom.github.io/sfdx-scanner/en/scanner-commands/run/)
## Highlights
- Supports new Salesforce Graph Engine analysis<sup>*</sup>
- Safe against GitHub API Rate Limiting
- Does not duplicate comments
- Limits analysis to relevant files to save time

<sup>*</sup> If your codebase (or a typical PR) is really big the Graph Engine can run for ages or blow up the image. Tread carefully :-)
## Description
Action will checkout the repository and fetch the Head and base branches of the Pull Request. It will then install the Salesforce CLI and Code Analyzer plugin.

The Run of the analyser is limited to the changed files. The produced issue report is compared to the GitHub Pull Request diff and issues relevant to visible changes in the PR are included as inline comments in the Pull Request review

Maximum of 39 comments are added as part of the review itself (due to time limits on API request). Any additional comments will be added separately outside of the review if the ```max_comments``` setting is set to a higher value (in 5s intervals to protect from API Rate Limits). 

If the Review is repeated (e.g. adding commits to the PR) the action will retrieve existing reviews and only add comments that are not present already. 
## Configurability
Some scanner arguments cannot be influenced (e.g. The scanner runs with the ```--normalise-severity``` argument so severity is 1-3 and ```--format``` is set by the action to support its function). 

It is however possible to provide specific values for most of the other important arguments such as ```--category```, ```--pmdconfig``` and so on.

If reject threshold is specified review may request changes based on the results. If approval threshold is specific review may give approval if no issues are found or they are of lower importance. If no thresholds are specified the review will always be "COMMENT". 

It is possible to configure the maximum number of comments to be added. The most severe issues are added first. All found issues are considered for the final results evaluation (approve vs request changes) even if they would not be added as comments.

## Usage
Add the action to your workflow for Pull Requests. Tested running on 'ubuntu-latest' image (needs bash, jq, python and node).
### Parameters
| Parameter         | Required     | Notes |
|--------------|-----------|------------|
| github_token | yes      | Pass in the GITHUB_TOKEN secret to be able to make the Create PR Review API Call        |
| source_path      | no  | Path to the package folder containing source to be analysed. Git Diff will be performend in this folder and only changed files will be considered. Defaults to ```force-app```      |
| reject_threshold  | no | Single Issue with this severity will cause the review to request changes. |
| approve_threshold | no | If all Issues are less severe than this the review will give approval - categor(ies) of rules to run |
| category          | no | From Analyzer; One or more categories of rules to run. Specify multiple values as a comma-separated list.  |
| max_comments          | no | Chooses the maximum number of inline review comments added at one time. Defaults to ```39```. |
| engine          | no | From Analyzer; Specifies one or more engines to run. Submit multiple values as a comma-separated list. Specify the location of eslintrc config to customize eslint engine. Defaults to ```'pmd, eslint, cpd'```  |
| eslintconfig          | no | From Analyzer;  Specifies the location of eslintrc config to customize eslint engine.  |
| pmdconfig          | no | From Analyzer;  Specifies the location of PMD rule reference XML file to customize rule selection.  |
| tsconfig          | no | From Analyzer;  Location of tsconfig.json file used by eslint-typescript engine.  |
| dfa_setting          | no | Use this to include (or run only) the Salesforce Graph Engine analysis. Valid options are ```'dfa'``` and ```'dfa-only'```. When left blank (default) Graph Engine analysis is not executed.  |
| projectdir          | no | From Analyzer, Applies to DFA only; Provides the relative or absolute root project directory used to set the context for Graph Engine analysis. Project directory must be a path, not a glob. Specify multiple values as a comma-separated list. Defaults to ```"./"```  |
| rule_thread_count          | no | From Analyzer, Applies to DFA only; Specifies number of rule evaluation threads, or how many entrypoints can be evaluated concurrently. Inherits value from SFGE_RULE_THREAD_COUNT env-var, if set. Default is ```4```.  |
| rule_thread_timeout          | no | From Analyzer, Applies to DFA only; Specifies time limit for evaluating a single entrypoint in milliseconds. Inherits from SFGE_RULE_THREAD_TIMEOUT env-var if set. Default is ```900,000 ms```, or ```15 minutes```.  |



### Example YAML

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
              uses: packocz/sfdx-code-review-action@v0.3.0
              with:
                  source_path: 'invest-app/**/*'
                  reject_threshold: 1
                  max_comments: 20
                  category: '!Documentation'
                  engine: 'pmd, eslint'
                  dfa_setting: 'dfa'
                  github_token: ${{ secrets.GITHUB_TOKEN }}
```

