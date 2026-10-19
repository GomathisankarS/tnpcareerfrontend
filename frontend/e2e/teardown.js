import mysql from '../../backend/node_modules/mysql2/promise.js';
export default async function teardown() {
  const name = process.env.E2E_DB_NAME;
  if (!/^tnp_browser_[a-f0-9]{12}_test$/.test(name))
    throw new Error('Unsafe browser test cleanup target');
  const c = await mysql.createConnection({
    host: process.env.E2E_DB_HOST || '127.0.0.1',
    port: Number(process.env.E2E_DB_PORT || 13307),
    user: process.env.E2E_DB_USER || 'root',
    password: process.env.E2E_DB_PASSWORD || ''
  });
  try {
    await c.query(`DROP DATABASE IF EXISTS \`${name}\``);
  } finally {
    await c.end();
  }
}
