// Stores and retrieves the site's editable content (hero text, services,
// projects, about, contact info, admin passcode) using Netlify Blobs.
// No setup needed beyond deploying this function — Netlify Blobs works
// automatically on any Netlify site. Written as a V2 function so Blobs
// credentials are injected automatically at runtime.
//
// Optional environment variable:
//   ADMIN_DEFAULT_PASSCODE — used as the admin login passcode until one
//   is set from the admin panel (Account tab). If unset, the site falls
//   back to the hardcoded default "admin123" on the client side. Set
//   this in Netlify under Site configuration -> Environment variables
//   so the site never goes live with the public default.

import { getStore } from '@netlify/blobs';

export default async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const store = getStore('ml-resources-content');

    if (req.method === 'GET') {
      const key = new URL(req.url).searchParams.get('key');
      if (!key) {
        return new Response(JSON.stringify({ error: 'missing key' }), { status: 400, headers });
      }
      let value = await store.get(key);
      if (!value && key === 'admin-auth' && process.env.ADMIN_DEFAULT_PASSCODE) {
        value = process.env.ADMIN_DEFAULT_PASSCODE;
      }
      return new Response(JSON.stringify({ value: value || null }), { status: 200, headers });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (!body.key) {
        return new Response(JSON.stringify({ error: 'missing key' }), { status: 400, headers });
      }
      await store.set(body.key, body.value);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
