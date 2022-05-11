#!/usr/bin/node

const args = process.argv.slice(2);
const diffFilePath = args[0];
const commentsPath = args[1];

const rejectTreshold = args.length > 2 ? args[2] : undefined;
const approveThreshold = args.length > 3 ? args[3] : undefined;

const fs = require("fs");

let diffData;
let comments;
try {
    diffData = fs.readFileSync(diffFilePath, "utf8");
    comments = JSON.parse(fs.readFileSync(commentsPath, 'utf8'));
} catch (err) {
    console.error(err);
}

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
    let lines = diffData.split("\n");
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
                console.log(`new file ${currentFileName}`);
                return;
            }
        }
        if (isHunkHeader(oneLine)) {
            currentLineNumber = getStartLineNumber(oneLine);
            insideHunkHeader = false;
            console.log(`starting hunk at line ${currentLineNumber}`);
            return;
        }
        if (insideHunkHeader) {
            console.log('inside hunk header');
            return;
        }
        if (isRemovedLine(oneLine)) {
            positionOffset++;
            console.log(`deleted line, not incresing line, but offset now ${positionOffset}`);
            return;
        }
        let lineMap = lineToPositionMaps.has(currentFileName) ? lineToPositionMaps.get(currentFileName) : new Map();
        lineMap.set(currentLineNumber++, positionOffset++);
        console.log(`unchanged or new line ${currentLineNumber} ${positionOffset}`);
        lineToPositionMaps.set(currentFileName, lineMap);

    });
    return lineToPositionMaps;
}

function filterAndTranslatePositionReviewComments(allComments, positionMaps) {
    let relevantComments = [];

    allComments.forEach((comment) => {
        console.log(comment);
        let line = parseInt(comment.position);
        let filename = comment.path;
        if (!positionMaps.has(filename)) {
            console.warn(`${filename} not in git diff`);
            return;
        }
        let lineToPosition = positionMaps.get(filename);
        console.log(lineToPosition);
        if (!lineToPosition.has(line)) {
            console.warn(`line ${line} is not in git diff for ${filename}`);
            return;
        }
        comment.position = lineToPosition.get(line);
        relevantComments.push(comment);
    });
    return relevantComments;
}

comments = filterAndTranslatePositionReviewComments(comments, getPositionOffsetMap(diffData));

let commentCount = 0;
let mostSevere = 0;
let needsRework = 0;
comments.forEach((comment) => {
    let severity = parseInt(comment.severity);
    commentCount++;
    if (severity < mostSevere) {
        mostSevere = severity;
    }
    if (rejectTreshold && severity <= rejectTreshold) {
        needsRework++;
    }
    delete comment.severity;
});

let reviewEvent = 'COMMENT';
let reviewText = 'Salesforce Code Analyzer did not find any rule violations';
if (approveThreshold && mostSevere > approveThreshold) {
    reviewEvent = 'APPROVE';
    if (commentCount > 0) {
        reviewText = `Maximum severity of the ${commentCount} rule violations identified by the Salesforce Code Analyzer was ${mostSevere}.`;
    }
} else if (commentCount > 0 && rejectTreshold && mostSevere <= rejectTreshold) {
    reviewEvent = 'REQUEST_CHANGES';
    reviewText = `At least ${needsRework} of the ${commentCount} rule violations identified by the Salesforce Code Analyzer require rework. Highest severity found was ${mostSevere}. `;
} else if (commentCount > 0) {
    reviewText = `Salesforce Code Analyzer identified ${commentCount} rule violations in your changes with severity as high as ${mostSevere}. `;
}

fs.writeFileSync('reviewEvent.txt', reviewEvent);
fs.writeFileSync('reviewBody.txt', reviewText);

fs.writeFileSync(commentsPath, JSON.stringify(comments));
