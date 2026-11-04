# Pinned ARD schema fixtures

These schema and license files are byte-for-byte copies from
[ards-project/ard-spec at f073b1ea9b01a5f068d0b0986426f2ea49fa30b2](https://github.com/ards-project/ard-spec/tree/f073b1ea9b01a5f068d0b0986426f2ea49fa30b2).
Original schema paths: `spec/schemas/ai-catalog.schema.json` and
`spec/schemas/ard-entry.schema.json`. See `provenance.json` for SHA-256 digests.

The current specification discovers `/.well-known/ard.json`;
`/.well-known/ai-catalog.json` is an optional predecessor path. Both website
files intentionally contain the same artifact list. The manifest is checked
against the current `ArdManifest` definition and the legacy catalog schema.
The latter requires `specVersion: "1.0"`; this is a catalog envelope version,
not a claim that the evolving ARD specification is version 1.0.

Validation of a discovery envelope does not verify live HTTP delivery, registry
indexing, browser WebMCP registration, or the entire referenced OpenAPI document.
No MCP server or authenticated/private API operation is advertised.
