const baseUrl = process.env.CRON_BASE_URL ?? 'http://localhost:3000';
const cronSecret = process.env.CRON_SECRET;
const intervalSeconds = Number(process.env.CRON_INTERVAL_SECONDS ?? '60');
const runOnStart = process.env.CRON_RUN_ON_START === 'true';

if (!cronSecret) {
  console.error('Missing CRON_SECRET in environment.');
  process.exit(1);
}

if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
  console.error(`Invalid CRON_INTERVAL_SECONDS: ${process.env.CRON_INTERVAL_SECONDS}`);
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/$/, '')}/api/cron/run`;

async function runCron() {
  const startedAt = new Date();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret,
        'content-type': 'application/json'
      }
    });

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    const durationMs = Date.now() - startedAt.getTime();
    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] cron/run failed (${response.status}) in ${durationMs}ms`, payload);
      return;
    }

    console.log(`[${new Date().toISOString()}] cron/run success in ${durationMs}ms`, payload);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] cron/run error`, error);
  }
}

console.log('Cron worker started.');
console.log(`- Endpoint: ${endpoint}`);
console.log(`- Interval: ${intervalSeconds}s`);
console.log(`- Run on start: ${runOnStart ? 'yes' : 'no'}`);

if (runOnStart) {
  void runCron();
}

setInterval(() => {
  void runCron();
}, intervalSeconds * 1000);
