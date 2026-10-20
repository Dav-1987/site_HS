import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// An idle connection dropped by the server — PostgreSQL restarting after an
// automatic security update does it every few weeks. The pool discards that
// connection and opens a new one on the next query, so this is news, not a
// failure; logging the whole error also dumped the client object, ~100 lines.
pool.on('error', (err) => console.error(`PostgreSQL pool error: ${err.message}`));

export default pool;
