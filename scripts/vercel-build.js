const { spawnSync } = require('child_process');

function run(cmd, args, opts = {}) {
  console.log('>','',cmd, ...args);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (res.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')} (exit ${res.status})`);
    process.exit(res.status);
  }
}

// 1) Prisma generate
run('npx', ['prisma', 'generate']);

// 2) Run migrations if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL detected — running migrations (prisma migrate deploy)');
  run('npx', ['prisma', 'migrate', 'deploy']);
} else {
  console.log('No DATABASE_URL — skipping prisma migrate deploy');
}

// 3) Next build
run('npx', ['next', 'build']);
