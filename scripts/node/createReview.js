#!/usr/bin/node

const diffFilePath = 'diff.txt';
const issuesPath = 'comments.json';
const dfaIssuesPath = 'dfa-comments.json';

const failThreshold = parseInt(process.env.FAIL_THRESHOLD);
const rejectThreshold = parseInt(process.env.REJECT_THRESHOLD);
const approveThreshold = parseInt(process.env.APPROVE_THRESHOLD);
const absoluteMaxComments = parseInt(process.env.MAX_COMMENTS);
const minSeverityToConsider = parseInt(process.env.SEVERITY_THRESHOLD);

const PR_MAX_SIZE = 29;

main();

async function main() {
	let diffData;
	let allIssues;
	try {
		const files = require('./files.js');
		diffData = files.readDiff(diffFilePath);
		let analyserIssues = files.readIssues(issuesPath);
		let dfaIssues = files.readIssues(dfaIssuesPath);
		allIssues = [...analyserIssues, ...dfaIssues];
	} catch (err) {
		console.error(err);
	}

	const report = require('./report.js');
	const issuesOnPrDiff = comments.deleteSeverity(report.parse(diffData, allIssues, minSeverityToConsider));
	const comments = require('./comments.js');

	const githubAction = require('@actions/github');
	const pullRequest = githubAction.context.payload.pull_request;
	const review = require('./review.js');
	const prReview = review.evaluate(issuesOnPrDiff, approveThreshold, rejectThreshold);

	prReview.repo = pullRequest.base.repo.name;
	prReview.owner = pullRequest.base.repo.owner.login;
	prReview.pullNumber = pullRequest.number;
	prReview.commitId = pullRequest.head.sha;

	const github = require('./github.js');
	const allReviews = await github.getReviews(prReview);
	const previousReviews = review.findRelevantReviews(allReviews);
	let allExistingComments = new Map();
	if (previousReviews.length > 0) {
		for (const previousReview of previousReviews) {
			prReview.id = previousReview.id;
			const existingCommentsArray = await github.getReviewComments(prReview);
			const existingComments = comments.parseExisting(existingCommentsArray);
			allExistingComments = new Map([...existingComments, ...allExistingComments]);
		}
	}
	let newIssues = comments.filterOutExisting(issuesOnPrDiff, allExistingComments);
	console.log(
		`current issues: ${allIssues.length}, already posted: ${allExistingComments.size}, new ${newIssues.length}`
	);
	let hasNewIssues = newIssues.length > 0;
	let hasNoCurrentIssues = allIssues.length === 0;
	let isFirstReview = previousReviews.length === 0;
	let isIssueCountChanged = allIssues.length !== allExistingComments.size;
	console.log(
		`hasNewIssues: ${hasNewIssues}, hasNoCurrentIssues: ${hasNoCurrentIssues}, isFirstReview: ${isFirstReview}, isIssueCountChanged: ${isIssueCountChanged}`
	);
	//create PR Review
	if (hasNewIssues || isIssueCountChanged || (hasNoCurrentIssues && isFirstReview)) {
		let sortedComments = comments.sort(newIssues, absoluteMaxComments);
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
	//fail pipeline if necessary
	console.log(`Fail threshold set at: ${failThreshold}`);
	if (failThreshold > 0) {
		const severity = review.getSeverity(issuesOnPrDiff, failThreshold);
		console.log(`Highest severity: ${severity.mostSevere}`);
		if (severity.mostSevere <= failThreshold) {
			const core = require('@actions/core');
			core.setFailed(
				`At least ${severity.needsRework} of the ${severity.commentCount} rule violations identified by the Salesforce Code Analyzer require rework. Highest severity found was ${severity.mostSevere}.`
			);
		}
	}
}
