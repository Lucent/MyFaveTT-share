# MyFaveTT Transfer Helper
## Request deleted TikToks you liked from others' MyFaveTT archive and insert them into yours with metadata

1. On TikTok, export your data in JSON format.
1. Set MyFaveTT to use plain text instead of Base64 database format.
1. In ./request, run `node get_missing_list.js` to create a list of your liked videos that aren't in your MyFaveTT archive.
1. Send a friend `likes_deleted.json`.
1. In ./fulfill, your friend runs `node collect_found_videos.js` against `likes_deleted.json` you sent them.
1. Friend sends you `found_videos.tar`.
1. In ./insert, run `node insert_found_videos.js` to place missing videos, covers, and metadata into your archive. 
