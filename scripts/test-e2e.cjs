const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: '.env.test', quiet: true });
if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_URL) {
  console.error(
    'Configura NODE_ENV=test y DATABASE_URL en .env.test o en la sesión. Usa una base exclusiva de pruebas.',
  );
  process.exitCode = 1;
} else {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('jest/bin/jest'),
      '--config',
      'test/jest-e2e.json',
      ...process.argv.slice(2),
    ],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );
  process.exitCode = result.status ?? 1;
}
