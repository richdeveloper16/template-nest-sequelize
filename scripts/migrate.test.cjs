const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, 'migrate.cjs'), 'utf8');
const checksum = (sql) => createHash('sha256').update(sql).digest('hex');

async function run({
  files = { '0001_initial.sql': 'CREATE TABLE example (id INT);' },
  applied = [],
  failSql = false,
} = {}) {
  const calls = [];
  const errors = [];
  const fakeProcess = {
    env: { DATABASE_URL: 'postgresql://localhost/test' },
    exitCode: 0,
  };
  const client = {
    connect: async () => {},
    end: async () => {
      calls.push('END CONNECTION');
    },
    query: async (sql, params) => {
      calls.push(sql.trim());
      if (sql.startsWith('SELECT name')) return { rows: applied };
      if (sql.startsWith('INSERT INTO'))
        applied.push({ name: params[0], checksum: params[1] });
      if (failSql && Object.values(files).includes(sql))
        throw Object.assign(new Error('private database details'), {
          code: 'TEST_FAILURE',
        });
      return { rows: [] };
    },
  };
  const context = {
    __dirname,
    process: fakeProcess,
    console: { log() {}, error: (message) => errors.push(message) },
    require: (name) => {
      if (name === 'pg')
        return {
          Client: function () {
            return client;
          },
        };
      if (name === 'dotenv') return { config() {} };
      if (name === 'node:fs/promises')
        return {
          readdir: async () => Object.keys(files),
          readFile: async (path) => files[require('node:path').basename(path)],
        };
      return require(name);
    },
  };
  // Capture completion without changing the CLI's production entry point.
  const completion = vm.runInNewContext(
    source.replace('main().catch', 'globalThis.completion = main().catch'),
    context,
  );
  await completion;
  return { calls, errors, applied, exitCode: fakeProcess.exitCode };
}

test('applies and records a migration inside a transaction', async () => {
  const result = await run();
  assert.equal(result.exitCode, 0);
  const begin = result.calls.indexOf('BEGIN');
  const ddl = result.calls.indexOf('CREATE TABLE example (id INT);');
  const commit = result.calls.indexOf('COMMIT');
  assert.ok(begin < ddl && ddl < commit);
  assert.equal(result.applied.length, 1);
  assert.ok(result.calls.includes('SELECT pg_advisory_unlock(405026001)'));
  assert.equal(result.calls.at(-1), 'END CONNECTION');
});

test('a second run skips previously applied migrations', async () => {
  const applied = [
    {
      name: '0001_initial.sql',
      checksum: checksum('CREATE TABLE example (id INT);'),
    },
  ];
  const result = await run({ applied });
  assert.equal(result.exitCode, 0);
  assert.ok(!result.calls.includes('BEGIN'));
});

test('rejects edited, deleted and out-of-order history', async () => {
  for (const options of [
    { applied: [{ name: '0001_initial.sql', checksum: 'changed' }] },
    { applied: [{ name: '0002_removed.sql', checksum: 'missing' }] },
    {
      files: { '0001_initial.sql': 'new', '0002_existing.sql': 'old' },
      applied: [{ name: '0002_existing.sql', checksum: checksum('old') }],
    },
  ]) {
    const result = await run(options);
    assert.equal(result.exitCode, 1);
    assert.ok(!result.calls.includes('BEGIN'));
    assert.equal(result.calls.at(-1), 'END CONNECTION');
  }
});

test('rolls back failures and releases the database lock without exposing details', async () => {
  const result = await run({ failSql: true });
  assert.equal(result.exitCode, 1);
  assert.ok(result.calls.includes('ROLLBACK'));
  assert.ok(!result.calls.includes('COMMIT'));
  assert.equal(result.applied.length, 0);
  assert.ok(result.calls.includes('SELECT pg_advisory_unlock(405026001)'));
  assert.ok(!result.errors.join('').includes('private database details'));
});

test('rejects duplicate migration versions before changing the schema', async () => {
  const result = await run({
    files: { '0001_first.sql': 'first', '0001_second.sql': 'second' },
  });
  assert.equal(result.exitCode, 1);
  assert.ok(!result.calls.includes('BEGIN'));
});
