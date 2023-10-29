const fs = require('fs');

module.exports = {
	readDiff: function (diffPath) {
		return fs.readFileSync(diffPath, 'utf8');
	},
	readIssues: function (issuesPath) {
		let analyserIssues;
		try {
			analyserIssues = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
			if (!Array.isArray(analyserIssues)) {
				analyserIssues = [];
			}
		} catch (err) {
			analyserIssues = [];
		}
		return analyserIssues;
	}
};
