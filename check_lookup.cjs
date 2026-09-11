const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('artifacts/api-server/data/pos.db');

const qStr = "123";
const cleanQ = "123";
const likePattern = "%123%";

const orderRows = db.prepare(`
      SELECT o.*
      FROM orders o
      WHERE o.invoice_number = ?
         OR o.invoice_number = ?
         OR CAST(o.id AS TEXT) = ?
         OR CAST(o.id AS TEXT) = ?
         OR CAST(1000 + o.id AS TEXT) = ?
      ORDER BY o.created_at DESC
      LIMIT 20
    `).all(qStr, cleanQ, qStr, cleanQ, cleanQ);
console.log(orderRows);
