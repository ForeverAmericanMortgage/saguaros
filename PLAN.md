# Saguaros Olympiad Landing Page & Team Hub — Plan

## Context

The Scottsdale Saguaros host the annual **Olympiad** at Scottsdale Stadium (2026 date: **April 17**). ~100 teams across two divisions — **Agents Benefiting Children (ABC)** and **Brokers for Kids (BFK)** — fundraise from January through April for Arizona children's charities. The event culminates in a field-day competition at the stadium.

**Awards:**
- **Captain's Cup** — top ABC fundraising team
- **Broker's Cup** — top BFK fundraising team
- **Saguaros Cup** — top athletic score on event day

**Primary audience:** Team captains (~100 people) who need a single place to find dates, download materials, understand how to fundraise, and track their standing.

---

## What We're Building

A **single-page (or few-page) Olympiad landing site** that serves as the go-to resource for team captains throughout the fundraising season. Think of it as the page a captain bookmarks on day one and keeps coming back to.

---

## Page Sections

### 1. Hero / Event Overview
- Olympiad branding, date (April 17, 2026), venue (Scottsdale Stadium)
- Quick "what is the Olympiad" summary for first-timers
- CTA: "Register Your Team" or "Access Your Dashboard"

### 2. Critical Dates Timeline
A visual timeline captains can reference throughout the season:
- Team registration deadline
- ABC Captains Meeting
- Fundraising kickoff
- Key fundraising milestones / check-ins
- Hoops for Hope tournament
- Final fundraising deadline
- Olympiad event day (April 17)
- Post-event celebration / grant announcements

### 3. Ways to Fundraise
A clear, actionable guide for captains on how to raise money:
- **Sponsorship packages** — what tiers are available, how to pitch them
- **AZ State Tax Credits** — explain the $470/$938 credit, link to donation form
- **Team-hosted events** — ideas and examples (happy hours, golf outings, etc.)
- **Raffle ticket sales** — how it works, what prizes are available
- **Direct donations** — how supporters can give directly
- Each method could be an expandable card or accordion with details

### 4. Marketing Assets & Downloads
A resource library captains can pull from:
- Saguaros / Olympiad logos (various formats)
- Social media graphics (Instagram, LinkedIn, Facebook templates)
- Email templates (sponsor outreach, donation asks, event invites)
- Flyer / print templates
- Brand guidelines (colors, fonts, tone)
- Organized as a downloadable grid — click to download or preview

### 5. Team Tracker / Leaderboard
The competitive heart of the page:
- **Division tabs:** ABC | BFK | Overall
- **Ranked list** of teams showing:
  - Team name / company
  - Captain name
  - Total raised
  - Progress bar toward goal
- **Grand total** raised across all teams toward the org-wide goal
- Updated regularly (admin-entered data — weekly or more frequent)
- Sortable by amount raised, team name, etc.
- Captains can see where they stand relative to the Captain's Cup / Broker's Cup race

### 6. FAQ / Contact
- Common captain questions
- Contact info for the Olympiad committee / Saguaros board
- Links to saguaros.com for more info

---

## Tech Stack Decision

Two viable paths depending on how much ongoing complexity you want:

### Option A: Next.js + Supabase (Recommended)
- **Frontend:** Next.js (React) — fast, mobile-friendly, supports static + dynamic content
- **Backend:** Supabase (Postgres + auth + real-time) — leaderboard data lives here, admins log in to update
- **Asset hosting:** Supabase Storage or Cloudflare R2 for downloadable marketing files
- **Hosting:** Vercel (free tier is plenty for this traffic)
- **Why:** Clean separation of static content (timeline, fundraising guide, assets) and dynamic content (leaderboard). Scales easily if you want to add features later. Real-time leaderboard updates are built in.

### Option B: Static Site + Google Sheets
- **Frontend:** Astro or plain HTML/CSS/JS
- **Data:** Google Sheets as the "database" — admins update a spreadsheet, site pulls from it via Sheets API
- **Assets:** Hosted on Google Drive or in the repo
- **Hosting:** Netlify or GitHub Pages (free)
- **Why:** Dead simple. Any board member can update the leaderboard by editing a spreadsheet. No database to manage. Trade-off: less polished, harder to add interactive features later.

**Recommendation:** Start with **Option A**. It's not much more work upfront and gives you a proper foundation. The admin experience for entering leaderboard data will be much better than editing a spreadsheet, and you can evolve the site year over year.

---

## Data Model (Simplified for MVP)

```
Team
  - id
  - name (team / company name)
  - division (ABC | BFK)
  - captain_name
  - captain_email
  - logo_url
  - fundraising_goal
  - total_raised (updated by admin)

TimelineEvent
  - id
  - title
  - date
  - description
  - type (deadline | event | milestone)

Asset
  - id
  - name
  - category (logo | social_graphic | email_template | flyer | brand_guide)
  - file_url
  - thumbnail_url
```

---

## Site Map

```
/                   → Landing page (hero, timeline, fundraising guide, assets, leaderboard)
/leaderboard        → Full-page leaderboard with filters and sorting (optional breakout)
/admin              → Protected admin panel to manage teams and update totals
/admin/teams        → Add/edit teams
/admin/scores       → Update fundraising totals
```

Could be a single scrollable page with anchor links, or broken into a few routes. Single page is simpler and keeps captains from hunting for things.

---

## Phased Build

### Phase 1 — Static Content (build first)
- Hero section with event branding and date
- Critical dates timeline (hardcoded initially)
- Ways to fundraise section with expandable cards
- Marketing assets download grid
- FAQ section
- Mobile-responsive design
- Deploy to Vercel

### Phase 2 — Leaderboard + Admin
- Supabase setup: teams table, auth for admins
- Admin panel to add teams and update fundraising totals
- Public leaderboard component on the landing page
- Division filtering (ABC / BFK / Overall)

### Phase 3 — Polish & Event Day
- Saguaros Cup game-day score tracking
- Shareable team pages (captain shares link to solicit donations)
- Historical comparison (optional)

---

## Open Questions

1. **Do you have Olympiad branding / design assets already?** (colors, logos, fonts) — or should we establish a look and feel?
2. **How often should the leaderboard update?** Weekly? Real-time as admins enter data?
3. **Where does fundraising data currently live?** Spreadsheets? If so, we can build a CSV import for phase 2.
4. **Domain / hosting:** Would this live on a subdomain like `olympiad.saguaros.com`, or a separate domain, or just a path on the main site?
5. **Should team captains be able to log in and see their own data**, or is the public leaderboard sufficient?
6. **What marketing assets do you already have ready to upload?** This will shape how we build the downloads section.
