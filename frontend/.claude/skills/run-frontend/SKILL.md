---
name: run-frontend
description: Build, run, and drive the SmartVault frontend (Vite+React admin dashboard). Use when asked to start the frontend, build it, lint it, take a screenshot of a page, or click through a flow (e.g. gateway CRUD) to verify it works.
---

This is a Vite + React 19 SPA (`react-router-dom`, no server-side code). Drive it by starting the Vite dev server, then scripting a headless Chromium session via `.claude/skills/run-frontend/driver.mjs` (a small REPL that reads `nav`/`click`/`fill`/`screenshot`/... commands from stdin — `chromium-cli` is not installed in this environment, so this driver stands in for it).

All paths below are relative to `frontend/`.

## Prerequisites

Windows + Git Bash (this project has no Linux/apt-get requirement). Node.js and npm already available.

```bash
npm install               # react, react-router-dom, etc.
npm install -D playwright # driver dependency — resolves fine from a nested .claude/skills/... script via Node's normal node_modules walk-up
npx playwright install chromium
```

Pages that fetch data (e.g. `/gateways`) also need the backend + DB running:

```bash
docker compose -f ../docker-compose.dev.yml up -d   # DB on :3307
(cd ../backend && npm run dev)                        # API on :4000
```

`frontend/.env.development` must contain `VITE_API_BASE_URL=http://localhost:4000` (already committed as part of this project — not a secret, just not meant to drift from the backend's `CORS_ORIGIN=http://localhost:3000`).

## Run (agent path)

```bash
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:3000/ >/dev/null; do sleep 1; done'
```

**Check what port it actually bound** — see Gotchas. If it printed `Local: http://localhost:3001/` instead of 3000, either free port 3000 first or pass that URL as the driver's base URL.

Then pipe a command script into the driver:

```bash
node .claude/skills/run-frontend/driver.mjs http://localhost:3000 <<'EOF'
nav /gateways
wait-for role=heading[name="게이트웨이 관리"]
screenshot list
click role=button[name="+ 새 게이트웨이"]
wait-for #gateway_id
fill #gateway_id 1CORPS-B3-R204-G1
fill #room_code 1CORPS-B3-R204
screenshot form
click .form-actions button.primary
wait-for text=1CORPS-B3-R204-G1
screenshot list-after-create
click td.actions button
wait-for text=등록된 게이트웨이가 없습니다
screenshot list-after-delete
console
quit
EOF
```

Screenshots land in `screenshots/<name>.png` (relative to wherever you ran `node` from — run it from `frontend/` so they land at `frontend/screenshots/`). `console` prints any collected `console.error`/uncaught-exception text as `CONSOLE_ERRORS=[...]` — check it's `[]` before declaring success.

The `/gateways` flow above needs a real `room_code` to exist first (FK constraint) — seed one and clean it up after:

```bash
docker exec smartvault-dev-db mysql -u smartvault_dev -p'<see backend/.env.development>' smartvault_dev -e "
INSERT IGNORE INTO bases (base_code, base_name) VALUES ('1CORPS', '1군단');
INSERT IGNORE INTO buildings (building_code, base_code, building_name) VALUES ('1CORPS-B3', '1CORPS', '3동');
INSERT IGNORE INTO rooms (room_code, building_code, room_name) VALUES ('1CORPS-B3-R204', '1CORPS-B3', '204호');
"
# ...run driver...
docker exec smartvault-dev-db mysql -u smartvault_dev -p'<same password>' smartvault_dev -e "
DELETE FROM rooms WHERE room_code='1CORPS-B3-R204';
DELETE FROM buildings WHERE building_code='1CORPS-B3';
DELETE FROM bases WHERE base_code='1CORPS';
"
```

### Driver commands

| command | what it does |
|---|---|
| `nav <path-or-url>` | `page.goto()`. A bare path is joined to the base URL given on the command line. |
| `wait-for <selector>` | Waits for the **first** match of a Playwright selector (`css`, `text=...`, `role=button[name="..."]`, `#id`, ...). |
| `click <selector>` | Clicks the first match. |
| `fill <selector> <value>` | Fills the first match; rest of the line (after the first space) is the value verbatim. |
| `select <selector> <value>` | `selectOption()` on a native `<select>` — pass the `<option>`'s `value` attribute (for this app, that's always the code, e.g. `1CORPS`), not its visible label. |
| `press <key>` | `page.keyboard.press()`. |
| `screenshot [name]` | Full-page PNG to `screenshots/<name or timestamp>.png`. |
| `console` | Prints `CONSOLE_ERRORS=[...]` collected so far. |
| `quit` | Closes the browser, exits. |

`window.confirm()`/`alert()` dialogs (used by the gateway delete button) are auto-accepted by the driver — you don't script them.

## Run (human path)

```bash
npm run dev   # opens on :3000 (or next free port) — Ctrl-C to stop
```

