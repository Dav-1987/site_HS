# Google Ads API — Design Document

## Tool Overview
Internal reporting script used by HS Muebles (hsmuebles.es) to pull Google Ads
performance data for our own advertiser account into a local analysis
workflow. The tool is **read-only**: it queries campaign, ad group, and
keyword performance metrics (impressions, clicks, cost, conversions, CPA) via
Google Ads Query Language (GAQL) `SearchStream` requests and writes the
results to local files for review.

## Business Context
HS Muebles sells furniture (mirrors, consoles, manicure tables, dressers)
through hsmuebles.es. We run Google Ads Search campaigns to generate leads
(form submissions) and need ongoing visibility into spend vs. conversions to
size our advertising budget and judge campaign ROI.

## Architecture
- **Client**: a single Node.js/Python script run locally by the account
  owner, not a hosted service.
- **Authentication**: OAuth2 user credentials (Application Default
  Credentials / installed-app flow) scoped to `https://www.googleapis.com/auth/adwords`,
  using the developer token issued to our manager account.
- **API usage**: `GoogleAdsService.SearchStream` (GAQL) against the
  `campaign`, `ad_group`, `keyword_view`, and `metrics` resources for our own
  linked client account only.
- **Write operations**: none. The tool does not create, pause, or modify
  campaigns, budgets, bids, or any other Ads resource.
- **Data storage**: query results are written to local CSV/JSON files for the
  account owner's own analysis. No data is shared with third parties, no
  multi-tenant access, no other advertisers' accounts are queried.

## Access
- **Users**: internal only — the business owner (single Google Ads account,
  single manager account).
- **External exposure**: none. The tool is not distributed, resold, or made
  available to other advertisers or the general public.

## Rate Limits / Quota
Expected call volume is low — on the order of a few queries per day for
periodic budget and performance review, well within Basic access quota.
