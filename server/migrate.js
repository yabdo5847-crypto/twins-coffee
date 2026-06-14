const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
(async () => {
  const db = await open({filename: path.join(__dirname, '../data/twins_coffee.db'), driver: sqlite3.Database});
  try {
    await db.exec('ALTER TABLE categories ADD COLUMN image TEXT DEFAULT ""');
    console.log('Added image column');
  } catch (e) {
    console.log('Column might exist', e.message);
  }
})();
