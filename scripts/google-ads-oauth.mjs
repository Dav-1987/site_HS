// One-time local OAuth flow to get a Google Ads API refresh token.
//
// Usage:
//   node scripts/google-ads-oauth.mjs [path-to-client-secret.json]
//
// Defaults to secrets/google-ads-client.json (gitignored). Put the JSON file
// downloaded from Google Cloud Console → Google Auth Platform → Clients there.
//
// Opens an auth URL you visit in your browser (signed in as the test user
// added in Audience → Test users), then catches the redirect on localhost,
// exchanges the code for tokens, and writes the refresh token to
// secrets/google-ads-refresh-token.json (gitignored).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { exec } from 'node:child_process';

const clientSecretPath = process.argv[2] ?? 'secrets/google-ads-client.json';
const SCOPE = 'https://www.googleapis.com/auth/adwords';
const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}`;

const raw = JSON.parse(await readFile(clientSecretPath, 'utf8'));
const creds = raw.installed ?? raw.web ?? raw;
const { client_id: clientId, client_secret: clientSecret } = creds;
if (!clientId || !clientSecret) {
  throw new Error(`Could not find client_id/client_secret in ${clientSecretPath}`);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    res.end(
      error
        ? `Authorization failed: ${error}. You can close this tab.`
        : 'Authorization received — you can close this tab and return to the terminal.',
    );
    server.close();
    if (error) reject(new Error(error));
    else resolve(code);
  });
  server.listen(PORT, () => {
    console.log('Open this URL and sign in as the test user:\n');
    console.log(authUrl.toString());
    console.log(`\nWaiting for redirect on ${REDIRECT_URI} ...`);
    const opener = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${opener} "${authUrl.toString()}"`, () => {});
  });
});

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  }),
});
const tokens = await tokenRes.json();
if (!tokenRes.ok) {
  throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);
}
if (!tokens.refresh_token) {
  throw new Error(
    'No refresh_token in response — Google only issues one on first consent. ' +
      'Revoke prior access at myaccount.google.com/permissions and re-run.',
  );
}

await mkdir('secrets', { recursive: true });
const outPath = 'secrets/google-ads-refresh-token.json';
await writeFile(
  outPath,
  JSON.stringify({ client_id: clientId, client_secret: clientSecret, refresh_token: tokens.refresh_token }, null, 2),
);
console.log(`\nSaved refresh token to ${outPath}`);

// google-ads-lib.mjs reads google-ads-credentials.json, not the file above —
// that one also holds the developer token and customer id. Without this the
// report scripts would keep presenting the token that was just replaced and
// fail with `invalid_grant`, which reads like the new token never worked.
const credsPath = 'secrets/google-ads-credentials.json';
try {
  const existing = JSON.parse(await readFile(credsPath, 'utf8'));
  await writeFile(
    credsPath,
    JSON.stringify({ ...existing, refresh_token: tokens.refresh_token }, null, 2),
  );
  console.log(`Refreshed the token in ${credsPath} too`);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log(`\n${credsPath} does not exist yet — create it with client_id,`);
    console.log('client_secret, refresh_token, developer_token and customer_id');
    console.log('before the report scripts will run.');
  } else {
    throw err;
  }
}
