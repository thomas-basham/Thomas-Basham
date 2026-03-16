<h1 align="center">Hey, I'm Thomas Basham</h1>

<p align="center">
<img width="80"  src="aws-certified-cloud-practitioner.png" alt="AWS CCP badge"/> 
<img width="80"  src="aws-certified-solutions-architect-associate.png" alt="AWS SAA badge"/> 
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=24&pause=1000&color=F75C7E&center=true&vCenter=true&width=640&lines=Full+Stack+Engineer+%7C+Cloud+Developer;Python+%7C+JavaScript+%7C+TypeScript+%7C+SQL;React+%7C+Next.js+%7C+Express+%7C+Django+%7C+FastAPI;AWS+%7C+GCP+%7C+Docker;I+build+clean%2C+scalable+cloud-native+apps" alt="Typing SVG" />
</p>

---

### About Me

```ts
const thomas = {
  name: "Thomas Basham",
  title: "Full Stack Engineer & Cloud Developer",
  location: "Renton, WA",
  languages: ["Python", "JavaScript", "TypeScript", "SQL", "Bash"],
  frameworks: ["React", "Next.js", "Node.js", "Express", "Django", "FastAPI"],
  cloud: ["AWS", "GCP", "Docker"],
  AI: ["Codex", "Claude Code", "Gemini"],
};
```

---

### Current Stack

| **Category**       | **Tech**                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **Frontend**       | React, Next.js, TailwindCSS, SWR, Redis                                                         |
| **Backend**        | Node.js, Express Or Python, FastAPI/Django                                                   |
| **Cloud & DevOps** | AWS (Lambda, RDS, DynamoDB, API Gateway, IAM, CloudFormation, ECS, EC2), Docker, GitHub Actions |

---

### Projects

- **[Troutlytics](https://github.com/troutlytics/troutlytics-frontend)**  
  Data-driven fishing app with real-time trout stocking insights and analytics.

- **[Puget Sound Creel Reports](https://github.com/thomas-basham/ps-creel)**  
  Web app that aggregates and visualizes boat-ramp creel (angler survey) data across Puget Sound.

---

### Stats & Activity

<p align="center">
  <img src="https://github-readme-stats.vercel.app/api?username=thomas-basham&show_icons=true&theme=radical&hide_border=true" alt="GitHub Stats"/>
  <br />
  <img src="https://github-readme-streak-stats.herokuapp.com?user=thomas-basham&theme=radical&hide_border=true" alt="GitHub Streak"/>
  <br />
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=thomas-basham&layout=compact&theme=radical&hide_border=true" alt="Top Langs"/>
</p>

---

### What I'm Up To

- Studying ML and AI concepts
- Building a cloud-native data pipeline with Fargate + Aurora
- Mentoring devs and building clean, testable code
- Saving up for my dream boat

---

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

### Let's Connect

<p align="left">
  <a href="https://www.linkedin.com/in/thomas-basham" target="_blank">
    <img alt="LinkedIn" title="Connect with me" src="https://img.shields.io/badge/LinkedIn-blue?logo=linkedin&style=for-the-badge" />
  </a>
  <a href="https://thomasbasham.dev" target="_blank">
    <img alt="Website" title="Visit my site" src="https://img.shields.io/badge/Portfolio-black?logo=github&style=for-the-badge" />
  </a>
  <a href="mailto:bashamtg@gmail.com">
    <img alt="Email" title="Email me" src="https://img.shields.io/badge/Email-red?logo=gmail&style=for-the-badge" />
  </a>
</p>

---

### Motto I Code By

> “Build it like someone else has to maintain it.  
> Scale it like a thousand people will use it tomorrow.”

---

### Personal Interests

River Rafting  
Kayaking  
Fishing Puget Sound  
Teaching Devs  
Making Music  
Automating All the Things

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=F75C7E&height=100&section=footer" />
</p>
