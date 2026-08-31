require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

sql`SELECT 1 as ok`
  .then(r => console.log('DB OK:', JSON.stringify(r)))
  .catch(e => console.log('DB FAIL:', e.message));
