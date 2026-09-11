// Stores and retrieves the site's editable content (hero text, services,
// projects, about, contact info, admin passcode) using Netlify Blobs.
// No setup needed beyond deploying this function — Netlify Blobs works
// automatically on any Netlify site.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore('ml-resources-content');

  try {
    if (event.httpMethod === 'GET') {
      const key = event.queryStringParameters && event.queryStringParameters.key;
      if (!key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing key' }) };
      }
      const value = await store.get(key);
      return { statusCode: 200, headers, body: JSON.stringify({ value: value || null }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing key' }) };
      }
      await store.set(body.key, body.value);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
