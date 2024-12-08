const fs = require('fs');
const path = require('path');

const [scriptName, SEARCH, HAVE, DEST] = process.argv.slice(1);
if (!SEARCH || !HAVE || !DEST) {
	console.log(`Usage: node ${path.basename(scriptName)}.js <likes_deleted.json> <MyFaveTT directory> <video output dir>`);
	process.exit(1);
}

// Load the list of deleted videos
let missingVideos = JSON.parse(fs.readFileSync(SEARCH, 'utf8'));

const fileTypes = [
	{ folder: 'covers', extension: 'jpg' },
	{ folder: 'videos', extension: 'mp4' }
];

fileTypes.forEach(({ folder }) => {
	fs.mkdirSync(path.join(DEST, folder), { recursive: true });
});

global.window = {};

// Collect missing videos from all sources
const collectedMissingVideos = {};
const videoSourceMapping = {};

// Step 1: Extract missing videos from db_likes.js
require(path.join(HAVE, 'data/.appdata/db_likes.js'));
const rawDbl = window.db;
const parsedDbl = JSON.parse(rawDbl);
parsedDbl.likes.downloaded.forEach(videoId => {
	if (missingVideos.includes(videoId)) {
		videoSourceMapping[videoId] = 'Likes';
		console.debug(`Found Likes/${videoId}`);
	}
});

// Step 2: Extract missing videos from db_bookmarked.js
require(path.join(HAVE, 'data/.appdata/db_bookmarked.js'));
const rawDbb = window.dbb;
const parsedDbb = JSON.parse(rawDbb);
parsedDbb.downloaded.forEach(videoId => {
	if (missingVideos.includes(videoId) && !videoSourceMapping[videoId]) {
		videoSourceMapping[videoId] = 'Favorites';
		console.debug(`Found Favorites/${videoId}`);
	}
});

// Step 3: Check for missing videos in db_following.js
require(path.join(HAVE, 'data/.appdata/db_following.js'));
const rawDbf = window.dbf;
const parsedDbf = JSON.parse(rawDbf);
Object.entries(parsedDbf.authorItems).forEach(([authorId, author]) => {
	author.inFolder.forEach(videoId => {
		if (missingVideos.includes(videoId) && !videoSourceMapping[videoId]) {
			videoSourceMapping[videoId] = `Following/${authorId}`;
			console.debug(`Found Following/${authorId}/${videoId}`);
		}
	});
});

// Step 4: Extract full metadata from db_videos.js after determining sources
require(path.join(HAVE, 'data/.appdata/db_videos.js'));
const rawDbv = window.dbv;
const parsedDbv = JSON.parse(rawDbv);
Object.entries(parsedDbv).forEach(([key, value]) => {
	if (videoSourceMapping[key])
		collectedMissingVideos[key] = value; // Full metadata
});

missingVideos = Object.keys(videoSourceMapping);

// Save combined missing videos data
fs.writeFileSync(path.join(DEST, 'missing_videos.json'), JSON.stringify(collectedMissingVideos, null, 2), 'utf8');

// Step 5: Extract missing descriptions from db_texts.js
require(path.join(HAVE, 'data/.appdata/db_texts.js'));
const rawDbt = window.dbvd;
const parsedDbt = JSON.parse(rawDbt);
const missingDescriptions = Object.fromEntries(
	Object.entries(parsedDbt).filter(([key]) => missingVideos.includes(key))
);
fs.writeFileSync(path.join(DEST, 'missing_descriptions.json'), JSON.stringify(missingDescriptions, null, 2), 'utf8');

// Step 6: Extract missing authors from db_authors.js
require(path.join(HAVE, 'data/.appdata/db_authors.js'));
const rawDba = window.dba;
const parsedDba = JSON.parse(rawDba);

// Build `authorId` list from collected missing videos
const missingAuthorIds = Array.from(
	new Set(Object.values(collectedMissingVideos).map(video => video.authorId).filter(Boolean))
);

// Extract author data for missing authorIds
const missingAuthors = Object.fromEntries(
	Object.entries(parsedDba).filter(([key]) => missingAuthorIds.includes(key))
);
fs.writeFileSync(path.join(DEST, 'missing_authors.json'), JSON.stringify(missingAuthors, null, 2), 'utf8');

// Copy found video files
missingVideos.forEach(videoId => {
	fileTypes.forEach(({ folder, extension }) => {
		const sourceDir = videoSourceMapping[videoId];
		const sourceFile = path.join(HAVE, `data/${sourceDir}/${folder}/${videoId}.${extension}`);
		const targetFile = path.join(DEST, folder, `${videoId}.${extension}`);

		if (fs.existsSync(sourceFile)) {
			fs.copyFileSync(sourceFile, targetFile);
			console.warn(`Found ${sourceDir}/${folder}/${videoId}.${extension}`);
		} else
			console.error(`Missing ${sourceDir}/${folder}/${videoId}.${extension}`);
	});
});

const tarFileName = 'found_videos.tar';
console.log(`Run:\ttar -cf ${tarFileName} -C ${DEST} .`);
