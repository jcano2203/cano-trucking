# Cano's Trucking: CLAUDE.md

## The business
Cano's Trucking is a small, family-run owner-operator trucking company. The owner drives one semi-truck and hauls containers between yards around the Chicago area for a handful of clients. Dispatch details (container ID, pickup number, yards, pay) arrive by email or paper.

## The problem
Load details, fuel, tolls, and repair receipts end up scattered across emails, paper, and memory. At tax time or in an audit it is slow and stressful to answer: "What did I earn, what did I spend, and what did I keep?" The owner also has no simple view of tomorrow's loads.

## What we are building (MVP)
A simple, one-truck trip logger and record portfolio with two modes:
- **On the Road**: today's loads, the next 7 days, and anything that needs info. Big text, big buttons.
- **Office**: Overview (money earned, money spent, profit, miles, 6-month chart), Coming up (future loads), Records (all past loads and expenses, search, CSV export for the accountant).

Main workflow, start to finish: add an upcoming load -> see it under On the Road on its day -> finish it (miles, fuel, tolls, other costs) -> it shows in Records and in the Office totals. Data is saved and reloaded in the browser (localStorage).

## Out of scope for this MVP (next assignment)
AI document scan, automations (n8n, email, calendar, text messages), GPS, multiple drivers/logins, public client-facing site. Do not build these yet.

## Who uses it
An older owner-operator who is not very tech-savvy. Keep text large, buttons big, wording plain, and screens uncluttered.

## Color rules (never change their meaning)
Green = money earned. Red = money spent. Blue = miles. Teal = coming up. Orange = needs the owner's info. Always pair color with an icon or word. Keep both light and dark themes working.

## Tech
Plain HTML, CSS, and JavaScript. No build step, no frameworks, no extra libraries.
- `index.html`: page shell
- `style.css`: colors and layout (CSS variables at the top)
- `app.js`: all logic (numbered STEP comments)
Data lives in `localStorage` under the key `cano-mvp2`.

## Run it
Open `index.html` in a browser, or run `python3 -m http.server 8000` in this folder and visit http://localhost:8000.

## Simplicity rules (from owner feedback, keep these)
- **Big cards only for TODAY's loads.** Everything else (needs info, next 7 days, Coming up, Records) is a one-row summary: date or time, client, from → to, and the money. Tapping a row opens it.
- **One way to add things:** the dark "＋ Add" button fixed at the bottom of every screen. It opens a small menu (A load / An expense / Scan a document only when scanning works). Do not add more "Add …" buttons on screens.
- **No warning banners.** "Needs your info" is a section right after Today. A load is never listed twice on one screen.
- **Tags only when they matter:** show a tag only for "⚠ Needs info" or "✔ Done". No tag for upcoming loads.
- **One main button per form.** Cancel and Delete are quiet text links, not big buttons. Delete always asks twice.
- **Short forms.** "Finish this load" asks only for miles, fuel, tolls, other costs. The new-load form shows job details; trip numbers stay folded under "Trip already done? Add miles & costs".
- **One headline number per screen.** The Overview leads with Profit; Earned, Spent, Miles sit under it. Extra detail (breakdown, chart, color guide) stays behind "See details".
- **Choices in a drop-down** when there are more than 2 or 3 options (like the time period).
- **Flat and calm:** no shadows, plain spacing, few borders. The theme switch is a small round icon.
- Before adding anything new, ask: can it go in an existing menu, row, or "See details" instead of a new button or card?

## Rules for Claude
- Keep changes small and simple; explain each change in plain English.
- Do not add libraries or frameworks.
- Do not commit secrets, API keys, or real business data.
- Test at phone width (about 390px) and in both themes.
- Make small commits with clear messages.

## After the MVP
A real database so records sync across phones and computers, login, then the AI scan and automations.
