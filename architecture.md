# Portfolio Architecture

## Project Overview

This project is a static portfolio site with two entry paths:

- A first-person Three.js world that presents portfolio content as landmarks in a fantasy environment.
- A recruiter-friendly 2D fallback mode for users who cannot or do not want to use the 3D experience.

There is no framework, no build step, and no runtime dependency installation required for deployment. The site ships as plain HTML, CSS, JavaScript, and static assets.

## File Structure

- `index.html`: static document shell, SEO metadata, canvas mount, HUD markup, fallback mode markup.
- `styles.css`: all layout, HUD, fallback-mode, motion, and responsive styling.
- `main.js`: app bootstrap, input, panel state, pointer lock flow, fallback-mode switching, render loop.
- `app/content.js`: single source of truth for portfolio copy, links, assets, and landmark content.
- `app/config.js`: central runtime tunables for movement, interaction, quality, and startup validation.
- `app/dom.js`: DOM lookup and UI rendering helpers for intro, inspect, fallback, settings, and metrics.
- `app/settings.js`: persisted user settings and adaptive default quality selection.
- `app/validation.js`: startup validation, recoverable warnings, and content sanitization.
- `app/render-utils.js`: shared material, texture, and canvas-texture helpers.
- `app/world.js`: Three.js world creation, scenery, lighting, exhibits, collision, and ambient motion.
- `app/three.js`: pinned CDN import for Three.js.

## Controls

### Desktop

- `W`, `A`, `S`, `D`: move
- `Shift`: sprint
- `E`: inspect or close a nearby landmark
- `,`: open settings
- `` ` ``: toggle runtime metrics
- `Esc`: release mouse-look or close the active panel where applicable

Mouse-look is opt-in. Users must click `Enable Mouse-Look` or the canvas to enter pointer lock.

### Mobile

- Left control pad: movement
- Right control pad: turn and look
- `Run`: sprint
- `Inspect`: open the current landmark when in range
- Drag on the canvas: touch look

## Content Editing Instructions

Most portfolio edits should happen in `app/content.js`.

### Update portfolio text and links

- Edit `portfolioContent.links` for GitHub, LinkedIn, resume, and email destinations.
- Edit `portfolioContent.intro`, `portfolioContent.fallbackMode`, `portfolioContent.fallbackCta`, and `portfolioContent.utility` for UI copy.
- Edit `portfolioContent.seo` for titles, descriptions, canonical URL placeholders, and theme color.

### Update landmarks and project content

Each exhibit in `portfolioContent.exhibits` maps to one landmark in the 3D world and one card or section in fallback mode.

Important fields:

- `id`: stable internal key
- `type`: one of `portrait`, `grove`, `sanctum`, `project`, `portal`
- `zone`: landmark zone label
- `title`, `kicker`, `body`: main content
- `bullets`: supporting points
- `actions`: CTA buttons or links
- `accent`: zone color
- `position.x`, `position.z`: world placement
- `colliderRadius`: interaction/collision footprint

Optional fields:

- `labelEyebrow`
- `featuredTag`
- `featuredRank`
- `glyph`
- `sigils`
- `emphasisScale`

Startup validation will warn about bad content and skip invalid exhibits instead of breaking the whole site.

## Local Dev Instructions

This site should be served from a local HTTP server because ES modules and asset loading are browser-restricted on `file://`.

From the repo root:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

Notes:

- No build step is required.
- No bundler is required.
- If you prefer another static server, any equivalent tool is fine.

## Deployment Instructions

### General

- Deploy the repository root as a static site.
- Do not add a build command unless your host requires a no-op.
- Replace every `https://your-domain.com` placeholder before going live.

### Vercel

- Import the repo as a static project.
- Leave the build command empty.
- Use `.` as the output directory.

### Netlify

- Create a new site from the repository.
- Leave the build command empty.
- Use `.` as the publish directory.

### GitHub Pages

- Publish from the branch that contains the static files at the repository root.
- Keep `.nojekyll` in place.
- If deploying under a project subpath, update canonical URLs, sitemap entries, and structured data to use that full path.

## Performance Notes

- Quality defaults are adaptive. Mobile and coarse-pointer devices start lower than desktop by design.
- Static scenery is batched where possible to reduce draw calls.
- Canvas-generated UI textures are cached by quality level.
- The render loop is paused while the 2D fallback mode is open.
- Lower quality modes reduce pixel ratio, shadow cost, pulsing-light cost, and texture work.

Practical guidance:

- Keep new landmarks limited and intentional.
- Reuse existing helper builders before adding new mesh patterns.
- Avoid adding large transparent effects or new shadow-casting lights without checking mobile behavior.

## Accessibility Notes

- The 2D fallback mode is the primary accessible review path.
- Intro, settings, inspect, and fallback panels use dialog semantics and focus management.
- Reduced-motion preferences are respected in both CSS and runtime behavior.
- Pointer lock is explained in the UI and is never forced automatically on page load.
- The 3D experience remains visually and spatially oriented, so it is not a full screen-reader-first navigation model.

## Final Launch Checklist

- Replace all placeholder production URLs in `index.html`, `robots.txt`, `sitemap.xml`, and `app/content.js` as needed.
- Open the deployed site on desktop and verify intro, fallback mode, inspect panels, settings, and pointer lock all behave correctly.
- Open the deployed site on mobile and verify touch look, movement, sprint, inspect, and fallback mode remain usable.
- Check the browser console on the happy path and confirm there are no `[portfolio]` warnings.
- Verify resume, GitHub, LinkedIn, and email CTAs from the intro, fallback mode, and contact landmark.
- Confirm `headshot.jpeg`, AWS badge images, favicon files, `robots.txt`, `sitemap.xml`, and `site.webmanifest` are served correctly.
- Test one WebGL failure scenario and confirm the site falls back automatically to the 2D portfolio.
- Review the actual live page title, description, canonical URL, Open Graph image, and Twitter card metadata against the production domain.

## Acceptable v1 Limitations

- The 3D scene still depends on real browser and GPU behavior, so final visual tuning should be checked on at least one laptop and one phone.
- Pointer lock can still be blocked by browser policy or gesture timing, but the UI now explains the failure and the site remains fully usable.
- Placeholder textures and skipped exhibits fail safely, but they indicate content or deployment mistakes that should be fixed before launch.
- The fallback mode is strong, but the 3D world is still the more visually expressive path and will always require some tradeoff against absolute accessibility.
