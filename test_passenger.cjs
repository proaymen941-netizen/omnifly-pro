const http = require('http');

// First let's check users in db to get an admin token or login
const Database = require('better-sqlite3');
const db = new Database('./artifacts/api-server/data/pos.db');
const user = db.prepare("SELECT * FROM users WHERE role = 'admin' OR role = 'مدير' LIMIT 1").get();
console.log("Found user:", user ? user.username : "none");

// Let's create a login request to get real token
const reqData = JSON.stringify({ username: user.username, password: "123" }); // let's check password or how jwt is generated
