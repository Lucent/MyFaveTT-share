const fs = require('fs');
const path = require('path');

const [scriptName, TRANSFER_DIR, HAVE] = process.argv.slice(1);
if (!TRANSFER_DIR || !HAVE) {
	console.log(`Usage: mkdir output; tar -xf found_videos.tar -C output; node ${path.basename(scriptName)} <output/> <MyFaveTT_directory>`);
	process.exit(1);
}

const APPDATA_DIR = path.join(HAVE, 'data/.appdata');

global.window = {};
require(path.join(APPDATA_DIR, 'db_videos.js'));
require(path.join(APPDATA_DIR, 'db_texts.js'));
require(path.join(APPDATA_DIR, 'db_authors.js'));
require(path.join(APPDATA_DIR, 'db_likes.js'));

function mergeAndWrite(windowProp, missingFilePath, dbFilePath) {
	const existing = JSON.parse(window[windowProp]);
	const missing = JSON.parse(fs.readFileSync(missingFilePath, 'utf8'));
	Object.assign(existing, missing);
	const updated = `window.${windowProp}=String.raw\`${JSON.stringify(existing)}\``;
	fs.writeFileSync(dbFilePath, updated, 'utf8');
}

const MISSING_VIDEOS_PATH = path.join(TRANSFER_DIR, 'missing_videos.json');
mergeAndWrite('dbv',
	MISSING_VIDEOS_PATH,
	path.join(APPDATA_DIR, 'db_videos.js')
);

mergeAndWrite('dbvd',
	path.join(TRANSFER_DIR, 'missing_descriptions.json'),
	path.join(APPDATA_DIR, 'db_texts.js')
);

mergeAndWrite('dba',
	path.join(TRANSFER_DIR, 'missing_authors.json'),
	path.join(APPDATA_DIR, 'db_authors.js')
);

// Update db_likes (special: no merge JSON, just add IDs to array)
{
	const missingIds = Object.keys(JSON.parse(fs.readFileSync(MISSING_VIDEOS_PATH, 'utf8')));
	const existing = JSON.parse(window.db);
	const downloaded = new Set(existing.likes.downloaded);
	missingIds.forEach(id => downloaded.add(id));
	existing.likes.downloaded = Array.from(downloaded);
	const updated = `window.db=String.raw\`${JSON.stringify(existing)}\``;
	fs.writeFileSync(path.join(APPDATA_DIR, 'db_likes.js'), updated, 'utf8');
}

// Echo commands for user to restore covers/videos
const LIKES_DIR = path.join(HAVE, 'data/Likes');
console.log(`\ncp ${path.join(TRANSFER_DIR, 'covers', '*')} ${path.join(LIKES_DIR, 'covers')}`);
console.log(`cp ${path.join(TRANSFER_DIR, 'videos', '*')} ${path.join(LIKES_DIR, 'videos')}`);
