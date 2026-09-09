# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: women roughly 25–45 in Spain, buying for themselves.** They are furnishing a bedroom, dressing area, or first real home of their own, and the purchase is personal and emotional rather than purely functional — a dressing table and a lit mirror are the pieces they picture themselves using every morning. They arrive mostly from Instagram, TikTok, and WhatsApp on a phone, often from an in-app browser.

**Secondary: beauty professionals and salons (B2B).** Manicure, brow, lash, and makeup artists buying the same mirrors and dressing tables as workplace equipment. They share the catalog with the primary audience — they are not a separate storefront — but they judge pieces by durability, working light, and surface space rather than by how the piece looks in a bedroom.

Both audiences buy in Spanish; English is a real second language of the site, not decoration.

## Product Purpose

Mirage Muebles sells minimalist, own-design furniture across Spain: mirrors, dressing tables, loft-style dressing tables, shelving, and a wide "other models" range (126 products across 5 categories at the time of writing). The site's job is to carry a visitor from a social-media impression to a confirmed order — which means presenting each piece convincingly enough that a stranger will hand over their phone number for a call-back.

Success is a submitted order form that survives the confirmation call.

## Positioning

Three things a neighboring reseller could not truthfully claim, confirmed by the owner:

1. **Own manufacturing and own design.** The pieces are made in-house, not sourced finished. This is the root of the other two advantages and the basis of the "diseño propio" language already in the site copy.
2. **Assembly included in delivery, at no extra cost, not sold separately.** Delivery covers all of Spain.
3. **Prices below the market for the same class of furniture** — a direct consequence of manufacturing rather than reselling.

## Operating Context

**There is no online checkout and no shopping cart.** The order flow is deliberate and human:

1. The visitor opens a single product page and submits the order form on it (name, country, phone, postal code, address). `add_to_cart` exists only as an analytics event for the Pinterest tag — there is no cart UI and no basket state.
2. The order reaches the business by Telegram and email.
3. **A person calls back** to confirm the delivery address, the shipping cost, and the delivery date. Shipping cost is not shown on the site because it depends on the address.
4. Usual delivery is 3–5 days from order confirmation. Assembly happens at delivery.
5. Returns: 14 days from receipt, packaging intact and product undamaged, initiated by phone or email.

This means the phone call is part of the product, not a fallback. The site's contact points are real operating channels: phone 614 848 301, info@hsmuebles.es, WhatsApp catalog, Instagram @mirage_muebles, TikTok @hsmuebles.

Adjacent surfaces that are part of the operation but not the storefront: an `/admin` panel where the owner edits the live catalog, settings, and homepage blocks; a Wallapop panel used internally to prepare marketplace listings; and product feeds published to Google, Meta, and Pinterest.

## Capabilities and Constraints

- **Bilingual ES/EN** with hreflang and localized routes. Spanish is primary.
- **Content is runtime-editable.** Catalog and settings are owner-edited through `/admin` against a Postgres-backed Express API; the committed JSON files are snapshots pulled from production. Any design work must survive an owner changing copy, prices, photos, featured products, and which homepage blocks are visible (`featured`, `collections`, `heroPromo`, `reviews`, `reviewsHome` are all toggles).
- **Static-first delivery.** The React 19 + Vite SPA is prerendered to static HTML for SEO; nginx serves the HTML directly and Express is reached only through the SPA fallback. Anything that only works after hydration is invisible to crawlers.
- **Self-hosted on a VPS**, not a managed platform. The CSP lives in nginx configuration outside this repository.
- **Media is owner-supplied** and arrives at whatever dimensions the owner uploads; layouts must tolerate that.
- **Promotional mechanics exist in the product:** a seasonal hero promo line, discount/old-price badges, and a "+ Regalo" gift attached to qualifying products.

## Brand Commitments

- **The binding brand name is "Mirage Muebles."** The `hsmuebles.es` domain and the `@hsmuebles` TikTok handle are historical and stay as they are; the name discrepancy is known and is not a bug to fix.
- Typefaces in production: **Oswald** (display) and **Montserrat** (body), self-hosted via Fontsource.
- The color system is tokenized in `src/index.css` (warm off-white ground, soft charcoal instead of pure black, muted gold accent, warm surface) and mapped into Tailwind in `tailwind.config.js`.
- **`DESIGN_SYSTEM_TEMPLATE_EN.md` is the project's standing design authority**, alongside `CLAUDE.md` and `ENGINEERING_GUIDE.md`. It predates this file and governs UI work.

## Evidence on Hand

- **Real product photography and video** for the full catalog in `/uploads`, multiple images per product, some with video. This is genuine owner-supplied material, not stock.
- **Real operating facts** stated above (delivery, assembly, returns, timings) — these come from published site copy and are safe to reuse verbatim.
- **No published customer reviews.** The reviews system exists and is admin-managed, but the committed snapshot contains none. Testimonials, ratings, review counts, and customer names must not be invented for any surface.
- **No pricing benchmarks, awards, press, certifications, or customer counts** have been established. The "below market price" positioning is the owner's statement and must not be turned into a specific numeric claim.

## Product Principles

1. **The call-back is the conversion, not a leak.** Every surface should make submitting a phone number feel safe and low-commitment, and should set the expectation that a human will call — never imply instant online purchase.
2. **Manufacturing is the story.** Price, custom sizing, and design claims must stay inside what in-house production can truthfully deliver.
3. **One catalog, two readings.** Personal buyers and beauty professionals share the same pieces; surfaces should let both see themselves in a product without splitting the site or diluting either.
4. **The owner edits this site.** Anything that breaks when copy gets longer, a photo gets swapped, or a block gets switched off is a defect, not an edge case.
5. **Assume a phone in a social-media in-app browser.** That is where the audience arrives, and it is where every design decision must first hold up.

## Accessibility & Inclusion

No formal standard has been confirmed by the owner. The codebase already targets **WCAG AA contrast** deliberately — secondary and accent text tokens carry documented ratios (4.81:1 and 4.61:1 on the background) and the design system requires visible keyboard focus rings. Treat that as the floor to preserve rather than as an owner requirement to renegotiate.
