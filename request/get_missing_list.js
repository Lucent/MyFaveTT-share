const fs = require('fs');
const path = require('path');

const [scriptName, HAVE, ALL_LIKES] = process.argv.slice(1);
if (!HAVE || !ALL_LIKES) {
	console.log(`Usage: node ${path.basename(scriptName)} <MyFaveTT directory> <TikTok export JSON>`);
	process.exit(1);
}

global.window = {};

// Load and parse db_likes.js
require(path.join(HAVE, 'data/.appdata/db_likes.js'));
const dbLikesRaw = window.db;
const dbLikes = JSON.parse(dbLikesRaw);

const downloaded = dbLikes.likes.downloaded;

// Read and parse the export JSON file
const exportData = JSON.parse(fs.readFileSync(ALL_LIKES, 'utf8'));

// Process the list
const likesDeleted = exportData.Activity['Like List'].ItemFavoriteList
	.map(item => item.Link.match(/video\/(?<id>[0-9]+)/)?.groups?.id)
	.filter(videoId => videoId && !downloaded.includes(videoId));

// Write the filtered list to likes_deleted.json
const outputPath = path.join(__dirname, 'likes_deleted.json');
fs.writeFileSync(outputPath, JSON.stringify(likesDeleted, null, 2), 'utf8');
