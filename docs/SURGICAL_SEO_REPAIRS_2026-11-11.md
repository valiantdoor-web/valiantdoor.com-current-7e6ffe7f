# Surgical audit repairs

## Scope and preservation

This release repairs observed defects without redesigning pages, rewriting
article/service copy, changing pricing, inventing image rights or dates, or
altering intentional noindex/redirect policies. Keep the staffed storefront's
24/7 policy and the indexable, self-canonical Nextdoor landing page intact.

The audit covered 617 requested URL variants / 583 distinct final HTML pages,
including all 366 canonical sitemap URLs. All 2,600 discovered first-party
asset URLs were checked successfully, including 2,082 allowlisted public
portfolio images. HTTP success is not proof of indexing or rich-result display.

## Repairs

- Repair the 12 dynamic articles' table-of-contents targets at render time:
  146 links resolve to real, namespaced headings in their own article. One
  Sources label has no section and becomes plain text instead of a fake link.
  Article storage, visible wording and unrelated links remain unchanged.
- Remove only the bad optional VideoObject URL fields on 88 pages: one YouTube
  watch-page contentUrl and 87 self-referential embedUrl properties. Actual
  media, players, metadata and the already-correct video sitemap are preserved.
- Add measured intrinsic dimensions for 98 real image instances, using 61
  byte-measured sources: 33 static instances and 65 dynamic render instances.
  The empty lightbox placeholder is intentionally excluded. Original media
  bytes, URLs, alt text, captions and rights metadata remain untouched.
- Establish Microsoft's callable Clarity queue before the provider bootstrap.
  Preserve existing instances and queued consent commands.
- Remove only the fingerprinted, CSP-blocked obsolete SearchAtlas data-script
  bootstrap from 117 maintained pages/templates. Do not broaden CSP.
- Defer the official Housecall Pro chat app until explicit chat-button intent,
  including the standalone business card. Preserve the official organization
  attributes, keyboard button, retry/singleton behavior and SMS fallback. Six
  custom pages receive only launcher-scoped CSS, not the broad shared design.
- Maintain shared JS/CSS content hashes in all affected HTML and the blog
  template. Existing CSS is byte-preserved before the scoped launcher addition.

## Regression gates

Run under Node 24:

```sh
npm ci
npm test
npm run vercel-build
npm run test:surgical-fixes
git diff --check
```

The surgical suite has 43 checks across exact 12-article fixtures, all 88
VideoObject baseline pages, all 98 image instances, protected editorial
contracts, source/minified chat parity, Clarity, restrictive CSP, and shared
asset cache propagation. Approved protectedDigest refreshes are proven to
contain only the exact SearchAtlas ID removal and measured width/height changes;
the original main-copy and heading digests remain unchanged.

After release, verify actual canonical HTML/assets, all 146 article targets and
one plain Sources label, all 88 video graph corrections, image dimensions,
initial chat network behavior, and the Clarity bootstrap. Re-crawl the canonical
corpus; do not label local tests or preview checks as production proof.

## Provider-controlled / unverified outcomes

- Google's direct G-0X81XNNJM4 loader endpoint still returns 404. Retain the
  configured measurement property and Ads destinations; do not silently remove
  analytics or switch properties to suppress an error.
- Search Console Overview reported 131 indexed / 272 not indexed URLs and zero
  invalid enhancement items in its observed subset. Detailed exclusion reasons,
  manual/security reports and report dates were not verified. These are not
  272 confirmed defects. Neither code checks nor requests guarantee indexing.
- PageSpeed API returned 429 quota exceeded; field CWV Overview had no data.
  Do not fabricate a fresh score or claim maximum speed/field-CWV clearance.
- Windsor reads are blocked by its connected-account plan limit. Ahrefs is
  authenticated but has no available Site Audit crawl/GSC period data and zero
  workspace API units for backlink metrics. No plan/account changes are made.
- Grok guest messaging requires acceptance of xAI terms. No guest message or
  acceptance occurs without the requested action-time approval.

These residuals must stay distinct from completed code repairs.
