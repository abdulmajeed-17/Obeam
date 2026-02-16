/**
 * Run the initial ledger schema against Postgres.
 * No psql needed — uses Node + pg.
 *
 * Usage: DATABASE_URL="postgresql://..." npm run db:migrate
 * Or: create backend/.env with DATABASE_URL=...
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL. Set it in backend/.env or: DATABASE_URL="postgresql://user:pass@host:5432/db" npm run db:migrate');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'schema', '001_initial_ledger.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Schema applied: 001_initial_ledger.sql');
  } catch (err) {
    console.error('Schema run failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
