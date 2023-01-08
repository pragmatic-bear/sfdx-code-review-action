module.exports = {
	parse: function (diff, comments) {
		return filterAndTranslatePositionReviewComments(comments, getPositionOffsetMap(diff));
	}
};

function getFileName(lineText) {
	//diff --git a/force-app/main/default/classes/MyClass.cls b/force-app/main/default/classes/MyClass.cls
	return lineText.split(' ')[3].substring(2);
}

function getStartLineNumber(lineText) {
	//@@ -35,16 +35,16 @@ private class MyClassTest {
	return parseInt(lineText.split(' ')[2].split(',')[0].substring(1));
}

function isNewHunkStart(lineText) {
	return lineText.startsWith('diff --git');
}

function isHunkHeader(lineText) {
	return lineText.startsWith('@@ ');
}

function isRemovedLine(lineText) {
	return lineText.startsWith('-');
}

function getPositionOffsetMap(diffData) {
	let currentFileName;
	let lines = diffData.split('\n');
	let positionOffset = 1;
	let currentLineNumber = 0;
	let insideHunkHeader = false;
	let lineToPositionMaps = new Map();

	lines.forEach((oneLine) => {
		if (isNewHunkStart(oneLine)) {
			let newHunkFileName = getFileName(oneLine);
			if (!currentFileName || newHunkFileName !== currentFileName) {
				//new file
				currentFileName = newHunkFileName;
				positionOffset = 1;
				insideHunkHeader = true;
				return;
			}
		}
		if (isHunkHeader(oneLine)) {
			currentLineNumber = getStartLineNumber(oneLine);
			insideHunkHeader = false;
			return;
		}
		if (insideHunkHeader) {
			return;
		}
		if (isRemovedLine(oneLine)) {
			positionOffset++;
			return;
		}
		let lineMap = lineToPositionMaps.has(currentFileName) ? lineToPositionMaps.get(currentFileName) : new Map();
		lineMap.set(currentLineNumber++, positionOffset++);
		lineToPositionMaps.set(currentFileName, lineMap);
	});
	return lineToPositionMaps;
}

function filterAndTranslatePositionReviewComments(allComments, positionMaps) {
	let relevantComments = [];
	allComments.forEach((comment) => {
		let line = parseInt(comment.position);
		let filename = comment.path;
        console.log(`comment line ${line} and fine ${comment.path} and body ${comment.body}`);
		if (!positionMaps.has(filename)) {
			console.warn(`${filename} not in git diff`);
			return;
		}
		let lineToPosition = positionMaps.get(filename);
		if (!lineToPosition.has(line)) {
			console.warn(`line ${line} is not in git diff for ${filename}`);
			return;
		}
		comment.position = lineToPosition.get(line);
		relevantComments.push(comment);
	});
    console.log(`total relevant comments ${relevantComments.length}`);
	return relevantComments;
}
