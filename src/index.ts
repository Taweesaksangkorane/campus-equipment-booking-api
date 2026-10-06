import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

type Booking = { id: string; equipmentId: string; borrowerName: string; startAt: string; endAt: string; purpose: string };
type Input = Omit<Booking, 'id'>;
const fields = ['equipmentId', 'borrowerName', 'startAt', 'endAt', 'purpose'] as const;
const app = new Hono<{ Bindings: { DB: D1Database } }>();
app.use('/api/*', bodyLimit({ maxSize: 16 * 1024, onError: c => c.json({ error: 'Request body exceeds 16 KiB' }, 400) }));

function validate(value: unknown, partial: boolean): Partial<Input> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Body must be a JSON object');
  const body = value as Record<string, unknown>;
  if (!Object.keys(body).length) throw new Error('Body must not be empty');
  if (Object.keys(body).some(k => !fields.includes(k as typeof fields[number]))) throw new Error('Unknown booking field');
  const result: Partial<Input> = {};
  for (const key of fields) {
    if (!(key in body)) {
      if (!partial) throw new Error(`${key} is required`);
      continue;
    }
    const v = body[key];
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${key} must be a nonblank string`);
    if (key === 'startAt' || key === 'endAt') {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v) {
        throw new Error(`${key} must be a valid UTC timestamp such as 2026-10-20T09:00:00.000Z`);
      }
      result[key] = v;
    } else {
      const max = key === 'purpose' ? 1000 : key === 'borrowerName' ? 200 : 100;
      if (v.trim().length > max) throw new Error(`${key} exceeds ${max} characters`);
      result[key] = v.trim();
    }
  }
  return result;
}

app.get('/', c => c.json({ name: 'Campus Equipment Booking API', api: '/api' }));
app.get('/api/equipment', async c => c.json((await c.env.DB.prepare('SELECT id, name, location FROM equipment ORDER BY id').all()).results));
app.get('/api/bookings', async c => c.json((await c.env.DB.prepare('SELECT * FROM bookings ORDER BY startAt, id').all<Booking>()).results));
app.get('/api/bookings/:id', async c => {
  const row = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(c.req.param('id')).first<Booking>();
  return row ? c.json(row) : c.json({ error: 'Booking not found' }, 404);
});

app.on(['POST', 'PATCH'], ['/api/bookings', '/api/bookings/:id'], async c => {
  const partial = c.req.method === 'PATCH';
  // Only contract-defined method/path combinations are accepted.
  const id = c.req.param('id');
  if ((partial && !id) || (!partial && id)) return c.json({ error: 'Route not found' }, 404);
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('Content-Type') ?? '')) return c.json({ error: 'Content-Type must be application/json' }, 400);
  const old = partial ? await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first<Booking>() : null;
  if (partial && !old) return c.json({ error: 'Booking not found' }, 404);
  let input: Input;
  let changes: Partial<Input>;
  try {
    changes = validate(await c.req.json(), partial);
    input = { ...old, ...changes } as Input;
    if (input.startAt >= input.endAt) throw new Error('startAt must be before endAt');
  } catch (error) {
    return c.json({ error: error instanceof SyntaxError ? 'Invalid JSON body' : (error as Error).message }, 400);
  }
  const equipment = await c.env.DB.prepare('SELECT id FROM equipment WHERE id = ?').bind(input.equipmentId).first();
  if (!equipment) return c.json({ error: 'equipmentId does not exist' }, 400);
  const values = [input.equipmentId, input.borrowerName, input.startAt, input.endAt, input.purpose];
  const row = partial
    ? await c.env.DB.prepare('UPDATE bookings SET equipmentId = COALESCE(?, equipmentId), borrowerName = COALESCE(?, borrowerName), startAt = COALESCE(?, startAt), endAt = COALESCE(?, endAt), purpose = COALESCE(?, purpose) WHERE id = ? RETURNING *').bind(...fields.map(key => changes[key] ?? null), id).first<Booking>()
    : await c.env.DB.prepare('INSERT INTO bookings (equipmentId, borrowerName, startAt, endAt, purpose, id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *').bind(...values, crypto.randomUUID()).first<Booking>();
  if (!row) return c.json({ error: 'Booking not found' }, 404);
  return c.json(row, partial ? 200 : 201);
});

app.delete('/api/bookings/:id', async c => {
  const row = await c.env.DB.prepare('DELETE FROM bookings WHERE id = ? RETURNING id').bind(c.req.param('id')).first();
  return row ? c.body(null, 204) : c.json({ error: 'Booking not found' }, 404);
});
app.notFound(c => c.json({ error: 'Route not found' }, 404));
app.onError((error, c) => {
  if (error.message.includes('BOOKING_CONFLICT')) return c.json({ error: 'Equipment is already booked during this time' }, 409);
  if (error.message.includes('CHECK constraint failed')) return c.json({ error: 'Booking data violates validation rules; startAt must be before endAt' }, 400);
  if (error.message.includes('FOREIGN KEY constraint failed')) return c.json({ error: 'equipmentId does not exist' }, 400);
  console.error(error);
  return c.json({ error: 'Internal server error' }, 500);
});
export default app;
