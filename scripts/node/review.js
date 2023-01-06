module.exports = {
	evaluate: function (comments, approveThreshold, rejectThreshold) {
        console.log(`evaluating decision, approve threshold: ${approveThreshold}, reject threshold: ${rejectThreshold}`);
		let severity = getSeverity(comments, rejectThreshold);

		let review = {
			event: 'COMMENT',
			body: 'Salesforce Code Analyzer did not find any rule violations'
		};
		if (approveThreshold !== undefined && severity.mostSevere > approveThreshold) {
			review.event = 'APPROVE';
			if (severity.commentCount > 0) {
				review.body = `Maximum severity of the ${severity.commentCount} rule violations identified by the Salesforce Code Analyzer was ${severity.mostSevere}.`;
			}
		} else if (
			severity.commentCount > 0 &&
			rejectThreshold !== undefined &&
			severity.mostSevere <= rejectThreshold
		) {
			review.event = 'REQUEST_CHANGES';
			review.body = `At least ${severity.needsRework} of the ${severity.commentCount} rule violations identified by the Salesforce Code Analyzer require rework. Highest severity found was ${severity.mostSevere}. `;
		} else if (severity.commentCount > 0) {
			review.body = `Salesforce Code Analyzer identified ${severity.commentCount} rule violations in your changes with severity as high as ${severity.mostSevere}. `;
		}
		return review;
	},
	findRelevantReviews: function (existingReviews) {
		let relevantReviews = [];
		if (Array.isArray(existingReviews)) {
			for (const review of existingReviews) {
				if (review.user.login == 'github-actions[bot]') {
					relevantReviews.push(review);
					console.log(
						`found relevant review: ${review.id} ${review.state} by ${review.user.login} that said "${review.body}"`
					);
				}
			}
		}
		return relevantReviews;
	}
};

function getSeverity(comments, rejectThreshold) {
	let severity = { commentCount: 0, mostSevere: 99, needsRework: 0 };
	comments.forEach((comment) => {
		let commentSeverity = parseInt(comment.severity);
		severity.commentCount++;
		if (commentSeverity < severity.mostSevere) {
			severity.mostSevere = commentSeverity;
		}
		if (rejectThreshold !== undefined && commentSeverity <= rejectThreshold) {
			severity.needsRework++;
		}
		delete comment.severity;
	});
    console.log(`Issues severity ${JSON.stringify(severity)}`);
	return severity;
}
