# Design: Weekend 2026 Ardennes — Group House Research

**Date:** 2026-03-03
**Author:** Frederik Anrys

---

## Context

Family weekend in the Ardennes, Belgium. Need a house for **16 people** from **Friday 6 November to Sunday 8 November 2026** (2 nights). Budget is **€2,000–€3,000** for the full rental. A swimming pool is not required. Spacious bedrooms are a must. Extras like a billiard table, sauna, jacuzzi, or fireplace are preferred.

The research is a one-off task executed agenically by parallel Claude subagents. No persistent scraping infrastructure is needed.

---

## Requirements

### Must have
- Capacity: ≥ 16 people
- Available: 6–8 November 2026
- Price: €2,000–€3,000 for the full stay (2 nights)
- Location: Ardennes, Belgium
- Spacious bedrooms (ideally en-suite or well-distributed)

### Nice to have (ranked)
1. Billiard table
2. Sauna / jacuzzi / hot tub
3. Fireplace / wood burner
4. Large dining area
5. BBQ / outdoor space

### Not required
- Swimming pool

### Facility info to capture per property
For each property, explicitly note:
- Towels: included or bring yourself
- Bed linens: included or bring yourself
- Kitchen equipment: included or basic
- WiFi: yes / no
- Parking: on-site or street
- Pets allowed: yes / no
- Final cleaning: included or extra cost

---

## Research Approach

Six parallel subagents cover independent platform families:

| Agent | Platforms |
|---|---|
| A | Ardennes-Etape (ardennes-etape.com) |
| B | Belvilla (belvilla.be) + Interhome (interhome.be) |
| C | Airbnb — Belgium, Ardennes region |
| D | Booking.com + Casamundo |
| E | Homeaway / VRBO + Wimdu + local Belgian sites |
| F | Google search — "group accommodation Ardennes 16 people" + other results |

Each agent:
1. Searches with filters: ≥16 guests, Ardennes, Nov 6–8 2026
2. Attempts to verify availability and price for the specific dates
3. Extracts amenities and facility details
4. Returns top candidates with all available details + direct booking URL

Results are merged, deduplicated, and the top 5 are selected based on:
- Confirmed/likely availability
- Price within budget
- Extras (billiard, sauna, etc.)
- Bedroom quality

---

## Output

### HTML Report (`output/index.html`)

A single self-contained HTML file (no build tool, no framework):
- 5 property cards: name, photo (if available), location, price, platform
- Amenities chips per property
- Included vs. bring-along table per property
- Availability status badge
- Direct booking URL
- "Last researched" timestamp

### Hosted at
`www.bluesummit.be/weekend-2026/index.html`

---

## Hosting Architecture

Reuses the gimme project's Terraform pattern (S3 + CloudFront + Route53):

- **S3 bucket:** `bluesummit-www-<account-id>` (private)
- **CloudFront:** distribution for `www.bluesummit.be`, default root object `index.html`
- **Path:** HTML uploaded to `weekend-2026/index.html` in the bucket
- **DNS:** Route53 A record alias → CloudFront (existing `bluesummit.be` hosted zone)
- **TLS:** ACM certificate for `www.bluesummit.be` (us-east-1, DNS validation)

Terraform is applied once. Updating the page = overwrite the S3 object.

---

## Out of Scope

- Automated/recurring scraping
- CI/CD pipeline
- Backend API
- User authentication