## Build / Lint

```bash
npm run lint    # eslint src — currently 0 errors
npx vite build  # → dist/, currently succeeds
```

No test suite is configured yet (no vitest/jest) — lint + build are the only automated checks today.

---

## Gotchas

- **Vite silently moves off port 3000 if it's taken** (`Port 3000 is in use, trying another one...`) and picks 3001, 3002, etc. The backend's CORS is hardcoded to `http://localhost:3000` (`backend/.env.development` → `CORS_ORIGIN`), so a fetch from a fallback port fails with a CORS error, not a helpful one. Always check the dev server's own stdout for the `Local:` line before assuming `:3000`; if something else already owns 3000 (e.g. a session's own long-running dev server), just point the driver at that instance instead of starting a second one — `curl -s http://localhost:3000/` and check the page title/content to confirm it's this app.
- **`role=` selector engine has no `[exact]` flag.** `role=button[name="등록"][exact]` throws `Unknown attribute "exact"` — the only recognized bracket attributes are the fixed accessibility ones (`name`, `checked`, `disabled`, `expanded`, `level`, `pressed`, `selected`, `description`, `include-hidden`). There is no way to force exact-name matching from inside the selector string itself.
- **Name-substring collisions between the sidebar and the page content.** The sidebar's "등록 및 관리" accordion toggle and a form's "등록" submit button both satisfy `role=button[name="등록"]` (name matching is substring, not exact), and the sidebar renders on every route so it's always in the DOM. `wait-for`/`click` here use `.first()`, and the sidebar happens to come first in DOM order — so a same-word click silently hits the wrong element instead of erroring. Scope to a CSS class in the content area instead (e.g. `.form-actions button.primary`, `td.actions button`) whenever a menu label and a content label share a word.
- **Never drive a native `<select>` with `click` + `press ArrowDown` + `press Enter`.** It looks like it works (no error) but can silently land one option off — verify by checking the actual API/DB state, not just the absence of an `ERR` line. Use the `select` command (`selectOption()`), which targets the option by value directly.
- **`eslint-plugin-react-hooks`'s `set-state-in-effect` rule** flags a `useEffect` that calls a state setter as a direct top-level statement in its body (the common "reset loading/error, then fetch" pattern). Wrapping the setters + fetch in an inner `async function load() { ... }` defined and called inside the effect satisfies it — see `src/pages/gateways/GatewayListPage.jsx`. If the fetch function is also called from an event handler (so it can't just live inline in the effect), wrap the effect's call site in an anonymous `(async () => { await load(); })()` IIFE instead of calling `load()` bare — see `src/pages/personnel/PersonnelMatchPage.jsx`. The rule's check is shallow (it flags the literal call expression, not what the callee does), so which wrapping satisfies it depends on whether the state-setting code is textually inside the effect or only reached through a function reference.
- **The `fill`/`select` commands split their argument on the *first* space only** (`selector`, then everything after as the value). A selector containing a descendant-combinator space — e.g. `.page-toolbar select:nth-of-type(2)` — gets torn in half: `.page-toolbar` becomes the selector and `select:nth-of-type(2) <value>` becomes the value, and Playwright then fails with a confusing error (`Element is not a <select> element`, or a CSS parse error) rather than anything mentioning the real cause. Use a single-token selector with no spaces for these two commands — `select:nth-of-type(2)`, `#id`, `.some-class` — never a multi-word descendant selector.
- **There is no `>> nth=N` chaining support** (that Playwright-internal syntax isn't parsed specially here — it's passed straight through as a literal CSS string, which `.locator().first()` then either matches wrong or fails to parse). For "the Nth match," use a CSS positional pseudo-class in a single token instead, e.g. `.week-slot-row:nth-child(2) .week-slot-day-label` behind `wait-for`/`click`, or just `select:nth-of-type(2)` — and remember `.first()` is always applied afterward, so a selector matching multiple elements silently picks the first one rather than erroring (confirmed this hit — a `>> nth=1` click landed on element 0, not 1; always re-verify the actual effect via a screenshot or the API/DB state, not just the `OK` line).

## Troubleshooting

- **`net::ERR_CONNECTION_REFUSED` / blank screenshot with no console errors**: the dev server isn't actually up yet, or you navigated before the `curl` poll succeeded. Re-check `npm run dev`'s stdout for the real port.
- **Gateway list page shows `등록된 게이트웨이가 없습니다` when you expected rows, or create fails with `존재하지 않는 room_code입니다`**: the backend + DB aren't running, or the `room_code` you're using doesn't exist yet — see the seed snippet above.
- **`locator.click: Timeout ... exceeded` on `td.actions button`**: there's no row in the table (nothing to delete) — usually means the preceding `create` step failed; check the driver output for an `ERR` line above it rather than assuming the delete step itself is broken.
