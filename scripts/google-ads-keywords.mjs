// Keyword cost/volume research via the Google Ads API (KeywordPlanIdeaService).
// Same engine as the Keyword Planner UI — no running campaigns needed.
// Read-only.
//
// Usage:
//   node scripts/google-ads-keywords.mjs "tocador" "mesa de manicura" "mueble recibidor"
//
// Defaults to Spain geo + Spanish language. Prints, per keyword idea:
// avg monthly searches, competition, and the top-of-page bid range (≈ CPC),
// in the account's billing currency.

import { loadCreds, getAccessToken, apiPost } from './google-ads-lib.mjs';

// Well-known constants: Spanish = 1003, Spain = 2724.
// https://developers.google.com/google-ads/api/reference/data/geotargets
const LANGUAGE = 'languageConstants/1003';
const GEO = 'geoTargetConstants/2724';

const seeds = process.argv.slice(2);
if (seeds.length === 0) {
  console.error('Usage: node scripts/google-ads-keywords.mjs "keyword one" "keyword two" ...');
  process.exit(1);
}

const creds = await loadCreds();
const accessToken = await getAccessToken(creds);

// Find the account currency so bid amounts are labelled correctly.
const currencyRes = await apiPost(creds, accessToken, `customers/${creds.customer_id}/googleAds:searchStream`, {
  query: 'SELECT customer.currency_code FROM customer LIMIT 1',
});
const currency = currencyRes.flatMap((c) => c.results ?? [])[0]?.customer?.currencyCode ?? '?';

const ideas = await apiPost(creds, accessToken, `customers/${creds.customer_id}:generateKeywordIdeas`, {
  language: LANGUAGE,
  geoTargetConstants: [GEO],
  keywordPlanNetwork: 'GOOGLE_SEARCH',
  keywordSeed: { keywords: seeds },
});

const micros = (v) => (v == null ? null : Number(v) / 1e6);
const rows = (ideas.results ?? [])
  .map((r) => {
    const m = r.keywordIdeaMetrics ?? {};
    return {
      keyword: r.text,
      searches: Number(m.avgMonthlySearches ?? 0),
      competition: m.competition ?? 'UNKNOWN',
      low: micros(m.lowTopOfPageBidMicros),
      high: micros(m.highTopOfPageBidMicros),
    };
  })
  .sort((a, b) => b.searches - a.searches);

console.log(`Account currency: ${currency} | Geo: Spain | Language: Spanish | ${rows.length} ideas\n`);
console.log('searches/mo  competition  CPC range (top of page)   keyword');
console.log('-----------  -----------  ------------------------  -------');
for (const r of rows) {
  const cpc = r.low != null && r.high != null ? `${r.low.toFixed(2)}–${r.high.toFixed(2)} ${currency}` : 'n/a';
  console.log(
    `${String(r.searches).padStart(11)}  ${r.competition.padEnd(11)}  ${cpc.padEnd(24)}  ${r.keyword}`,
  );
}
