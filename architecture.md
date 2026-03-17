### Architecture Notes

- `index.html` is the static shell. It only holds the canvas and HUD mount points.
- `styles.css` owns the fantasy HUD styling, responsive layout, and mobile control presentation.
- `main.js` is the entrypoint. It wires DOM state, input, movement, and the render loop.
- `app/content.js` is the single source of truth for portfolio copy, links, asset paths, and exhibit metadata.
- `app/dom.js` renders intro/inspect UI content and keeps DOM updates separate from scene logic.
- `app/settings.js` manages persisted experience settings such as reduced motion, sensitivity, and graphics quality.
- `app/world.js` builds the Three.js renderer, environment, terrain, and exhibit meshes.
- `app/render-utils.js` contains reusable texture/material helpers for labels, project cards, sigils, and portal effects.

#### Editing Content

- Update links, labels, contact info, intro copy, and exhibit descriptions in `app/content.js`.
- Update settings copy and utility labels in `app/content.js`; runtime defaults and persistence live in `app/settings.js`.
- Add or move a portfolio landmark by editing an exhibit entry in `app/content.js`, especially `type`, `position`, `accent`, and `actions`.
- Leave `app/world.js` alone unless you want to change scene composition or gameplay behavior.

### Accessibility Checklist

- Added dialog semantics, labels, and described-by relationships for the intro, settings, inspect, and fallback panels.
- Improved keyboard support with focus management for modal-style panels, Escape-based exits, and clearer focus return after panels close.
- Strengthened focus-visible styling, touch target sizing, and text contrast across the HUD and fallback portfolio.
- Clarified pointer-lock behavior in the UI so desktop users know how to enable mouse-look and how to exit it.
- Reduced HUD clutter while primary panels are open so recruiters and keyboard users are not competing with every overlay at once.
- Kept reduced-motion support for both the 3D experience and the fallback interface.
- Improved screen-reader support for the inspect prompt, fallback mode visibility, and WebGL failure handling.

#### Remaining 3D Limitations

- First-person exploration still relies on pointer lock for the best desktop experience, which is inherently less screen-reader-friendly than the fallback portfolio mode.
- The live 3D scene communicates spatial proximity visually and through interaction prompts, but it is not a full non-visual spatial navigation experience.
- The built-in 2D portfolio mode is the recommended path for users who prefer keyboard-only, screen-reader-first, or reduced-complexity navigation.

### Deployment

#### Before You Deploy

- Replace every `https://your-domain.com` placeholder in `index.html`, `robots.txt`, and `sitemap.xml`.
- Update the JSON-LD block in `index.html` if you want a different canonical URL, image URL, or social profile set.
- Keep the root file structure intact; this site is deployed directly as static HTML, CSS, JS, and assets.

#### Vercel

- Import the repository as a plain static project.
- If Vercel asks for a build command, leave it empty for this repo.
- Set the output directory to the repository root (`.`) because `index.html` already lives there.

#### Netlify

- Create a new site from the repository or drag the project folder into Netlify Drop.
- Leave the build command empty for this repo.
- Set the publish directory to the repository root (`.`).

#### GitHub Pages

- Push the repository to GitHub and enable Pages in the repository settings.
- Publish from the branch that contains the static files at the repository root.
- If you deploy to a project subpath instead of a custom domain, use that full subpath URL in the canonical, sitemap, and structured-data placeholders.
- Keep the included `.nojekyll` file so GitHub Pages serves the site without Jekyll processing.

### Production Readiness Checklist

- Keep runtime tunables in `app/config.js`; movement feel, interaction range, world size, and quality profiles now live there instead of being scattered through `main.js` and `app/world.js`.
- Run the built-in startup validation on page load by keeping `main.js` wired through `runStartupValidation()` in `app/validation.js`.
- Treat console warnings with the `[portfolio]` prefix as recoverable issues that should be fixed before deployment.
- Keep required asset paths populated in `app/content.js`; missing image paths now fall back to generated textures, but that is a safeguard, not the desired production state.
- Keep required exhibit fields populated in `app/content.js`; invalid exhibits are skipped during startup validation so one broken landmark does not break the whole experience.

### Manual QA Checklist

#### Desktop

- Load the site with a clean cache and confirm the intro panel, fallback CTA, and primary controls render without console errors.
- Enter the 3D world, enable mouse-look, confirm `Esc` releases pointer lock, and verify the settings panel still works after relocking.
- Walk to each landmark and confirm inspect prompts appear consistently, inspect panels open, and every CTA link resolves correctly.
- Toggle reduced motion, sensitivity, graphics quality, and debug metrics; confirm the scene updates without rebuild artifacts.
- Temporarily break one asset path in `app/content.js` and confirm the site stays usable with a warning and placeholder texture instead of crashing.
- Temporarily remove a non-essential exhibit field and confirm startup validation warns and skips only the broken exhibit.

#### Mobile

- Confirm the intro, fallback mode, and mobile HUD fit within the safe area in portrait and landscape.
- Verify touch look, movement buttons, sprint, and inspect remain usable without accidental browser gesture conflicts.
- Open and close inspect panels, fallback mode, and settings multiple times to confirm focus/state does not get stuck.
- Test on a lower-end device or throttled emulator with `low` quality and confirm the scene remains responsive and battery-conscious.
- Confirm the 2D fallback mode remains fully usable when the user never enters the 3D world.

### Deployment Checklist

- Replace every `https://your-domain.com` placeholder before shipping.
- Confirm `headshot.jpeg`, AWS badge images, favicon files, `robots.txt`, `sitemap.xml`, and `site.webmanifest` are present in the deployed root.
- Open the production URL and verify Open Graph image, title, description, and canonical URL resolve to the real domain.
- Check that the browser console is free of `[portfolio]` warnings in the expected happy path.
- Test one WebGL-capable browser and one no-WebGL or blocked-WebGL scenario to confirm the fallback portfolio opens automatically.
- Re-run the desktop and mobile QA checklist against the deployed domain, not just localhost.

### Known Limitations

- Texture load failures now degrade gracefully, but placeholder textures are still a sign of an asset-path or deployment problem that should be fixed.
- Startup validation protects against broken content and broken markup, but it cannot guarantee visual quality; a browser pass is still required before release.
- WebGL performance and tone mapping can vary by device and browser GPU stack, so final lighting and smoothness should be checked on real hardware.

---
