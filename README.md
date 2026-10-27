# ClickTrap — Dark Pattern Detector

> **See the pattern. Protect your choice.**

ClickTrap is a browser extension and companion web dashboard that helps people recognize potentially deceptive user-interface patterns (“dark patterns”). It flags signals such as fake urgency, artificial scarcity, hidden costs, manipulative cookie choices, confirmshaming, and obstacles to cancellation.

## Open the website

- **GitHub Pages website:** Once GitHub Pages is enabled for this repository, the root `index.html` forwards visitors to the dashboard at `dashboard/index.html`.
- **Full local scanner:** Run the Node.js server as described below. This is required for the server-backed scan of live website URLs.
- **Chrome extension:** Load the repository folder as an unpacked extension in Chrome.

> **Hosting note:** GitHub Pages serves static files only. It can display the dashboard and its sample pages, but it cannot run `server.js` or the `/api/scan` endpoint. For the full live-URL scanner, run the Node.js server locally or deploy that backend to a Node-compatible hosting service and configure the dashboard to use it. Browser cross-origin restrictions may also prevent scanning some external sites.

## Detection categories

| Category | Example signal |
| --- | --- |
| Fake urgency | Countdown timers and artificial deadline language |
| Scarcity manipulation | “Only one left” claims and viewer-count pressure |
| Cookie consent traps | Unequal accept/reject choices or preselected consent |
| Hidden or late costs | Fees revealed late in checkout or preselected add-ons |
| Confirmshaming | Guilt-inducing opt-out language |
| Obstructive cancellation | Unnecessarily difficult cancellation flows |

These are rule-based indicators, not proof that a website is fraudulent. Results should be reviewed in context.

## Run locally

### Requirements

- Node.js (a current LTS release is recommended)
- A modern browser

### Start the dashboard and API

From the repository root, run:

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000). Keep the terminal open while using the site.

### Run automated tests

```bash
npm test
```

To run the evaluation script:

```bash
npm run evaluate
```

## Load the Chrome extension

1. Open Chrome and visit `chrome://extensions/`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the cloned ClickTrap repository folder — the folder containing `manifest.json`.
5. Pin ClickTrap to the toolbar and test it on a webpage.

## Test pages

The repository includes sample pages for the detection categories, plus a normal-marketing control page. Open them from the dashboard’s **Open Test Pages** link or serve them through the local server.

## Privacy and limitations

- The extension's detection rules run in the browser.
- The dashboard stores local scan history in browser storage.
- A detection is a signal for review, not a legal determination of fraud.
- When using the server-backed live URL scanner, the server fetches the target page. Only scan sites you are authorized to inspect, and avoid entering private or sensitive URLs.

## Project structure

- `dashboard/` — dashboard HTML, CSS, and JavaScript
- `test-pages/` — demonstration pages for detection cases
- `test/` — detector tests and evaluation dataset
- `manifest.json` — Chrome extension configuration
- `server.js` — local Node.js dashboard/API server
- `rules.js`, `detector.js` — detection rules and analysis engine

## License

MIT — see the repository's license file, if included.
