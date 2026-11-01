// Runs any GAQL query against the Google Ads account and prints the rows as JSON.
// Read-only — uses googleAds:searchStream, which cannot change anything.
//
// Usage:
//   node scripts/google-ads-query.mjs "SELECT campaign.name, metrics.clicks FROM campaign WHERE segments.date DURING LAST_7_DAYS"

import { loadCreds, getAccessToken, apiPost } from './google-ads-lib.mjs';

const query = process.argv[2];
if (!query) {
  console.error('Usage: node scripts/google-ads-query.mjs "<GAQL query>"');
  process.exit(1);
}

const creds = await loadCreds();
const accessToken = await getAccessToken(creds);
const result = await apiPost(creds, accessToken, `customers/${creds.customer_id}/googleAds:searchStream`, { query });

console.log(JSON.stringify(result.flatMap((chunk) => chunk.results ?? []), null, 2));
