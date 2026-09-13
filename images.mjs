// Stores uploaded images (project photos, license scans, the logo) as their
// own Netlify Blobs entries, separate from the site-content blob, so the
// content JSON stays small and images aren't duplicated into every save.
// Written as a V2 function so Blobs credentials are injected automatically
// at runtime, matching content.mjs.
//
// POST { dataUrl: "data:image/png;base64,...." }
//   -> { id, url }            stores the image, returns a fetchable URL
// GET  ?id=xxxxx
//   -> raw image bytes with the correct Content-Type
// DELETE ?id=xxxxx
//   -> removes a previously uploaded image

import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

export default async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  const json = { ...headers, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const store = getStore('ml-resources-images');

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const dataUrl = body.dataUrl;
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return new Response(JSON.stringify({ error: 'missing or invalid dataUrl' }), { status: 400, headers: json });
      }
      const match = dataUrl.match(/^data:([^;,]+);base64,([\s\S]*)$/);
      if (!match) {
        return new Response(JSON.stringify({ error: 'expected a base64 data URL' }), { status: 400, headers: json });
      }
      const contentType = match[1];
      const base64 = match[2];

      // basic size guard: reject anything over ~8MB of raw image data
      if (base64.length > 8 * 1024 * 1024 * 1.4) {
        return new Response(JSON.stringify({ error: 'image too large' }), { status: 413, headers: json });
      }

      const id = crypto.randomBytes(12).toString('hex');
      await store.set(id, base64);
      await store.set(id + ':type', contentType);

      return new Response(
        JSON.stringify({ id, url: '/.netlify/functions/images?id=' + id }),
        { status: 200, headers: json }
      );
    }

    if (req.method === 'GET') {
      const id = new URL(req.url).searchParams.get('id');
      if (!id) return new Response('missing id', { status: 400, headers });

      const base64 = await store.get(id, { type: 'text' });
      if (!base64) return new Response('not found', { status: 404, headers });
      const contentType = (await store.get(id + ':type', { type: 'text' })) || 'application/octet-stream';

      return new Response(Buffer.from(base64, 'base64'), {
        status: 200,
        headers: { ...headers, 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' }
      });
    }

    if (req.method === 'DELETE') {
      const id = new URL(req.url).searchParams.get('id');
      if (!id) return new Response('missing id', { status: 400, headers });
      await store.delete(id);
      await store.delete(id + ':type');
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: json });
    }

    return new Response('method not allowed', { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: json });
  }
};
