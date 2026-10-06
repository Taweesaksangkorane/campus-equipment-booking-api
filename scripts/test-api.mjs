import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://localhost:8787/api';
const evidence = [`# HTTP test evidence\n\nBase API URL: ${base}\nExecuted: ${new Date().toISOString()}\nClient: Node fetch (real HTTP requests)\n`];
const ids = [];
let count = 0;
const year = 2030 + Math.floor(Math.random() * 50);
const startAt = `${year}-10-20T09:00:00.000Z`;
const endAt = `${year}-10-20T11:00:00.000Z`;
const payload = { equipmentId: 'eq-1', borrowerName: 'HTTP Test Student', startAt, endAt, purpose: 'API verification' };

async function check(name, method, path, expected, body, verify, contentType = 'application/json') {
  const response = await fetch(base + path, {
    method, headers: body === undefined || !contentType ? {} : { 'Content-Type': contentType },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const raw = await response.text();
  evidence.push(`## ${++count}. ${name}\n\nRequest: ${method} ${path}\n\nBody: ${body === undefined ? '(none)' : typeof body === 'string' ? body : JSON.stringify(body)}\n\nExpected: ${expected}; actual: ${response.status}\n\nResponse:\n\n\`\`\`json\n${raw || '(empty)'}\n\`\`\`\n`);
  assert.equal(response.status, expected, name);
  const data = raw ? JSON.parse(raw) : null;
  if (expected >= 400) assert.equal(typeof data.error, 'string');
  if (verify) verify(data, raw);
  console.log(`PASS ${name}: ${response.status}`);
  return data;
}

try {
  await check('Equipment seed', 'GET', '/equipment', 200, undefined, rows => assert.ok(rows.length >= 2));
  const booking = await check('Create', 'POST', '/bookings', 201, payload, row => assert.equal(row.startAt, startAt));
  ids.push(booking.id);
  await check('List', 'GET', '/bookings', 200, undefined, rows => assert.ok(rows.some(row => row.id === booking.id)));
  await check('Read', 'GET', `/bookings/${booking.id}`, 200);
  await check('Missing field', 'POST', '/bookings', 400, { equipmentId: 'eq-1' });
  await check('Unknown equipment', 'POST', '/bookings', 400, { ...payload, equipmentId: 'missing' });
  await check('Reversed time', 'POST', '/bookings', 400, { ...payload, startAt: endAt, endAt: startAt });
  await check('Invalid calendar date', 'POST', '/bookings', 400, { ...payload, startAt: `${year}-02-30T09:00:00.000Z` });
  await check('Malformed JSON', 'POST', '/bookings', 400, '{');
  await check('Wrong content type', 'POST', '/bookings', 400, payload, undefined, 'text/plain');
  await check('Overlap', 'POST', '/bookings', 409, payload);
  const adjacent = await check('Adjacent interval allowed', 'POST', '/bookings', 201, { ...payload, startAt: endAt, endAt: `${year}-10-20T12:00:00.000Z` });
  ids.push(adjacent.id);
  const other = await check('Different equipment allowed', 'POST', '/bookings', 201, { ...payload, equipmentId: 'eq-2' });
  ids.push(other.id);
  await check('Partial update excludes itself', 'PATCH', `/bookings/${booking.id}`, 200, { purpose: "Student's presentation" }, row => assert.equal(row.purpose, "Student's presentation"));
  await check('Update overlap', 'PATCH', `/bookings/${adjacent.id}`, 409, { startAt });
  await check('Update equipment overlap', 'PATCH', `/bookings/${other.id}`, 409, { equipmentId: 'eq-1' });
  await check('Failed update preserved data', 'GET', `/bookings/${adjacent.id}`, 200, undefined, row => assert.equal(row.startAt, endAt));
  await check('Merged update invalid time', 'PATCH', `/bookings/${booking.id}`, 400, { endAt: startAt });
  await check('Empty update', 'PATCH', `/bookings/${booking.id}`, 400, {});
  await check('Unknown field', 'PATCH', `/bookings/${booking.id}`, 400, { id: 'tampered' });
  await check('Non-object body', 'POST', '/bookings', 400, []);
  await check('Blank borrower', 'POST', '/bookings', 400, { ...payload, borrowerName: '   ' });
  await check('Oversized body', 'POST', '/bookings', 400, { ...payload, purpose: 'x'.repeat(17000) });
  const patches = await Promise.all([{ borrowerName: 'Concurrent Student' }, { purpose: 'Concurrent purpose' }].map(body => fetch(base + '/bookings/' + booking.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })));
  assert.ok(patches.every(r => r.status === 200));
  await check('Concurrent partial edits preserved', 'GET', `/bookings/${booking.id}`, 200, undefined, row => { assert.equal(row.borrowerName, 'Concurrent Student'); assert.equal(row.purpose, 'Concurrent purpose'); });
  await check('Not found', 'GET', '/bookings/missing', 404);
  await check('Update missing', 'PATCH', '/bookings/missing', 404, { purpose: 'test' });
  await check('Unknown route JSON', 'GET', '/missing', 404);
  // Concurrent identical writes must yield exactly one success.
  const concurrentPayload = { ...payload, startAt: `${year}-11-20T09:00:00.000Z`, endAt: `${year}-11-20T11:00:00.000Z` };
  const responses = await Promise.all([1, 2].map(() => fetch(base + '/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(concurrentPayload) })));
  const results = await Promise.all(responses.map(async r => ({ status: r.status, body: await r.json() })));
  for (const result of results) if (result.status === 201) ids.push(result.body.id);
  evidence.push(`## ${++count}. Concurrent identical writes\n\nRequest: two simultaneous POST /bookings\n\nBody: ${JSON.stringify(concurrentPayload)}\n\nResults: ${JSON.stringify(results)}\n`);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  console.log('PASS Concurrent identical writes: 201 + 409');
  await check('Delete', 'DELETE', `/bookings/${booking.id}`, 204, undefined, (_, raw) => assert.equal(raw, ''));
  ids.splice(ids.indexOf(booking.id), 1);
  await check('Read deleted', 'GET', `/bookings/${booking.id}`, 404);
  await check('Delete missing', 'DELETE', `/bookings/${booking.id}`, 404);
  evidence.push(`\nResult: ${count} cases passed.\n`);
} catch (error) {
  evidence.push(`\nFAILED: ${error.message}\n`);
  process.exitCode = 1;
  console.error(error);
} finally {
  for (const id of ids) await fetch(base + '/bookings/' + id, { method: 'DELETE' });
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/HTTP_TEST_RESULTS.md', evidence.join('\n'));
}
