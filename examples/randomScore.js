const fs = require('fs');
const path = require('path');

let results = [];
let vaultDir = '/home/cvasquez/obsidian/development';
let maxResults = 20;

function accept(fullPath) {
  if (fullPath.indexOf('/.obsidian/') > 0) return false; // Exclude .obsidian dir
  if (fullPath.indexOf('/.trash/') > 0) return false; // Exclude .trash dir
  if (!fullPath.endsWith('.md')) return false;
  return true;
}

function getNotename(fullPath) {
  const trimExtension = (string) => string.split('.')[0];
  const getFileName = (string) => string.replace(/^.*[\\\/]/, '');
  return trimExtension(getFileName(fullPath));
}

const getFilesRecursively = (directory) => {
  const filesInDirectory = fs.readdirSync(directory);
  for (const file of filesInDirectory) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFilesRecursively(fullPath);
    } else if (
      results.length < maxResults &&
      accept(fullPath) &&
      Math.random() > 0.5 // Put some randomness
    ) {
      results.push({
        path: fullPath,
        name: getNotename(fullPath),
        info: {
          score: Math.random(),
        },
      });
    }
  }
};

getFilesRecursively(vaultDir);
results.sort((a, b) => (a.score < b.score ? 1 : -1));
console.log(JSON.stringify(results));
