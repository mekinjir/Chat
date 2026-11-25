// Meki Global Chat - Vercel Function, tanpa database (RAM sementara)
// Catatan: state hanya dibagikan oleh koneksi/request yang mengenai instance function yang sama.
let messages = [];
let nextId = 1;

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 8192) reject(new Error('Payload terlalu besar'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch (_) { reject(new Error('JSON tidak valid')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });

  if (req.method === 'GET') {
    return send(res, 200, { ok: true, messages, count: messages.length, storage: 'memory' });
  }

  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const name = String(body.name || '').trim().slice(0, 24);
      const text = String(body.text || '').trim().slice(0, 1000);
      if (!name || !text) return send(res, 400, { ok: false, error: 'Nama dan pesan wajib diisi' });

      const now = Date.now();
      const message = { id: now * 1000 + (nextId++ % 1000), name, text, time: now };
      messages.push(message);
      if (messages.length > 100) messages = messages.slice(-100);
      return send(res, 201, { ok: true, message });
    } catch (error) {
      return send(res, 400, { ok: false, error: error.message || 'Request tidak valid' });
    }
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return send(res, 405, { ok: false, error: 'Method tidak diizinkan' });
}
