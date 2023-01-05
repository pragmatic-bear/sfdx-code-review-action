#!/usr/bin/node

const args = process.argv.slice(2);

const diffFilePath = args[0];
const issuesPath = args[1];

const rejectTreshold = args.length > 2 ? args[2] : 0;
const approveThreshold = args.length > 3 ? args[3] : 99;

const absoluteMaxComments = args.length > 4 ? args[4] : undefined;

const fs = require('fs');
const PR_MAX_SIZE = 39;

main();

async function main() {
	let diffData;
	let issues;
	try {
		diffData = fs.readFileSync(diffFilePath, 'utf8');
		issues = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
	} catch (err) {
		console.error(err);
	}

	const report = require('./report.js');
	issues = report.parse(diffData, issues);
	const comments = require('./comments.js');

	const githubAction = require('@actions/github');
	const pullRequest = githubAction.context.payload.pull_request;
	const review = require('./review.js');
	const prReview = review.evaluate(issues, approveThreshold, rejectTreshold);

	prReview.repo = pullRequest.base.repo.name;
	prReview.owner = pullRequest.base.repo.owner.login;
	prReview.pullNumber = pullRequest.number;
	prReview.commitId = pullRequest.head.sha;

	const github = require('./github.js');
	const allReviews = await github.getReviews(prReview);
	const previousReviews = review.findRelevantReviews(allReviews);
	let filteredIssues = [];
	let allExistingComments = new Map();
	if (previousReviews.length > 0) {
		for (const previousReview of previousReviews) {
			prReview.id = previousReview.id;
			const existingCommentsArray = await github.getReviewComments(prReview);
			const existingComments = comments.parseExisting(existingCommentsArray);
			allExistingComments = new Map([...existingComments, ...allExistingComments]);
		}
		filteredIssues = comments.filter(issues, allExistingComments);
	}
    console.log(`current issues: ${issues.length}, already posted: ${allExistingComments.size}, new ${filteredIssues.length}`);
	let hasNewIssues = filteredIssues.length > 0;
	let hasNoCurrentIssues = issues.length === 0;
	let isFirstReview = previousReviews.length === 0;
	let isIssueCountChanged = issues.length !== allExistingComments.size;
    console.log(`hasNewIssues: ${hasNewIssues}, hasNoCurrentIssues: ${hasNoCurrentIssues}, isFirstReview: ${isFirstReview}, isIssueCountChanged: ${isIssueCountChanged}`);
	if (hasNewIssues || isIssueCountChanged || (hasNoCurrentIssues && isFirstReview)) {
		let sortedComments = comments.sort(filteredIssues, absoluteMaxComments);
		prReview.comments = sortedComments.slice(0, PR_MAX_SIZE);
		sortedComments = sortedComments.slice(PR_MAX_SIZE);
		const reviewId = await github.createReview(prReview);
		prReview.id = reviewId;
		console.log(`Review Id ${prReview.id}`);

		const { execSync } = require('child_process');
		for (const issue of sortedComments) {
			console.log(`post single comment [${issue.body}]`);
			let commentId = await github.addComment(prReview, issue);
			console.log(`Comment id: ${commentId} now waiting 5 seconds..`);
			execSync('sleep 5'); // block process for 5 seconds.
		}
	}
}
