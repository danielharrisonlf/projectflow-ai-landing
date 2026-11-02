# ProjectFlow AI landing QA

**Result:** passed in Chromium against the production build at `http://localhost:3000` on 2026-11-02.

`npm test` completed with **10 passed, 0 failed**. The suite covers:

- Light, dark, and system theme switching, including persistence after reload and response to system preference changes.
- Hero tab keyboard navigation and light/dark screenshot switching.
- Mobile navigation dismissal with Escape and focus returned to the menu trigger.
- The landing page MCP CTA opening the static demo, then running `tasks_list` and rendering a successful JSON result.
- No document-level horizontal overflow at 360, 390, 768, 1440, and 1920 px.
- All light and dark product screenshots decoding, local IBM Plex fonts loading, and no failed requests, console errors, or uncaught page errors.
- Title, description, canonical URL, Open Graph title/description, and a reachable Open Graph image.
- Axe WCAG 2 A/AA and WCAG 2.1 A/AA / WCAG 2.2 AA checks in both light and dark themes. No violations were reported.

## First-run findings and fixes

The initial run had 6 failures and 4 passes. Two were application defects: at 360 and 390 px the document reported a 575 px scroll width, and the CTA’s `/demo/` path ended in a 404. The root agent fixed the matrix overflow and corrected the demo link/redirect. Both now pass in the final run.

The other initial failures were test assumptions: optimized Next image URLs encode their original source path, the menu button changes its accessible name while open, the canonical URL has no trailing slash, the OG title is the page headline, the MCP example arguments are `project: PCL` and `status: in_progress`, and hidden screenshots should be loaded through image decoding instead of scrolled into view. The spec now reflects those behaviors.

## Full-page screenshots

- Desktop, light: [landing-desktop-light.png](landing-desktop-light.png) — 1440 px wide
- Desktop, dark: [landing-desktop-dark.png](landing-desktop-dark.png) — 1440 px wide
- Mobile, light: [landing-mobile-light.png](landing-mobile-light.png) — 390 px wide
- Mobile, dark: [landing-mobile-dark.png](landing-mobile-dark.png) — 390 px wide

To rerun, build the app, start the production server on port 3000, then run `npm test` from the landing project directory. `BASE_URL` can override the test server URL.
