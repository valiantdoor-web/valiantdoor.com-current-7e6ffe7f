# Moenave HCP Estimate Workflow
Version: 1.0.0 | Owner direction: 2026-10-09

For each Moenave quote, use the approved drawing standard, then create the estimate in Housecall Pro using the existing customer and saved price-book pricing.

## Connection source of truth
- Hosted Valiant Ops is on Vercel project valiant-ops-mcp (prj_mni4cIGulKqF0lcNZrqWCsefkbEl), team team_O6ZRh3X80wVbdhhQp2hpYNGD.
- Confirmed endpoint: https://valiant-ops-mcp.vercel.app/api/mcp.
- Hosted MCP requires authorized authentication. Provider credentials stay server-side.
- Current registered Valiant Ops tool in this session still routes to the old Mac tunnel. A tunnel error does not mean the hosted Vercel service is offline.
- Reconnect the plugin to the cloud endpoint through its supported authentication flow. Do not extract provider credentials into local files as a fallback.

## Required estimate steps
1. Retrieve valiant-moenave-quote-drawing-standard and the customer's current quote record.
2. Search HCP for the existing customer by name; cross-check email or phone. Reuse the verified customer ID and correct service address. Do not create a duplicate customer.
3. Check the customer's existing estimates for this project to prevent duplicate quotes.
4. Search current HCP price-book entries and existing estimate templates for the selected door and Moenave system. Use stored prices, units, quantities and applicable tax settings. Do not invent a price or apply an unsupported markup.
5. Match the selected door dimensions and finish to saved price-book pricing; standard-size pricing must not silently become a confirmed custom-size price.
6. Prepare and inspect the exact customer/address/line-item payload. Honor the provider write contract; the user's instruction to create the estimate is authorization for this estimate.
7. Create the estimate as an unsent draft. A request to create does not authorize emailing or texting the customer.
8. Add the latest approved quote drawing PDF where HCP supports attachments; otherwise retain an accessible private drawing reference and clearly record the attachment gap.
9. Read the created estimate back and verify customer, address, items, quantities, prices, taxes and total. On timeout or uncertain outcome, query existing records before retrying.
10. Log HCP estimate ID/number/link, verified amounts, source price-book IDs, drawing revision/hash and completion status in the customer's private Neon knowledge record. Report blockers precisely.

## Current request status
The current estimate has been requested, but no customer, price-book item or created estimate has been verified yet. Do not record it as created until HCP readback succeeds.
