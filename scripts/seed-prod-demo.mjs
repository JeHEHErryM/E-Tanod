/**
 * Idempotent demo-data seed for the deployed E-Tanod environment.
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
  const createdById = {};
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
      user = await req(`/users/${user.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(patch) });
      console.log('  created account', a.username);
    } else {
      user = await req(`/users/${user.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(patch) });
      console.log('  reset demo account', a.username);
    }
    createdById[a.username] = user.id;
  }

  // --- Checkpoints ---
  const existingC = listOf(await req('/checkpoints?pageSize=100', { headers: auth }));
  const cpByCode = new Map(existingC.map((c) => [c.code, c]));
  const checkpointDefs = [
    { code: 'CP-001', name: 'Barangay Hall', barangay: 'PAYOM', lat: CENTER_LAT + 0.0012, lng: CENTER_LNG + 0.0023, radius: 40 },
    { code: 'CP-002', name: 'Port Tayamaan', barangay: 'TAYAM', lat: CENTER_LAT, lng: CENTER_LNG + 0.0072, radius: 60 },
    { code: 'CP-003', name: 'Poblacion Market Gate', barangay: 'POB02', lat: CENTER_LAT + 0.0007, lng: CENTER_LNG + 0.0001, radius: 30 },
  ];
  for (const c of checkpointDefs) {
    if (cpByCode.has(c.code)) continue;
    const barangay = [...bById.values()].find((b) => b.code === c.barangay);
    await req('/checkpoints', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        code: c.code,
        name: c.name,
        description: 'DEMO checkpoint for the defense demo.',
        latitude: c.lat,
        longitude: c.lng,
        radiusMeters: c.radius,
        barangayId: barangay.id,
      }),
    });
    console.log('  created checkpoint', c.code);
  }

  // --- Incidents (geo data for map + heatmap) ---
  const existingI = listOf(await req('/incidents?pageSize=100', { headers: auth }));
  const haveDesc = new Set(existingI.map((i) => i.description.trim().toLowerCase()));

  const categories = listOf(await req('/incidents/categories', { headers: auth }));
  const cat = (code) => categories.find((c) => c.code === code)?.id;

  // login as resident for RESIDENT-sourced reports
  let residentAuth = auth;
  try {
    const r = await req('/auth/login', { method: 'POST', body: JSON.stringify({ username: 'resident1', password: DEMO_PASS }) });
    residentAuth = { Authorization: `Bearer ${r.accessToken}` };
  } catch {
    /* fall back to superadmin */
  }

  const samples = [
    { code: 'THEFT', desc: 'Reported a snatching attempt near the public market.', b: 'PAYOM', dLat: -0.002, dLng: 0.001, anon: false, viaResident: false },
    { code: 'NOISE', desc: 'Loud videoke sound after 11pm.', b: 'POB02', dLat: 0.0005, dLng: -0.0002, anon: true, viaResident: false },
    { code: 'EMERGENCY', desc: 'Possible gas leak near the port area.', b: 'TAYAM', dLat: -0.0015, dLng: 0.006, anon: false, viaResident: false },
    { code: 'ASSAULT', desc: 'Minor altercation outside a sari-sari store.', b: 'POB05', dLat: -0.001, dLng: -0.002, anon: true, viaResident: false },
    { code: 'SUSPICIOUS', desc: 'Unattended vehicle circling the barangay hall at night.', b: 'BALAN', dLat: 0.003, dLng: -0.002, anon: false, viaResident: false },
    { code: 'TRAFFIC', desc: 'Road accident at the highway junction, no injuries.', b: 'FATII', dLat: -0.005, dLng: 0.003, anon: false, viaResident: true },
    { code: 'THEFT', desc: 'Lost motorbike reported missing from the parking area.', b: 'TALAB', dLat: -0.009, dLng: -0.003, anon: false, viaResident: false },
    { code: 'EMERGENCY', desc: 'Fire alarm near the school grounds.', b: 'POB07', dLat: 0.0006, dLng: -0.0004, anon: false, viaResident: true },
    { code: 'NOISE', desc: 'Continuous barking / stray dogs at the residential area.', b: 'TANGK', dLat: -0.006, dLng: -0.006, anon: true, viaResident: false },
    { code: 'ASSAULT', desc: 'Report of a fight during the fiesta gathering.', b: 'POB01', dLat: 0.0, dLng: 0.0, anon: false, viaResident: false },
    { code: 'TRAFFIC', desc: 'Tricycle collision near the plaza.', b: 'POB03', dLat: -0.0003, dLng: -0.0001, anon: false, viaResident: false },
    { code: 'SUSPICIOUS', desc: 'Loitering near the waterfront at dusk.', b: 'TAYAM', dLat: 0.001, dLng: 0.008, anon: true, viaResident: true },
  ];
  let createdIncidents = 0;
  for (const s of samples) {
    if (haveDesc.has(s.desc.trim().toLowerCase())) continue;
    const id = cat(s.code);
    if (!id) {
      console.log('  !! category missing for', s.code);
      continue;
    }
    for (const br of bById.values()) {
      if (br.code === s.b) {
        await req('/incidents', {
          method: 'POST',
          headers: s.viaResident ? residentAuth : auth,
          body: JSON.stringify({
            categoryId: id,
            description: s.desc,
            latitude: CENTER_LAT + s.dLat,
            longitude: CENTER_LNG + s.dLng,
            barangayId: br.id,
            isAnonymous: s.anon,
          }),
        });
        createdIncidents += 1;
        break;
      }
    }
  }
  console.log(`  incidents created: ${createdIncidents} (existing: ${existingI.length})`);

  console.log('Seed complete.');
  console.log(`Demo accounts (password: ${DEMO_PASS}): barangayadmin, tanod1, tanod2, resident1`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});