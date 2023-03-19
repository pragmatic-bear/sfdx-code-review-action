#!/usr/bin/node

const diffFilePath = 'diff.txt';
const issuesPath = 'comments.json';
const dfaIssuesPath = 'dfa-comments.json';

const rejectTreshold = parseInt(process.env.REJECT_THRESHOLD);
const approveThreshold = parseInt(process.env.APPROVE_THRESHOLD);
const absoluteMaxComments = parseInt(process.env.MAX_COMMENTS);
const minSeverityToConsider = parseInt(process.env.SEVERITY_THRESHOLD);

const fs = require('fs');
const PR_MAX_SIZE = 29;


main();

async function main() {
	let diffData;
	let issues;
	try {
		diffData = fs.readFileSync(diffFilePath, 'utf8');
		let analyserIssues;
		try {
			analyserIssues = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
			if (!Array.isArray(analyserIssues)) {
				analyserIssues = [];
			}
		} catch (err) {
			analyserIssues = [];
		}
		let dfaIssues;
		try {
			dfaIssues = JSON.parse(fs.readFileSync(dfaIssuesPath, 'utf8'));
			if (!Array.isArray(dfaIssues)) {
				dfaIssues = [];
			}
		} catch (err) {
			dfaIssues = [];
		}
		issues = [...analyserIssues, ...dfaIssues];
	} catch (err) {
		console.error(err);
	}

	const report = require('./report.js');
	issues = report.parse(diffData, issues, minSeverityToConsider);
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
	let allExistingComments = new Map();
	if (previousReviews.length > 0) {
		for (const previousReview of previousReviews) {
			prReview.id = previousReview.id;
			const existingCommentsArray = await github.getReviewComments(prReview);
			const existingComments = comments.parseExisting(existingCommentsArray);
			allExistingComments = new Map([...existingComments, ...allExistingComments]);
		}
	} 
    let filteredIssues = comments.filter(issues, allExistingComments);
	console.log(
		`current issues: ${issues.length}, already posted: ${allExistingComments.size}, new ${filteredIssues.length}`
	);
	let hasNewIssues = filteredIssues.length > 0;
	let hasNoCurrentIssues = issues.length === 0;
	let isFirstReview = previousReviews.length === 0;
	let isIssueCountChanged = issues.length !== allExistingComments.size;
	console.log(
		`hasNewIssues: ${hasNewIssues}, hasNoCurrentIssues: ${hasNoCurrentIssues}, isFirstReview: ${isFirstReview}, isIssueCountChanged: ${isIssueCountChanged}`
	);
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
