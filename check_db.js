const Database = require('better-sqlite3');
const db = new Database('eduai.db');
const columns = db.prepare("PRAGMA table_info(assignments)").all();
console.log(JSON.stringify(columns, null, 2));
