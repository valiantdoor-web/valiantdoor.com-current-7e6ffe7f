# Valiant Website Agent Instructions

Before pushing or deploying production changes, read and follow:

- `docs/PRODUCTION_SOURCE_OF_TRUTH.md` in this checkout. Do not substitute a stale copy from another checkout.

Hard rules:
- This repository is for the main Valiant website only.
- Do not mix service app, listings app, command center, iOS app, or unrelated Vercel project changes into website production work.
- Never call a change global unless every affected section is actually updated and verified, including site maps, lists, navigation, and linked page sections.
- Never commit or print API keys, tokens, passwords, or secrets.
- Do not push or deploy until the exact production target is verified.

## Owner-confirmed SEO decisions — 2026-10-25 (America/Los_Angeles)

- The storefront at 3588 Pimlico Dr, Pleasanton, CA 94588 is staffed. The owner confirmed storefront and phone-answering hours are 24/7. Keep the address visible; do not treat these hours as an unresolved approval blocker.
- `/nextdoor-emergency-repair` stays indexable with its own canonical URL. Preserve its XML sitemap inclusion, HTML site-map link, and existing internal discovery links. Do not add `noindex`, canonicalize it to another page, redirect it away, or remove its discovery paths based on the older SEO audit.
- These owner decisions supersede older Notion/Linear audit statements that the hours are unconfirmed or that the Nextdoor landing page should remain `noindex`. They do not mark the other acceptance criteria in those issues complete.
- Preserve the existing indexing regression checks in `scripts/validate_indexing_contract.py`. Run `npm run validate:indexing` and verify the live page's status, canonical, robots directives, and sitemap/discovery links before reporting its indexing policy as verified.
- 24/7 availability is not a promise of immediate dispatch. Preserve the existing technician/route/parts availability conditions and after-hours service-charge policy.
