# Valiant Moenave Quote Drawing Standard
Version: 1.0.0 | Effective: 2026-10-09 | Owner-approved

## Mandatory workflow
Every Moenave / trackless pivot consultation or quote receives the same drawing treatment as the approved Rev 03 quote: a polished, dimensioned Valiant concept drawing attached to the quote. This is the required process, not an optional illustration. Do not reuse a customer's measurements or door selection on another project.

## Exact layout
- One 17 x 11 inch landscape PDF, vector linework, white sheet, thin border.
- Dark navy header: Valiant Garage Door LLC, valiantdoor.com, TRACKLESS PIVOT DOOR, customer/project, QUOTE CONCEPT, date and revision.
- Left: large exterior elevation showing the selected door face, color, panel pattern and glazing selection.
- Separate dimension strings for reported opening width/height and proposed door leaf width/height. Include feet/inches and total inches.
- Right: interior mounting concept with visible torsion shaft, spring assembly, bearing supports, side pivot hardware and drive-side hardware. Label schematic components. The torsion system must never be omitted.
- Right: floor/ceiling datum, available above-opening clearance, dimension-basis table, mounting and side-clearance references.
- Bottom: coordination notes, customer/project title block, sheet Q-01, revision, NTS and PRELIMINARY - FOR QUOTING ONLY.
- Preserve the approved spacing, typography, navy/gray/gold palette and clean CAD-style treatment.

## Dimension rules
- Record customer-reported opening dimensions separately from proposed leaf dimensions.
- Owner's current width rule: leaf width = opening width minus 2 inches TOTAL, centered for the concept (nominal 1 inch each side). Record verified exceptions explicitly.
- Height is independent. Never subtract 2 inches from height because of the width rule.
- Require an explicit proposed door height. Do not guess from a photograph, round to 7 ft, or silently substitute a manufacturer example.
- Above-opening allowance = reported ceiling datum minus reported opening height. This is not proof of complete pivot operating clearance.
- For vaulted ceilings, mark the unmeasured ceiling profile and verify the actual operating envelope.

## Product and hardware rules
- Show the customer's selected manufacturer/model/color/panel style. Changes require a revised face, labels, table and notes.
- C.H.I. 4283 White Long Raised Panel is the current reference case, not a universal door selection.
- The current generator supports this long raised-panel concept only; adapt and visually verify the face for other products.
- Sectional products proposed for pivot use require supplier confirmation of rigid assembly, reinforcement, compatibility and final leaf weight.
- Show torsion shaft, spring assembly, bearings, side pivots and drive hardware clearly. Spring count/layout is illustrative unless supplied.
- Never invent spring wire, coil length, torque, shaft size, gear ratio or lift geometry.
- The supplied Moenave reference lists 4 inch non-drive side room, 14 inch drive side room, inside-face mounting with 2x6 bucks, and maximum 18 ft x 10 ft / 500 lb. These are reference-sheet values; verify current supplier requirements for the actual quote.
- Confirm travel, headroom, side room, garage depth, backing, opener and simulator clearance before fabrication or installation.

## Revision and delivery
1. Review intake, field photos and supplier sheets.
2. Fill project inputs; preserve reported versus proposed dimensions.
3. Render the actual selected face and complete hardware concept.
4. Render the PDF to an image and inspect every label, dimension, leader, panel and margin.
5. Confirm opening/leaf dimensions and latest owner corrections; check for stale finish or model text.
6. Attach the final PDF to the quote and retain inputs, generator/version, artifact SHA-256, date and revision.
7. Log the standard and private case in Valiant Command's Neon knowledge documents. Keep reusable standards/source in GitHub.
8. Customer contact details and actual quote PDFs stay in private storage; public GitHub receives customer-free examples only.

## Reusable source
Run:
`python scripts/render_moenave_quote.py docs/MOENAVE_QUOTE_INPUT_EXAMPLE.json /absolute/path/quote.pdf`

Dependencies: Python, reportlab, PyMuPDF. The script also writes a PNG for visual inspection. Input example is fictional/customer-free. It preserves the approved layout and includes explicit torsion hardware.

## Valiant Command retrieval contract
Before preparing any Moenave quote, retrieve `valiant-moenave-quote-drawing-standard` from `public.markdown_documents` in the existing `valiant-command-center` Neon project. Use the latest owner-approved revision and this process. Case records are separate and scoped to the customer. Database persistence does not itself prove an app's AI retrieval route is deployed or wired.
