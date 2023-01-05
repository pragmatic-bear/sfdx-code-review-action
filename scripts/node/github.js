const { Octokit } = require('@octokit/action');

module.exports = {
	createReview: async function (review) {
		const octokit = new Octokit();

		const {
			data: { id }
		} = await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
			owner: review.owner,
			repo: review.repo,
			pull_number: review.pullNumber,
			body: review.body,
			comments: review.comments,
			event: review.event
		});
		return id;
	},

	getReviews: async function (review) {
		const octokit = new Octokit();
		const { data } = await octokit.request(
			'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews{?per_page,page}',
			{
				owner: review.owner,
				repo: review.repo,
				pull_number: review.pullNumber
			}
		);
		return data;
	},

	getReviewComments: async function (review) {
		const octokit = new Octokit();
		const { data } = await octokit.request(
			'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments{?per_page,page}',
			{
				owner: review.owner,
				repo: review.repo,
				pull_number: review.pullNumber,
				review_id: review.id
			}
		);
		return data;
	},

	submitReview: async function (review) {
		const octokit = new Octokit();

		await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events', {
			owner: review.owner,
			repo: review.repo,
			pull_number: review.pullNumber,
			review_id: review.id,
			body: review.body,
			event: review.event
		});
	},

	addComment: async function (review, comment) {
		const octokit = new Octokit();

		const {
			data: { id }
		} = await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
			owner: review.owner,
			repo: review.repo,
			pull_number: review.pullNumber,
			body: comment.body,
			path: comment.path,
			position: comment.position,
			commit_id: review.commitId,
			start_side: 'RIGHT',
			side: 'RIGHT'
		});
		return id;
	}
};
