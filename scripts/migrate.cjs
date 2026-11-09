/* Apply immutable SQL files atomically, under a database-wide advisory lock. */
const { readFile, readdir } = require('node:fs/promises');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { Client } = require('pg');
require('dotenv').config({ quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatoria');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock(405026001)');
    locked = true;
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name TEXT PRIMARY KEY, checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const directory = join(__dirname, '../database/migrations');
    const files = (await readdir(directory))
      .filter((name) => name.endsWith('.sql'))
      .sort();
    const { rows } = await client.query(
      'SELECT name, checksum FROM public.schema_migrations',
    );
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));
    for (const name of applied.keys()) {
      if (!files.includes(name))
        throw new Error(`Migración aplicada ausente: ${name}`);
    }
    let pendingSeen = false;
    const pending = [];
    const versions = new Set();
    for (const name of files) {
      if (!/^\d{4,}_[a-z0-9_]+\.sql$/.test(name))
        throw new Error(`Nombre inválido: ${name}`);
      const version = name.split('_')[0];
      if (versions.has(version))
        throw new Error(`Versión duplicada: ${version}`);
      versions.add(version);
      const sql = (await readFile(join(directory, name), 'utf8')).replace(
        /^\uFEFF/,
        '',
      );
      const checksum = createHash('sha256')
        .update(sql.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'))
        .digest('hex');
      if (applied.has(name)) {
        if (pendingSeen)
          throw new Error(`Migración nueva fuera de orden: ${name}`);
        if (applied.get(name) !== checksum)
          throw new Error(`Migración aplicada modificada: ${name}`);
        continue;
      }
      pendingSeen = true;
      pending.push({ name, sql, checksum });
    }
    for (const { name, sql, checksum } of pending) {
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)',
          [name, checksum],
        );
        await client.query('COMMIT');
        console.log(`Aplicada: ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock(405026001)');
    } finally {
      await client.end();
    }
  }
}

main().catch((error) => {
  // Avoid printing driver errors containing credentials or SQL values.
  console.error(
    `No se pudieron aplicar las migraciones (${error.code || 'revisar esquema e historial'}).`,
  );
  process.exitCode = 1;
});
