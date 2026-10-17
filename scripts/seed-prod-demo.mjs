/**
 * Idempotent BASE seed for the deployed E-Tanod environment.
 *
 * Provisions only the essentials the system needs to operate: the Mamburao
 * barangays and the demo accounts. It intentionally creates NO synthetic
 * operational data (checkpoints, patrol schedules, incidents) so the deployed
 * system runs on real data entered through the app.
 *
 * Uses the public/authenticated REST API only (no DB access needed).
 * Reads credentials from env so no secrets are committed:
 *   E_TANOD_API  (default https://e-tanod-production.up.railway.app/api)
 *   E_TANOD_USER (default superadmin)
 *   E_TANOD_PASS (required)
 *   E_TANOD_DEMO_PASS (default Demo123!)
 *
 * Run:
 *   $env:E_TANOD_PASS="..." ; node scripts/seed-prod-demo.mjs
 */
const API = process.env.E_TANOD_API ?? 'https://e-tanod-production.up.railway.app/api';
const USER = process.env.E_TANOD_USER ?? 'superadmin';
const PASS = process.env.E_TANOD_PASS;
const DEMO_PASS = process.env.E_TANOD_DEMO_PASS ?? 'Demo123!';

if (!PASS) {
  console.error('Set E_TANOD_PASS first.');
  process.exit(1);
}

const BARANGAYS = [
  { name: 'Balansay', code: 'BALAN', desc: 'Rural barangay in the north of Mamburao.', dLat: 0.004, dLng: -0.002 },
  { name: 'Fatima (Tii)', code: 'FATII', desc: 'Rural barangay along the national highway.', dLat: -0.006, dLng: 0.004 },
  { name: 'Payompon', code: 'PAYOM', desc: 'Most populous urban barangay; PSA office area.', dLat: 0.001, dLng: 0.002 },
  { name: 'San Luis (Ligang)', code: 'SNLUI', desc: 'Rural barangay inland from the town center.', dLat: 0.008, dLng: -0.001 },
  { name: 'Talabaan', code: 'TALAB', desc: 'Rural barangay bordering the Mindoro Strait coast.', dLat: -0.01, dLng: -0.004 },
  { name: 'Tangkalan', code: 'TANGK', desc: 'Rural barangay with residential areas.', dLat: -0.005, dLng: -0.006 },
  { name: 'Tayamaan', code: 'TAYAM', desc: 'Seaside barangay hosting the port and big vessels.', dLat: 0.0, dLng: 0.007 },
  { name: 'Poblacion 1', code: 'POB01', desc: 'Town center barangay.', dLat: 0.0003, dLng: -0.0004 },
  { name: 'Poblacion 2', code: 'POB02', desc: 'Town center barangay.', dLat: 0.0006, dLng: 0.0002 },
  { name: 'Poblacion 3', code: 'POB03', desc: 'Town center barangay.', dLat: -0.0002, dLng: -0.0002 },
  { name: 'Poblacion 4', code: 'POB04', desc: 'Town center barangay.', dLat: -0.0005, dLng: 0.0005 },
  { name: 'Poblacion 5', code: 'POB05', desc: 'Town center barangay.', dLat: 0.0001, dLng: -0.0007 },
  { name: 'Poblacion 6', code: 'POB06', desc: 'Town center barangay.', dLat: -0.0004, dLng: -0.0001 },
  { name: 'Poblacion 7', code: 'POB07', desc: 'Urban barangay.', dLat: 0.0007, dLng: -0.0003 },
  { name: 'Poblacion 8', code: 'POB08', desc: 'Urban barangay.', dLat: 0.0009, dLng: 0.0006 },
];
const CENTER_LAT = 13.2231;
const CENTER_LNG = 120.596;

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

async function main() {
  const { accessToken } = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const auth = { Authorization: `Bearer ${accessToken}` };
  console.log('Logged in as', USER);

  // --- Barangays ---
  const existingB = listOf(await req('/barangays', { headers: auth }));
  const byCode = new Map(existingB.map((b) => [b.code, b]));
  for (const b of BARANGAYS) {
    if (byCode.has(b.code)) continue;
    await req('/barangays', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ name: b.name, code: b.code, description: b.desc, latitude: CENTER_LAT + b.dLat, longitude: CENTER_LNG + b.dLng }),
    });
    console.log('  created barangay', b.name);
  }
  const barangays = listOf(await req('/barangays', { headers: auth }));
  const bById = new Map(barangays.map((b) => [b.id, b]));
  console.log(`Barangays: ${barangays.length} total`);

  // --- Demo accounts ---
  const accounts = [
    { username: 'barangayadmin', fullName: 'Barangay Admin Payompon', role: 'BARANGAY_ADMIN', barangay: 'PAYOM' },
    { username: 'tanod1', fullName: 'Tanod Romeo Santos', role: 'TANOD', barangay: 'POB02' },
    { username: 'tanod2', fullName: 'Tanod Miguel De Guzman', role: 'TANOD', barangay: 'TAYAM' },
    { username: 'resident1', fullName: 'Maria Clara', role: 'RESIDENT', barangay: 'BALAN' },
  ];
  for (const a of accounts) {
    const existing = listOf(await req(`/users?search=${encodeURIComponent(a.username)}&pageSize=50`, { headers: auth }));
    let user = existing.find((u) => u.username === a.username);
    const barangay = [...bById.values()].find((b) => b.code === a.barangay);
    if (!barangay) throw new Error(`Missing barangay ${a.barangay}`);
    // Enforce a known demo password + verified/active state + barangay assignment
    // so every demo account is usable at the defense.
    const patch = {
      isVerified: true,
      isActive: true,
      barangayId: barangay.id,
      password: DEMO_PASS,
    };
    if (!user) {
      user = await req('/users', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          username: a.username,
          password: DEMO_PASS,
          fullName: a.fullName,
          primaryRole: a.role,
          roles: [a.role],
          barangayId: barangay.id,
        }),
      });
      await req(`/users/${user.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(patch) });
      console.log('  created account', a.username);
    } else {
      await req(`/users/${user.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(patch) });
      console.log('  reset demo account', a.username);
    }
  }

  console.log('Base seed complete.');
  console.log(`Demo accounts (password: ${DEMO_PASS}): barangayadmin, tanod1, tanod2, resident1`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
