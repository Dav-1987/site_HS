// Shared helpers for the Google Ads API scripts. Read-only usage.
// Credentials live in secrets/google-ads-credentials.json (gitignored).

import { readFile } from 'node:fs/promises';

// Google bumps the API version ~monthly. If calls start 404ing, check
// https://developers.google.com/google-ads/api/docs/release-notes and bump this.
export const API_VERSION = 'v23';

export async function loadCreds() {
  return JSON.parse(await readFile('secrets/google-ads-credentials.json', 'utf8'));
}

export async function getAccessToken({ client_id, client_secret, refresh_token }) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: 'refresh_token' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// POST to a Google Ads API endpoint. `path` is everything after the version,
// e.g. `customers/123/googleAds:searchStream`. No login-customer-id header —
// this OAuth identity has direct access to the account (see google-ads-api-setup).
export async function apiPost(creds, accessToken, path, body) {
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': creds.developer_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google Ads API error: ${JSON.stringify(data, null, 2)}`);
  return data;
}
