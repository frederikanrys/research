# Weekend 2026 Ardennes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Research and present 5 available Ardennes rental houses for 16 people (Nov 6–8 2026, €2,000–€3,000), published as a static HTML page at `www.bluesummit.be/weekend-2026`.

**Architecture:** Six parallel research subagents each cover independent rental platforms, return structured property candidates, which are merged and rendered into a single self-contained `output/index.html`, then uploaded to an S3 bucket served via CloudFront at `www.bluesummit.be`.

**Tech Stack:** Claude subagents (WebFetch + WebSearch tools), HTML/CSS (no framework), Terraform (S3 + CloudFront + Route53 + ACM), AWS CLI for upload.

---

## Task 1: Dispatch parallel research agents

**Files:**
- Write results to: `output/research-raw.md` (aggregated notes)

This is the core research task. Dispatch all six agents in **parallel** in a single message. Each agent independently searches its assigned platforms and returns structured findings.

### Agent prompts

**Agent A — Ardennes-Etape**

```
You are a research agent. Search ardennes-etape.com for group vacation rentals in the Belgian Ardennes.

Requirements:
- Capacity: 16 people or more
- Dates: Friday 6 November to Sunday 8 November 2026 (2 nights)
- Budget: €2,000–€3,000 total for the stay
- Location: anywhere in Belgian Ardennes
- Must-have: spacious bedrooms
- Nice to have: billiard table, sauna, jacuzzi, fireplace, hot tub
- NOT required: swimming pool

Steps:
1. Fetch https://www.ardennes-etape.com/en/search?guests=16&checkin=2026-11-06&checkout=2026-11-08 (try variations if needed)
2. Also try https://www.ardennes-etape.com/fr/recherche with similar params
3. For each promising property (up to 6), fetch its detail page
4. Extract: property name, URL, exact price for Nov 6-8, max capacity, town/region, amenities list, what is included (towels, linens, cleaning, WiFi, parking, kitchen)
5. Note availability: confirmed available, likely available, or unknown

Return a structured list of up to 5 candidates with all details. If availability cannot be confirmed, say so explicitly.
```

**Agent B — Belvilla + Interhome**

```
You are a research agent. Search belvilla.be and interhome.be for group vacation rentals in the Belgian Ardennes.

Requirements:
- Capacity: 16 people or more
- Dates: Friday 6 November to Sunday 8 November 2026 (2 nights)
- Budget: €2,000–€3,000 total for the stay
- Location: Belgian Ardennes
- Must-have: spacious bedrooms
- Nice to have: billiard table, sauna, jacuzzi, fireplace, hot tub
- NOT required: swimming pool

Steps:
1. Fetch Belvilla search: https://www.belvilla.be/en/search?persons=16&arrival=2026-11-06&departure=2026-11-08&country=BE (try variations)
2. Also fetch https://www.interhome.be/en/search/?persons=16&arrival=20261106&departure=20261108 (try variations)
3. For each promising property (up to 4), fetch its detail page
4. Extract: property name, URL, price for Nov 6-8, max capacity, town, amenities, what is included (towels, linens, final cleaning, WiFi, parking, kitchen equipment)
5. Note availability status

Return a structured list of up to 5 candidates with all details.
```

**Agent C — Airbnb Belgium Ardennes**

```
You are a research agent. Search Airbnb for group vacation rentals in the Belgian Ardennes.

Requirements:
- Capacity: 16 people or more
- Dates: Friday 6 November to Sunday 8 November 2026 (2 nights)
- Budget: €2,000–€3,000 total for the stay
- Location: Belgian Ardennes (Liège province, Luxembourg province)
- Must-have: spacious bedrooms
- Nice to have: billiard table, sauna, jacuzzi, fireplace, hot tub

Steps:
1. Use WebSearch: search for "airbnb ardennes belgique 16 personnes novembre 2026" and "airbnb ardennes belgium 16 people november 2026"
2. Try fetching: https://www.airbnb.be/s/Ardennes--Belgium/homes?adults=16&checkin=2026-11-06&checkout=2026-11-08&room_type=entire_home
3. For any listing URLs found, fetch the detail pages
4. Extract: property name, URL, nightly rate × 2 + fees (estimate total), capacity, amenities, what is included
5. Note availability status

Return structured list of up to 5 candidates. Be explicit when availability is unconfirmed.
```

