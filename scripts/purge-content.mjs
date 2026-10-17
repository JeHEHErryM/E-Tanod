/**
 * Purge synthetic/operational content from the deployed E-Tanod environment
 * while KEEPING barangays, accounts, roles and incident categories.
 *
 * Deletes: incidents, checkpoints, patrol schedules, resident reports.
 * Uses the authenticated REST API only (no DB access needed).
 *
 * Reads credentials from env:
 *   E_TANOD_API  (default https://e-tanod-production.up.railway.app/api)
 *   E_TANOD_USER (default superadmin)
 *   E_TANOD_PASS (required)
 *
 * Run (explicit confirmation required):
 *   $env:E_TANOD_PASS="..." ; node scripts/purge-content.mjs --yes
 */
const API = process.env.E_TANOD_API ?? 'https://e-tanod-production.up.railway.app/api';
const USER = process.env.E_TANOD_USER ?? 'superadmin';
const PASS = process.env.E_TANOD_PASS;
const CONFIRMED = process.argv.includes('--yes') || process.env.CONFIRM === 'yes';

if (!PASS) {
  console.error('Set E_TANOD_PASS first.');
  process.exit(1);
}
if (!CONFIRMED) {
  console.error('Refusing to run without confirmation. Re-run with --yes to purge content.');
  process.exit(1);
}

async function req(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  });
  const text = await r.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  if (!r.ok) throw new Error(`${opts.method ?? 'GET'} ${path} -> ${r.status} ${JSON.stringify(body)}`);
  return body;
}

function listOf(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

async function purgeAll(auth, label, listPath, deletePath) {
  let total = 0;
  for (;;) {
    const items = listOf(await req(`${listPath}?page=1&pageSize=100`, { headers: auth }));
    if (items.length === 0) break;
    for (const item of items) {
      await req(deletePath(item.id), { method: 'DELETE', headers: auth });
      total += 1;
    }
  }
  console.log(`  ${label}: deleted ${total}`);
  return total;
}

async function main() {
  const { accessToken } = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const auth = { Authorization: `Bearer ${accessToken}` };
  console.log('Logged in as', USER);

  let total = 0;
  total += await purgeAll(auth, 'incidents', '/incidents', (id) => `/incidents/${id}`);
  total += await purgeAll(auth, 'resident reports', '/resident-reports', (id) => `/resident-reports/${id}`);
  total += await purgeAll(auth, 'patrol schedules', '/patrol/schedules', (id) => `/patrol/schedules/${id}`);
  total += await purgeAll(auth, 'checkpoints', '/checkpoints', (id) => `/checkpoints/${id}`);

  console.log(`Purge complete. ${total} records removed. Barangays and accounts retained.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
