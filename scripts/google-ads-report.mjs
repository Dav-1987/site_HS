// Pulls campaign performance from the Google Ads API for budget/spend analysis.
// Read-only — uses googleAds:searchStream, never mutates anything.
//
// Usage:
//   node scripts/google-ads-report.mjs [days]   (default 30)

import { loadCreds, getAccessToken, apiPost } from './google-ads-lib.mjs';

const days = Number(process.argv[2] ?? 30);

const creds = await loadCreds();
const accessToken = await getAccessToken(creds);

const query = `
  SELECT
    campaign.name,
    campaign.status,
    metrics.impressions,
    metrics.clicks,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value
  FROM campaign
  WHERE segments.date DURING LAST_${days}_DAYS
`;

const result = await apiPost(creds, accessToken, `customers/${creds.customer_id}/googleAds:searchStream`, { query });

const rows = result.flatMap((chunk) => chunk.results ?? []);
if (rows.length === 0) {
  console.log(`No campaign data for the last ${days} days (account ${creds.customer_id}). No campaigns running yet?`);
} else {
  let totalCost = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  for (const r of rows) {
    const cost = (r.metrics.costMicros ?? 0) / 1e6;
    totalCost += cost;
    totalClicks += Number(r.metrics.clicks ?? 0);
    totalConversions += Number(r.metrics.conversions ?? 0);
    console.log(
      `${r.campaign.name} [${r.campaign.status}] — impr: ${r.metrics.impressions}, clicks: ${r.metrics.clicks}, cost: ${cost.toFixed(2)}, conversions: ${r.metrics.conversions}`,
    );
  }
  console.log(
    `\nTotals (last ${days}d): cost=${totalCost.toFixed(2)}, clicks=${totalClicks}, conversions=${totalConversions}, CPA=${totalConversions > 0 ? (totalCost / totalConversions).toFixed(2) : 'n/a'}`,
  );
}