**Agent D — Booking.com + Casamundo**

```
You are a research agent. Search booking.com and casamundo.be for group vacation rentals in the Belgian Ardennes.

Requirements:
- Capacity: 16 people or more
- Dates: Friday 6 November to Sunday 8 November 2026 (2 nights)
- Budget: €2,000–€3,000 total for the stay
- Location: Belgian Ardennes

Steps:
1. WebSearch: "booking.com ardennes 16 personnes maison novembre 2026"
2. Try fetching: https://www.booking.com/searchresults.en-gb.html?dest_id=-1291691&dest_type=region&checkin=2026-11-06&checkout=2026-11-08&group_adults=16&no_rooms=1&nflt=ht_id%3D213
3. Fetch: https://www.casamundo.be/nl/vakantiehuizen/belgie/ardennen?persons=16&arrival=2026-11-06&duration=2
4. For each property found (up to 4 per platform), fetch detail page
5. Extract: name, URL, total price, capacity, amenities, included facilities

Return structured list of up to 5 candidates.
```

**Agent E — Homeaway / VRBO + Wimdu + local Belgian sites**

```
You are a research agent. Search multiple vacation rental platforms for group houses in the Belgian Ardennes.

Requirements:
- Capacity: 16 people or more
- Dates: Friday 6 November to Sunday 8 November 2026 (2 nights)
- Budget: €2,000–€3,000 total for the stay
- Location: Belgian Ardennes

Platforms to try:
1. https://www.vrbo.com/vacation-rentals/europe/belgium/wallonia/ardennes?adults=16&startDate=2026-11-06&endDate=2026-11-08
2. WebSearch: "wimdu ardennes 16 personnes" and "rentbyowner ardennes 16 people november 2026"
3. https://www.natureetdetente.be (Belgian local platform for group rentals)
4. https://www.ardennes.com/location-vacances (regional tourism site)
5. https://www.gites-de-wallonie.be (official Wallonia gîtes) — search for 16 persons

For each property found, extract: name, URL, total price, capacity, location, amenities, what is included (towels, linens, cleaning, WiFi, parking).

Return structured list of up to 5 candidates.
```

**Agent F — Google search + broader web**

```
You are a research agent. Use WebSearch extensively to find group vacation rentals in the Belgian Ardennes.

Requirements:
- Capacity: 16 people or more
- Dates: Friday 6 November to Sunday 8 November 2026 (2 nights)
- Budget: €2,000–€3,000 total
- Location: Belgian Ardennes

Search queries to try (try all of them):
1. "maison de vacances 16 personnes ardennes belgique novembre 2026"
2. "groepsaccommodatie ardennen 16 personen november 2026"
3. "group accommodation ardennes belgium 16 people november 2026 billiard"
4. "grote vakantiewoning ardennen 2026 november beschikbaar"
5. "location groupe ardennes 2026 billard cheminée"
6. "vakantiehuizen ardennes 16 personen biljart sauna"

For any property links found, fetch the detail pages. Look for lesser-known platforms and direct owner rentals.

Return structured list of up to 5 candidates with full details.
```

### Step 1: Dispatch all 6 agents in parallel

Send a single message with all 6 Agent tool calls simultaneously.

### Step 2: Collect and merge results

When all agents return, compile into `output/research-raw.md`:
- List all unique properties found (deduplicate by name/URL)
- For each: source platform, URL, price, capacity, availability status, amenities, included facilities
- Mark any confirmed available properties

### Step 3: Commit raw research

```bash
cd /Users/frederik.anrys/dev/github/research
git add weekend-2026/output/research-raw.md
git commit -m "feat: add raw research results from parallel agents"
```

---

## Task 2: Select top 5 properties

**Files:**
- Read: `output/research-raw.md`
- Write: `output/top5.md`

### Step 1: Score and rank all candidates

