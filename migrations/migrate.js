let path = require('path');
(async () => {
  console.log('[migrations] started');
  await require('sql-migrations').run({
    migrationsDir: path.resolve(__dirname, 'migrations'),
    host: 'localhost',
    port: 5432,
    db: 'nftcats',
    user: 'postgres',
    password: 'postgres',
    adapter: 'pg',
  });
  console.log('[migrations] finished');
})();