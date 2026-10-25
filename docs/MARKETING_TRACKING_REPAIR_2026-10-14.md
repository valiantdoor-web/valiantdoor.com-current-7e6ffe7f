# Marketing tracking repair - October 14, 2026

> **Superseded measurement destination — October 25, 2026:** the newer approved SEO source of truth selects **Valiant Garage Door**, property `549338938`, stream `15411238744`, measurement ID `G-0X81XNNJM4`. The account/property mapping was verified through Windsor and the authenticated GA4 stream details. The website's single GA4 destination is being migrated to that stream; retain the historical isolation and conversion-safety work described below. Historical references to property `527178769` / `G-RVSWB9D2M5` are not the current destination. This note does not claim completed bookings or reconstruct past conversions.

Website target: `valiantdoor-web/valiantdoor.com-current-7e6ffe7f`,
Vercel `prj_JvCujZmnI32dWtCr210nKF2pPj1f`,
team `team_O6ZRh3X80wVbdhhQp2hpYNGD`, `www.valiantdoor.com`.

## Authoritative measurement

GA4 property `527178769` contains two website streams:
- Current: `15204923075`, measurement ID `G-RVSWB9D2M5`.
- Legacy: `13745154470`, measurement ID `G-K309W5D2N5`.

Both were destinations of the same Google tag, causing duplicate delivery to
one property. The legacy destination was moved to a separate Google tag,
`GT-T5MGXM5G`, named `Valiant legacy stream - isolated 2026-10-14`.
History was preserved. The served current Google tag was checked afterward:
its active instance destination list contains only `G-RVSWB9D2M5`.

Enhanced measurement was enabled on the current stream. Automatic form
interactions were disabled so submission attempts remain distinct from
server-accepted leads.

## Website changes

- GA actions explicitly route to the current measurement ID.
- Local and preview hosts do not initialize production GA/Ads or the homepage
  marketing bootstrap.
- `lead_form_attempt` measures attempts; accepted API responses alone produce
  `lead_form_success` and the existing `ads_conversion_Submit_lead_form_1` key
  event. A failed, malformed or non-2xx response never produces success.
- Repeated binding/submission cannot create duplicate requests while pending.
- Quote-page booking clicks no longer manufacture lead conversions.
- A thank-you page visit no longer manufactures a Nextdoor booked-job event.
  Actual HCP outcomes remain the source for the existing backend relay.
- First/latest campaign labels and click IDs survive internal navigation and
  are included with standard/photo leads. Existing HCP notes retain these
  fields; configured HCP lead-source names are preserved.
- GA page locations retain marketing query parameters and remove unrelated
  query parameters. No customer-entered values are sent as GA event parameters.
- Build-time asset version updates preserve page content and URLs.

## Validation and limits

Regression coverage includes repeated script loading, phone/booking clicks,
preview hosts, direct thank-you views, accepted/rejected/malformed API results,
duplicate submission, campaign persistence and photo estimates. External
lead APIs are mocked in tests; no test customer was created in HCP.

The full npm test workflow includes generated credential markup, SEO and
indexing checks. Build-generated credential output is not part of this
tracking source commit.

Historical September conversions and revenue cannot be reconstructed from
missing GA events. Completed HCP jobs/payments still need a read-only source
reconciliation before claiming channel revenue or ROAS. Booking handoff
cross-domain identity is not established by this repair.
