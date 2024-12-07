const fs = require('fs');
const path = require('path');

const [scriptName, SEARCH, HAVE, DEST] = process.argv.slice(1);
if (!SEARCH || !HAVE || !DEST) {
	console.log(`Usage: node ${path.basename(scriptName)}.js <likes_deleted.json> <MyFaveTT directory> <video output dir>`);
	process.exit(1);
}

// Load the list of deleted videos
const missingVideos = JSON.parse(fs.readFileSync(SEARCH, 'utf8'));

const fileTypes = [
	{ folder: 'covers', extension: 'jpg' },
	{ folder: 'videos', extension: 'mp4' }
];

fileTypes.forEach(({ folder }) => {
	fs.mkdirSync(path.join(DEST, folder), { recursive: true });
});

global.window = {};

// Extract missing videos from db_videos.js
require(path.join(HAVE, 'data/.appdata/db_videos.js'));
const rawDbv = window.dbv;
const parsedDbv = JSON.parse(rawDbv);
const missingVideoData = Object.fromEntries(
	Object.entries(parsedDbv).filter(([key]) => missingVideos.includes(key))
);
fs.writeFileSync(path.join(DEST, 'missing_videos.json'), JSON.stringify(missingVideoData, null, 2), 'utf8');

// Step 2: Extract missing descriptions from db_texts.js
require(path.join(HAVE, 'data/.appdata/db_texts.js'));
const rawDbt = window.dbvd;
const parsedDbt = JSON.parse(rawDbt);
const missingDescriptions = Object.fromEntries(
	Object.entries(parsedDbt).filter(([key]) => missingVideos.includes(key))
);
fs.writeFileSync(path.join(DEST, 'missing_descriptions.json'), JSON.stringify(missingDescriptions, null, 2), 'utf8');

// Step 3: Extract missing authors from db_authors.js
require(path.join(HAVE, 'data/.appdata/db_authors.js'));
const rawDba = window.dba;
const parsedDba = JSON.parse(rawDba);

// Build `authorId` list from missing videos
const missingAuthorIds = Array.from(
	new Set(Object.values(missingVideoData).map(video => video.authorId))
);

// Extract author data for missing authorIds
const missingAuthors = Object.fromEntries(
	Object.entries(parsedDba).filter(([key]) => missingAuthorIds.includes(key))
);
fs.writeFileSync(path.join(DEST, 'missing_authors.json'), JSON.stringify(missingAuthors, null, 2), 'utf8');

// Copy found video files
missingVideos.forEach(videoId => {
	fileTypes.forEach(({ folder, extension }) => {
		const sourceFile = path.join(HAVE, `data/Likes/${folder}/${videoId}.${extension}`);
		const targetFile = path.join(DEST, folder, `${videoId}.${extension}`);

		if (fs.existsSync(sourceFile)) {
			fs.copyFileSync(sourceFile, targetFile);
			console.warn(`Found ${extension}: ${videoId}`);
	}
	});
});

const tarFileName = 'found_videos.tar';
console.log(`Run:\ttar -cf found_videos.tar -C ${DEST} .`);
