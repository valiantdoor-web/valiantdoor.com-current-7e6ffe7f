# Agent discovery and existing WebMCP tool repair

Scope: the existing five imperative tools on the homepage, `/business-card`,
and `/lp`, plus truthful discovery of the existing read-only public facts API.
No form submission, Origin Trial enrollment, new declarative form attributes,
MCP backend, or customer/provider write capability is added.

## Changes

- The served WebMCP bundle now matches its maintained source: bounded runtime
  validation, cancellation checks, explicit confirmation for dialer/booking
  handoffs, and truthful `submitted`, `booked`, and `connected` statuses.
- Remove stale review counts and unconditional warranty claims from tool output.
  Preserve conditional dispatch and the published after-hours charge.
- Both source and minified asset keys use content hash `53169822d74f`.
  All three existing page references use that version. The build-time tracking
  refresher also maintains WebMCP references without expanding tool coverage.
- `/.well-known/ard.json` and compatibility `/.well-known/ai-catalog.json`
  advertise only `https://www.valiantdoor.com/openapi.json` and its existing
  public GET operation, not the separately authenticated POST handler.
- Exact upstream ARD schemas and license are pinned under
  `tests/fixtures/ard-schema`; provenance includes hashes and upstream commit.

## Verification

`npm run test:agent-discovery` checks both bundles, schema validation, negative
inputs, confirmation/cancellation, source/minified parity, catalog validity,
mocked GET responses, and cache-busting preservation/idempotence.

`npm test` includes the new suite and retains existing indexing, navigation,
editorial copy, tracking, and schema checks. Test/build commands regenerate
existing credential/schema markup; exclude unrelated generated changes from
this release.

After release, verify both manifest URLs return actual JSON, validate the live
bytes, verify the exact served script hash on all three pages, and inspect
the browser's registered tools. A valid catalog is not proof of ranking or
autonomous booking capability. An unscored audit heading is not itself an error.

## Form coverage boundary

Declarative form annotations remain a separate optional experimental task.
Do not expose password/admin forms. Do not enroll the production site in a
browser Origin Trial without an explicit enrollment decision. Existing forms,
upload flows, and native validation remain unchanged in this repair.