For each property, score on:
- Availability confidence (confirmed > likely > unknown): 0–3 pts
- Price fit (within €2,000–€3,000): 0–2 pts
- Extras (billiard +2, sauna/jacuzzi +1 each, fireplace +1): 0–5 pts
- Bedroom quality / spaciousness mentioned: 0–2 pts

### Step 2: Write top5.md

For each of the 5 winners, document:
```markdown
## [Property Name]

- **URL:** [direct booking link]
- **Platform:** [Ardennes-Etape / Belvilla / etc.]
- **Location:** [town, province]
- **Price (Nov 6–8):** €[amount] (2 nights)
- **Capacity:** [X] people
- **Availability:** [Confirmed / Likely / Unconfirmed — check before booking]

### Amenities
- Billiard table: ✓/✗
- Sauna: ✓/✗
- Jacuzzi/hot tub: ✓/✗
- Fireplace: ✓/✗
- BBQ: ✓/✗
- Large dining area: ✓/✗

### What's included
| Item | Status |
|---|---|
| Bed linens | Included / Bring yourself |
| Towels | Included / Bring yourself |
| Final cleaning | Included / Extra cost (€X) |
| WiFi | Yes / No |
| Kitchen equipment | Full / Basic |
| Parking | On-site / Street |
| Pets allowed | Yes / No |

### Notes
[Any caveats, minimum stay requirements, contact info, etc.]
```

### Step 3: Commit

```bash
git add weekend-2026/output/top5.md
git commit -m "feat: select and document top 5 Ardennes properties"
```

---

## Task 3: Generate HTML report

**Files:**
- Read: `output/top5.md`
- Create: `output/index.html`

### Step 1: Write self-contained index.html

Single file, inline CSS, no external dependencies (except property photos via URL if available).

Structure:
```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekend Ardennen November 2026 — 16 personen</title>
  <style>
    /* Clean, readable card layout */
    /* Color palette: warm greens + cream (Ardennes forest feel) */
    /* Mobile-friendly */
  </style>
</head>
<body>
  <header>
    <h1>🏡 Weekend Ardennen — 6–8 november 2026</h1>
    <p>16 personen · Budget €2.000–€3.000 · Top 5 opties</p>
  </header>

  <!-- One card per property -->
  <article class="property-card">
    <h2>[Name] <span class="badge available">Beschikbaar</span></h2>
    <div class="meta">📍 [Location] · 💶 €[Price] · 👥 [X] personen</div>
    <div class="amenities">
      <span class="chip has">🎱 Biljart</span>
      <span class="chip has">🔥 Open haard</span>
      <span class="chip missing">🏊 Zwembad</span>
    </div>
    <table class="included">
      <tr><td>Beddengoed</td><td>✓ Inbegrepen</td></tr>
      <tr><td>Handdoeken</td><td>⚠ Zelf meebrengen</td></tr>
      <!-- ... -->
    </table>
    <a href="[URL]" class="btn">Bekijk & Boek →</a>
  </article>

  <footer>
    <p>Onderzoek uitgevoerd op 2026-03-03 · Controleer beschikbaarheid voor boeking</p>
  </footer>
</body>
</html>
```

Style requirements:
- Cards with subtle shadow, rounded corners
- Green amenity chips (has) vs grey (missing)
- Yellow warning for "bring yourself" items
- Responsive: 1 column on mobile, 2 on tablet
- Large readable fonts, family-friendly feel

### Step 2: Verify HTML looks correct

Open in browser or inspect structure mentally. All 5 properties present, all tables filled in.

### Step 3: Commit

```bash
git add weekend-2026/output/index.html
git commit -m "feat: generate HTML report for top 5 Ardennes properties"
```

---

## Task 4: Terraform — www.bluesummit.be hosting

**Files:**
- Create: `terraform/main.tf`
- Create: `terraform/variables.tf`
- Create: `terraform/outputs.tf`
- Create: `terraform/backend.tf`

