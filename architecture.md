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

---
