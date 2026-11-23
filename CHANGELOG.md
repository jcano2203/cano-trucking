# Changelog

## 2026-11-23: Simplify UI from owner feedback
The owner liked the app but found it cluttered. No features were removed.

### On the Road
- Only today's loads are big cards. Needs info and the next 7 days are now one-row summaries (date or time, client, from → to, earned). Tapping a row opens it.
- Removed the warning banner at the top. "Needs your info" now comes right after Today, and tapping a row opens the Finish form.
- A load that is both today and needs info shows only once (as a today card).
- Big cards: removed the "UPCOMING" tag and the "Change details" button. Tapping the card opens it. Tags show only for "Needs info" or "Done". The green "Finish this load" button stays.

### Adding things
- The separate add-load, add-expense, and scan buttons are now ONE dark "＋ Add" button fixed at the bottom of every screen. It opens a small menu: A load / An expense / Scan a document (only when scanning is available).

### Forms
- "Finish this load" opens a short form with only miles, fuel, tolls, and other costs.
- The new-load form shows only the job details. Miles and costs are folded under "Trip already done? Add miles & costs".
- One Save button. A load with miles dated today or earlier is saved as done.
- Cancel and Delete are now quiet text buttons.

### Office
- Overview: one big Profit number with Earned, Spent, and Miles under it. The five period buttons are now one drop-down.
- The fuel/tolls/repairs breakdown, the 6-month chart, and the color guide are behind a "See details" button.
- Coming up and Records use the same one-row style. Colors are unchanged: green = earned, red = spent, blue = miles, teal = coming up, orange = needs info.
- "Save everything for my accountant" stays visible near the top of Records. "Delete sample data" is now a small red text link.

### Look
- Flat cards (no shadows), calmer spacing.
- The theme switch is a small round icon button (🌙 / ☀️).
- The "Next 7 days" heading is now teal (coming up) instead of blue, since blue means miles.

### Docs
- Added "Simplicity rules" to CLAUDE.md.
