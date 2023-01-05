module.exports = {
	sort: function (comments, maxComments) {
        console.log(`sorting ${comments.length} and keeping max ${maxComments}`);
		comments.sort(function (a, b) {
			return a.severity < b.severity;
		});
		return comments.slice(0, maxComments);
	},
	parseExisting: function (existingComments) {
		let parsedComments = new Map();
		if (Array.isArray(existingComments) && existingComments.length > 0) {
			for (const existing of existingComments) {
				const reducedComment = {
					id: existing.id,
					body: existing.body,
					path: existing.path,
					position: existing.position
				};
				const commentKey = getKey(reducedComment);
				console.log(`existing Comment: ${commentKey}`);
				parsedComments.set(commentKey, reducedComment);
			}
		}
		return parsedComments;
	},
	filter: function (comments, existingComments) {
		let newComments = [];
		comments.forEach((element) => {
			const commentKey = getKey(element);
			console.log(`does comment ${commentKey} already exist?`);
			if (existingComments.has(commentKey)) {
				console.log('..yes');
			} else {
				console.log('..no');
				newComments.push(element);
			}
		});
		return newComments;
	}
};

function getKey(comment) {
	return comment.position + '-' + comment.path + '-' + comment.body.slice(0, 20);
}
