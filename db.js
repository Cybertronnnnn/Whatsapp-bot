const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function saveMessage(user, message) {
  const query = 'INSERT INTO messages(user_number, message_content) VALUES($1, $2)';
  await pool.query(query, [user, message]);
}

async function getMessages(user) {
  const query = 'SELECT message_content FROM messages WHERE user_number=$1 ORDER BY id ASC';
  const res = await pool.query(query, [user]);
  return res.rows.map(row => row.message_content).join('\n');
}

module.exports = { saveMessage, getMessages };