Reuse the gimme `frontend.tf` pattern exactly. Key differences:
- Subdomain: `www` (not `gimme`)
- Project name: `bluesummit-www`
- Default root object: `index.html`
- No SPA redirect rules needed (static content, not Angular router)

### Step 1: Write backend.tf

```hcl
terraform {
  backend "s3" {
    bucket         = "gimme-terraform-state-<ACCOUNT_ID>"
    key            = "bluesummit-www/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "gimme-terraform-locks"
    encrypt        = true
  }
}
```

> Note: Reuses the existing gimme Terraform state bucket and lock table.

### Step 2: Write variables.tf

```hcl
variable "aws_region" {
  default = "eu-central-1"
}

variable "domain_name" {
  default = "bluesummit.be"
}

variable "subdomain" {
  default = "www"
}

variable "project_name" {
  default = "bluesummit-www"
}
```

### Step 3: Write main.tf

Copy gimme `frontend.tf` structure:
- `aws_s3_bucket.www`
- `aws_s3_bucket_public_access_block.www`
- `aws_cloudfront_origin_access_control.www`
- `aws_acm_certificate.www` (provider = us-east-1)
- `aws_route53_record.www_cert_validation`
- `aws_acm_certificate_validation.www`
- `aws_cloudfront_distribution.www` (no custom_error_response needed)
- `aws_s3_bucket_policy.www`
- `aws_route53_record.www`

Reference existing Route53 zone: `data "aws_route53_zone" "main" { name = "bluesummit.be." }`

### Step 4: Write outputs.tf

```hcl
output "cloudfront_domain" {
  value = aws_cloudfront_distribution.www.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.www.bucket
}

output "website_url" {
  value = "https://www.bluesummit.be/weekend-2026/"
}
```

### Step 5: Commit Terraform

```bash
git add weekend-2026/terraform/
git commit -m "feat: add Terraform for www.bluesummit.be CloudFront + S3"
```

---

## Task 5: Apply Terraform and deploy HTML

> Requires: AWS CLI configured with credentials that have access to the bluesummit.be Route53 zone and permission to create S3, CloudFront, ACM, Route53 resources.

### Step 1: Init and apply Terraform

```bash
cd /Users/frederik.anrys/dev/github/research/weekend-2026/terraform
terraform init
terraform plan
terraform apply
```

Expected: ~15 minutes for ACM certificate DNS validation + CloudFront propagation.

### Step 2: Get bucket name from output

```bash
terraform output s3_bucket_name
# e.g. bluesummit-www-123456789012
```

### Step 3: Upload HTML to S3

```bash
aws s3 cp ../output/index.html \
  s3://$(terraform output -raw s3_bucket_name)/weekend-2026/index.html \
  --content-type "text/html"
```

### Step 4: Verify

Open: `https://www.bluesummit.be/weekend-2026/index.html`

> CloudFront may take up to 60 minutes to fully propagate globally. If the URL isn't working immediately, wait and try again.

### Step 5: Final commit

```bash
cd /Users/frederik.anrys/dev/github/research
git add -A
git commit -m "feat: deploy weekend-2026 research to www.bluesummit.be"
git push origin main
```

---

## Checklist

- [ ] Task 1: All 6 research agents dispatched in parallel and results collected
- [ ] Task 1: `output/research-raw.md` written and committed
- [ ] Task 2: Top 5 properties selected and `output/top5.md` written
- [ ] Task 3: `output/index.html` generated with full details for all 5 properties
- [ ] Task 4: Terraform files written and committed
- [ ] Task 5: Terraform applied, HTML uploaded, URL verified live

---

## Notes for the executing agent

- **Availability is the #1 concern.** Prioritize properties where availability is confirmed or can be verified. Always note clearly when it could not be confirmed.
- **Price must include all mandatory fees** (cleaning, service fees). Total for 2 nights should be €2,000–€3,000.
- **Dutch is fine** for the HTML report — the family is Belgian.
- **If a platform blocks scraping**, fall back to WebSearch to find listing URLs and fetch individual property pages.
- **If fewer than 5 confirmed-available properties** are found, include the best unconfirmed ones with a clear "⚠ Availability not confirmed — verify before booking" warning.
