import { mkdir, writeFile } from 'node:fs/promises';

const payload = { equipmentId: 'eq-1', borrowerName: 'Postman Student', startAt: '2026-10-20T09:00:00.000Z', endAt: '2026-10-20T11:00:00.000Z', purpose: 'Postman API test' };
const requestBaseUrl = process.env.POSTMAN_BASE_URL || '{{baseUrl}}';
function request(name, method, path, status, body, saveId = false) {
  const tests = [`pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`];
  if (saveId) tests.push("if (pm.response.code === 201) pm.collectionVariables.set('bookingId', pm.response.json().id);");
  if (status >= 400) tests.push("pm.test('JSON error message', () => pm.expect(pm.response.json().error).to.be.a('string'));");
  return { name, request: { method, header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [], url: requestBaseUrl + path, ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } } : {}) }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }] };
}
const collection = {
  info: { name: 'Campus Equipment Booking API', description: 'Run requests in order. Requires a running local API and an empty test interval. Create stores bookingId automatically. Delete removes the test booking. Repeated create before delete returns 409.', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: process.env.POSTMAN_BASE_URL || 'http://localhost:8787/api' }, { key: 'bookingId', value: '' }],
  item: [
    request('01 Equipment — 200', 'GET', '/equipment', 200),
    request('02 Create booking — 201 (save bookingId)', 'POST', '/bookings', 201, payload, true),
    request('03 List bookings — 200', 'GET', '/bookings', 200),
    request('04 Get booking — 200', 'GET', '/bookings/{{bookingId}}', 200),
    request('05 Overlap — 409', 'POST', '/bookings', 409, { ...payload, startAt: '2026-10-20T10:00:00.000Z', endAt: '2026-10-20T12:00:00.000Z' }),
    request('06 Unknown equipment — 400', 'POST', '/bookings', 400, { ...payload, equipmentId: 'missing' }),
    request('07 Reversed time — 400', 'POST', '/bookings', 400, { ...payload, startAt: payload.endAt, endAt: payload.startAt }),
    request('08 Missing field — 400', 'POST', '/bookings', 400, { equipmentId: 'eq-1' }),
    request('09 Patch booking — 200', 'PATCH', '/bookings/{{bookingId}}', 200, { purpose: 'Updated from Postman' }),
    request('10 Delete booking — 204', 'DELETE', '/bookings/{{bookingId}}', 204),
    request('11 Get deleted booking — 404', 'GET', '/bookings/{{bookingId}}', 404),
  ],
};
await mkdir('postman', { recursive: true });
await writeFile(process.env.POSTMAN_BASE_URL ? 'postman/Campus-Equipment-Booking-Cloudflare.postman_collection.json' : 'postman/Campus-Equipment-Booking.postman_collection.json', JSON.stringify(collection, null, 2) + '\n');
console.log('Postman collection created: 11 requests');
