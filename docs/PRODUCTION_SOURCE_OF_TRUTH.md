# Valiant Production Source of Truth

Every agent must read this file before pushing or deploying anything related to Valiant production.

## Main website
- Live domain: https://www.valiantdoor.com/
- Website repository: https://github.com/valiantdoor-web/valiantdoor.com-current-7e6ffe7f.git
- Local website repo: /Users/vm/Code/valiantdoor-live-edit-deploy
- Vercel project name: valiantdoor-com-current
- Vercel project ID: prj_JvCujZmnI32dWtCr210nKF2pPj1f
- Vercel team: valiant-garage-door (team_O6ZRh3X80wVbdhhQp2hpYNGD)
- Vercel output directory: public
- Production branch: main

## Owner-confirmed SEO decisions — 2026-10-25 (America/Los_Angeles)

The owner confirmed these decisions directly; they supersede conflicting older SEO audit notes:

- **Hours and address:** 3588 Pimlico Dr, Pleasanton, CA 94588 is a staffed storefront. Storefront and phone-answering hours are **24/7**. Keep the address visible. These facts no longer need approval before implementing the related SEO fixes.
- **Nextdoor landing page:** `https://www.valiantdoor.com/nextdoor-emergency-repair` **stays indexable and self-canonical**. Preserve its XML sitemap inclusion, HTML site-map link, page-intent sitemap flag, and existing internal discovery links. Do not restore the older `noindex` policy, consolidate its canonical, or redirect the page away without a new explicit owner decision.
- **Verification:** retain the protections in `scripts/validate_indexing_contract.py`; run `npm run validate:indexing` and check the live HTTP status, canonical, robots directives, XML sitemap inclusion, and human-facing discovery links before claiming the policy is verified. Indexable does not mean Google or Bing has indexed or ranked the page.
- **Limits:** 24/7 hours do not guarantee immediate technician dispatch. Preserve the published technician/route/parts availability conditions and after-hours service-charge policy. These decisions do not complete unrelated issue acceptance criteria or prove call/booking delivery.

This is a repository policy record, not evidence that hours have already been updated on every public page, structured-data block, or external listing.

## Deployment pipeline (CRITICAL — read before deploying)
Root cause of the long-standing "my changes never go live" problem (fixed 2026-07-20):
- The repo `valiantdoor-web/valiantdoor.com-current-7e6ffe7f` (repoId 1296543400) is a FORK of the
  parent `Valiant-Production-Co/valiantdoor.com-current` (repoId 1162332791).
- All work (v0 commits, PRs, merges to `main`) happens on the FORK.
- The Vercel project's Git integration was mistakenly linked to the PARENT repo, so pushes
  and merges to the fork's `main` never triggered a production deploy. The live site stayed
  frozen on an old build while `main` moved ahead. Merging a PR looked "done" but nothing
  reached www.valiantdoor.com.

The fix (permanent):
- Re-linked the Vercel project's Git integration to the FORK `valiantdoor-web/valiantdoor.com-current-7e6ffe7f`
  (repoId 1296543400), production branch `main`, createDeployments enabled.
- From now on, a push/merge to `main` on the fork auto-deploys to production.

How to deploy going forward:
1. Merge the change into `main` on `valiantdoor-web/valiantdoor.com-current-7e6ffe7f` (the fork).
2. Vercel auto-builds and aliases www.valiantdoor.com. No manual step needed.
3. Verify live within ~2 min (curl the page; check a marker you changed).
4. If auto-deploy ever stops again, first confirm the Vercel project is still linked to the
   FORK repoId 1296543400 (not the parent 1162332791) via the Vercel API/dashboard.

Known sandbox quirk: the v0 sandbox's local git mirror of `origin/main` can go stale (shows an
older commit than GitHub). Treat the GitHub API (`gh api repos/.../commits/main`) as authoritative;
when in doubt, deploy from a fresh clone of the fork's `main`.

## Separate projects that must not be mixed with the main website
- Service app: valiant-service-app.vercel.app
- Service app credentials, Supabase keys, tables, app logic, and technician app wording belong only to the service app unless Valentino explicitly says to wire them into the main website.
- Listings / command center / iOS app files are not main website production changes unless Valentino explicitly says so.

## Required production gate
Before any production push or deploy:
1. Confirm the target is the main website repo above, not the service app or another Vercel project.
2. Verify the live project ID `prj_JvCujZmnI32dWtCr210nKF2pPj1f`, team ID `team_O6ZRh3X80wVbdhhQp2hpYNGD`, project name `valiantdoor-com-current`, and the `www.valiantdoor.com` production domain. The former `2026-01-26-website` project name is historical. For CLI releases, link `.vercel/project.json` to these verified current IDs.
3. Run a repo status check and do not include app/editor/user-state files in a website production commit.
4. Verify navigation, sitemap, linked sections, and affected pages if a change is described as sitewide or global.
5. Do not expose, print, or commit API keys or secrets.
6. Do not push or deploy until the exact target project is confirmed.

## Bot image source
- Static website bot image path: /public/assets/valiant-bot-widget-static-shield-20260629.png
- Static website bot image URL: /assets/valiant-bot-widget-static-shield-20260629.png?v=bot-lock-20260702
- Current requested source image: /Users/vm/Pictures/image-download-2.png
- The bot label under the image should read: Valiant AI Assistant
