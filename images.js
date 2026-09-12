// Stores uploaded images (project photos, license scans, the logo) as their
// own Netlify Blobs entries, separate from the site-content blob, so the
// content JSON stays small and images aren't duplicated into every save.
//
// POST { dataUrl: "data:image/png;base64,...." }
//   -> { id, url }            stores the image, returns a fetchable URL
// GET  ?id=xxxxx
//   -> raw image bytes with the correct Content-Type
// DELETE ?id=xxxxx
//   -> removes a previously uploaded image

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore('ml-resources-images');
  const json = { ...headers, 'Content-Type': 'application/json' };

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const dataUrl = body.dataUrl;
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return { statusCode: 400, headers: json, body: JSON.stringify({ error: 'missing or invalid dataUrl' }) };
      }
      const match = dataUrl.match(/^data:([^;,]+);base64,([\s\S]*)$/);
      if (!match) {
        return { statusCode: 400, headers: json, body: JSON.stringify({ error: 'expected a base64 data URL' }) };
      }
      const contentType = match[1];
      const base64 = match[2];

      // basic size guard: reject anything over ~8MB of raw image data
      if (base64.length > 8 * 1024 * 1024 * 1.4) {
        return { statusCode: 413, headers: json, body: JSON.stringify({ error: 'image too large' }) };
      }

      const id = crypto.randomBytes(12).toString('hex');
      await store.set(id, base64);
      await store.set(id + ':type', contentType);

      return {
        statusCode: 200,
        headers: json,
        body: JSON.stringify({ id, url: '/.netlify/functions/images?id=' + id })
      };
    }

    if (event.httpMethod === 'GET') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return { statusCode: 400, headers, body: 'missing id' };

      const base64 = await store.get(id, { type: 'text' });
      if (!base64) return { statusCode: 404, headers, body: 'not found' };
      const contentType = (await store.get(id + ':type', { type: 'text' })) || 'application/octet-stream';

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
        body: base64,
        isBase64Encoded: true
      };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return { statusCode: 400, headers, body: 'missing id' };
      await store.delete(id);
      await store.delete(id + ':type');
      return { statusCode: 200, headers: json, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: 'method not allowed' };
  } catch (err) {
    return { statusCode: 500, headers: json, body: JSON.stringify({ error: err.message }) };
  }
};
