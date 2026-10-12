# Use the completed application on macOS

These instructions use the delivered source and existing compiled `dist/` folder. No application rewrite is needed.

## Install and open

1. Download `procurement-degree-hacker-pro.zip` and save it in Downloads. Double-click it in Finder. The extracted project folder is `procurement-degree-hacker-pro`. If Finder gives it another name because that folder already exists, use that actual folder name below; do not replace another project.
2. Install **Node.js 24 LTS** using the official macOS installer from https://nodejs.org/en/download. The cloud build used 24.19.0. Open a new Terminal after installation.
3. In Terminal:

```sh
node --version
npm --version
cd "$HOME/Downloads/procurement-degree-hacker-pro"
npm ci
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Keep that Terminal open. On **your Mac**, open `http://localhost:4173` in Safari or Chrome. This is the Mac's local address, not a preview of the Codex cloud machine. Press Control+C in Terminal to stop the server.

The included `dist/` is the previously validated production build. `preview` serves it without rebuilding. Its service worker supports offline use after the first complete load. Do not double-click `dist/index.html`; a file:// address is not the supported launch method. Use the same port and hostname every time so you keep the same browser storage origin.

For editing/development instead:

```sh
cd "$HOME/Downloads/procurement-degree-hacker-pro"
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

On your Mac, open `http://localhost:5173`. The development server is for live editing; offline PWA behavior is tested using the production build.

If you obtain only the source from GitHub rather than the ZIP, the ignored compiled `dist/` folder is not included. Run `npm ci`, then `npm run build` once on your Mac before using `npm run preview`. `npm run dev` can run directly after installing dependencies.

## Tests on your Mac (optional)

`npm test` runs the existing unit suite. The cloud Playwright configuration defaults to `/usr/bin/chromium`, which is not a macOS browser path. To run the existing browser suite with Google Chrome installed:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e
```

The browser suite builds and starts its own test preview. Do not run it on port 4173 while your personal preview server is using that port. Tests use fresh browser contexts and do not intentionally modify your personal browser data.

## Private access from Mac, iPhone and iPad

For the simplest private personal deployment, use **Tailscale Serve** with your Mac hosting the app:

1. Install Tailscale on the Mac, iPhone and iPad and connect them to the same private tailnet/account. Follow https://tailscale.com/kb/1080/cli if the `tailscale` command is not available in the Mac's Terminal.
2. Start the production preview on the Mac using the loopback command above. Keep the Mac on, awake, connected, and the server running.
3. In a second Terminal, run:

```sh
tailscale serve --bg http://127.0.0.1:4173
```

4. Follow Tailscale's prompt to enable HTTPS if required. Use the actual HTTPS URL printed by Tailscale on all three devices while connected to your tailnet. Serve stays private to authorized tailnet users/devices under your access policy; do not enable public Funnel for this use case.
5. On iPhone/iPad, open that HTTPS address in Safari, then Share → Add to Home Screen if desired.

This avoids public hosting and a custom domain, but depends on the Mac remaining available. `tailscale serve reset` removes the Serve configuration when you no longer want it.

For an always-on cloud option, use a static host such as Cloudflare Pages with an identity-aware access gate such as Cloudflare Access. Deploy the existing `dist/`, allow only your own login, and protect **every** production and preview hostname, including the default provider URL. A private GitHub repository alone does not make a deployed website private. Do not use a client-side password screen as access control. Domain/access setup and the provider's current plan requirements need configuration in that provider's account; nothing has been deployed there by this task.

## Important: access is not synchronization

The application stores data in IndexedDB on each device/browser, not a shared server. A private deployment makes the same app accessible everywhere but **does not synchronize your courses, progress or documents**.

Choose one device as your main record keeper. Use Settings & Backups → Export full backup, transfer the JSON securely (for example AirDrop or iCloud Drive), and Restore backup on another device when needed. Restore replaces that device's current records after validation; export its existing data first if it has unique changes. Keep off-device backups regularly. Changing from localhost to the Tailscale/cloud URL creates a separate browser origin; use backup/restore to move your records.
