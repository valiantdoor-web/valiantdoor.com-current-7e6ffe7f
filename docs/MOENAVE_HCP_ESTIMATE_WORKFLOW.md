# Moenave HCP Estimate Workflow
Version: 1.0.0 | Owner direction: 2026-10-09

For each Moenave quote, use the approved drawing standard, then create the estimate in Housecall Pro using the existing customer and saved price-book pricing.

## Connection source of truth
- Hosted Valiant Ops is on Vercel project valiant-ops-mcp (prj_mni4cIGulKqF0lcNZrqWCsefkbEl), team team_O6ZRh3X80wVbdhhQp2hpYNGD.
- Confirmed endpoint: https://valiant-ops-mcp.vercel.app/api/mcp.
- Hosted MCP requires authorized authentication. Provider credentials stay server-side.
- Current registered Valiant Ops tool in this session still routes to the old Mac tunnel. A tunnel error does not mean the hosted Vercel service is offline.
- Reconnect the plugin to the cloud endpoint through its supported authentication flow. Owner explicitly authorizes reusing saved API keys and retrieving the HCP key from verified Vercel project configuration for direct HCP API calls when needed. Keep server storage authoritative; any local working credential must have restricted permissions and must never be included in public GitHub, quote documents or logs.

## Required estimate steps
1. Retrieve valiant-moenave-quote-drawing-standard and the customer's current quote record.
2. Search HCP for the existing customer by name; cross-check email or phone. Reuse the verified customer ID and correct service address. Do not create a duplicate customer.
3. Check the customer's existing estimates for this project to prevent duplicate quotes.
4. Search current HCP price-book entries and existing estimate templates for the selected door and Moenave system. Use stored prices, units, quantities and applicable tax settings. Do not invent a price or apply an unsupported markup.
5. Use the customer's explicitly approved face, width and independent height. Standard-size catalog pricing must not silently become confirmed custom-size pricing.
6. Prepare and inspect the exact customer/address/line-item payload. Honor the provider write contract; the user's instruction to create the estimate is authorization for this estimate.
7. Create the estimate as an unsent draft. A request to create does not authorize emailing or texting the customer.
8. Add the latest approved quote drawing PDF where HCP supports attachments; otherwise retain an accessible private drawing reference and clearly record the attachment gap.
9. Read the created estimate back and verify customer, address, items, quantities, prices, taxes and total. On timeout or uncertain outcome, query existing records before retrying.
10. Log HCP estimate ID/number/link, verified amounts, source price-book IDs, drawing revision/hash and completion status in the customer's private Neon knowledge record. Report blockers precisely.

## Required catalog and image rules
Reuse existing materials and services; never create catalog entries. Classify physical products as materials and installation as labor. Every selected item must have an image; reuse existing images, or generate and upload an image to the same existing entry through a supported flow. Do not calculate tax manually; preserve HCP settings.

## Verified API behavior
POST /estimates may ignore kind and source catalog linkage. Correct the SAME estimate through PUT /estimates/{estimate_id}/options/{option_id}/line_items/bulk_update using existing line IDs. Use kind materials + service_item_type pricebook_material for products; kind labor + service_item_type organizational for services. Read all items back. HCP may calculate configured tax automatically after correction.

## Owner-approved pricing
Moenave kit material pbmat_0f48798e9282403390062755d5af6788 sell price updated and verified at $4,999.00 on 2026-10-09. Cost unchanged. Retrieve live prices each time.

## Reusable plugin
Housecall Pro for Valiant: https://chatgpt.com/plugins/Plugin_944202ad94708191b7ca62219a52a361. Private workspace plugin version 1.0.0, release pluginrel_6ac9661ca2d4819183eeaee0e4d5da56. Existing Vercel MCP declared; connection/authentication not yet verified through the new plugin.
