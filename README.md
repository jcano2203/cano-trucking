# Cano's Trucking: trip logger

A one-truck trip logger: loads (past and upcoming), expenses, profit after fuel/tolls/repairs,
and an "On the Road" / "Office" mode. Built with plain HTML, CSS, and JavaScript. No install needed.

## Run it
1. Unzip the folder.
2. Double-click `index.html` (it opens in your browser), or open the folder in VS Code
   and use the "Live Server" extension, or run `python3 -m http.server 8000` in the
   folder and visit http://localhost:8000.

## Live link
https://jcano2203.github.io/cano-trucking/

## Files
- `index.html`: the page shell
- `style.css`: colors, layout, light/dark themes
- `app.js`: all the logic (read the numbered STEP comments)
- `CLAUDE.md`: instructions for Claude Code (business, problem, what we're building, rules)
- `FEEDBACK.md`: owner demo notes

## Notes
- Records are saved in your browser (localStorage) on THIS device only.
- The "Scan a document" button is hidden here; it needs a small server that holds an API key (see the manual).
- Sample data is fake. Use "Delete sample data & start fresh" in Office > Records.
