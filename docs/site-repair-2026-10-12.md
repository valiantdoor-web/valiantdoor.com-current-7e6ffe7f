# Valiant website repair — October 12, 2026

Production target: **www.valiantdoor.com**

Project: **valiantdoor-com-current** / prj_JvCujZmnI32dWtCr210nKF2pPj1f

Starting production commit: 8e64926db0fb79718bbeb0d822b18ba627acb820

## Changes

| Area | Result |
| --- | --- |
| Business structured data | One complete business definition per public page, with the same business ID, name, phone and Pleasanton address. Incomplete nested business entries now reference that definition. The shared browser script no longer injects an incomplete business. |
| Credentials | CSLB **1160068**, Diamond Certified **2953** (since August 2026), contractor and LLC employee/worker bonds, and liability insurance are included in structured data and visible, expandable page content. |
| Verification page | Added /credentials, official verification links, sitemap inclusion, a shared footer link, and static navigation links. |
| Bonding | **$25,000**, American Contractors Indemnity Company, bond **101085976**, effective July 7, 2026. **$100,000**, Allegheny Casualty Company, LLC employee/worker bond **ACC006A003914**, effective July 8, 2026. These are separate bonds. |
| Insurance | **$2,000,000**, Spinnaker Insurance Company, policy **CSG0050855800**, July 5, 2026–July 5, 2027. No per-occurrence/aggregate distinction was invented. The CSLB workers' compensation exemption is described separately and accurately. |
| Page titles | Updated **169** titles, including the long titles in the Semrush report and repeated project titles. Project identifiers distinguish otherwise similar project pages. |
| Descriptions | Updated **143** descriptions: 141 public project pages and the blog/repair-guide hubs. The two hubs now have distinct descriptions. |
| Internal links | Added relevant field-video links from 14 service/city pages. All **98** public video pages now have at least two referring pages. Added urgent repair request links from Services and Pleasanton. |
| Services outline | Moved the H1 before the trust content, made trust labels ordinary text, and introduced an H2 above the service cards. |
| Urgent repair page | Corrected its trailing-slash canonical, added useful visit/safety information, and made its issue selectors explicit buttons. |
| Assets | Published minified versions of **17** referenced first-party assets with content-based cache versions. Combined source sizes: **119,140 bytes → 93,040 bytes** before transport compression. This is not a measured Core Web Vitals improvement. |
| Lead measurement | Removed the quote-page booking-click event that claimed a lead had been submitted. Booking clicks remain booking_click; accepted website forms retain lead_form_success and the existing Ads event. Added a shared-script initialization guard and restricted form-submit tracking to lead forms. |
| Booking attribution | The urgent-repair page now carries Nextdoor source/medium tags only when an incoming Nextdoor source/click ID exists. Direct and internal website visits no longer get mislabeled as paid Nextdoor traffic; the selected repair problem remains in the booking link. |
| Existing CallRail integration | Allowed the specific script and connection hosts used by the installed website-pool script in Content Security Policy. The previous policy blocked its script loader. |
| Publishing pipeline | The live blog renderer uses the same business normalization as static pages, including provider-supplied JSON-LD. The page-intent generator no longer creates an incomplete LocalBusiness stub. |
| Production instructions | Corrected the historical repository/project-name references using the verified current production deployment. |

## Verification

The source scan inspected **592 HTML files/templates** and validated **354 public canonical pages**, excluding redirects, intentionally noindexed records, verification files and private tools.

- No missing business addresses or duplicate typed business definitions on those public pages.
- No missing/duplicate public titles or descriptions; reviewed title lengths fit the maintenance limit.
- Canonicals, sitemap destinations, local link targets, stylesheet/script files and H1 counts passed.
- All 98 public video pages have at least two referring pages.
- Existing maintenance indexing, blog publishing and blog synchronization tests passed.
- Regression tests passed for incomplete imported business stubs and credentials in the live blog index/article renderer.
- Attribution regression tests passed for direct website visits, actual Nextdoor clicks, and organic Nextdoor visits.
- Moenave and repair hero image/video sources were checked against the starting production commit.
- Private listings/command-center app files were excluded from this release.

## External account limit

The connected GA4 administration route requires reauthentication. **No GA4 key-event setting was changed.** The recommended setting is lead_form_success on Official property **549338938**, after confirming its current event settings. A phone or booking click is not a completed call or booked job.

Semrush must recrawl to calculate a new health score. Its text/HTML-ratio, intentionally compact business-card, legitimate media-download links, and appropriate nofollow links should not be changed merely to remove notices. Vendor-hosted scripts cannot be minified in this repository.

## Review

Start with /credentials, /services, /nextdoor-emergency-repair, /blog, /repair-guides, and a project/video page. Check the visible credentials, expandable video lists, navigation, mobile layout, and existing booking links. The liability coverage end date remains explicit so the record can be updated when coverage renews.
