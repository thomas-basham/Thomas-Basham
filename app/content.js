export const portfolioContent = {
  brand: {
    eyebrow: "Full Stack Developer Portfolio",
    title: "Thomas Basham",
  },
  status: {
    defaultZoneName: "Arrival Meadow",
    defaultZoneDistance: "Follow the lantern path to featured work, current focus, certifications, and direct contact.",
    lostZoneName: "Wandering the Wilds",
    lostZoneDistance: "The main path is behind you. Featured work and contact remain ahead.",
  },
  controls: {
    eyebrow: "Controls",
    desktop:
      "WASD moves. Mouse looks. Shift sprints. E inspects nearby landmarks. Esc releases the cursor. Press ` to toggle metrics.",
    mobile:
      "Use the movement sigils, drag to look, tap Run to sprint, and tap Inspect near a landmark.",
  },
  utility: {
    settingsButton: "Settings",
    pointerLockedLabel: "Release Cursor",
    pointerUnlockedLabel: "Capture Cursor",
    pointerLockedHint: "Mouse-look is active. Press Esc to release the cursor.",
    pointerUnlockedHint: "Capture the cursor for full first-person mouse-look.",
    mobileHint: "Touch look stays active. Adjust sensitivity or motion below.",
  },
  settings: {
    eyebrow: "Journey Settings",
    title: "Experience Tuning",
    reducedMotion: {
      label: "Reduced Motion",
      description: "Reduces camera bob, sprint zoom, and ambient motion.",
      on: "On",
      off: "Off",
    },
    sensitivity: {
      label: "Look Sensitivity",
      options: [
        { id: "low", label: "Low" },
        { id: "normal", label: "Normal" },
        { id: "high", label: "High" },
      ],
    },
    graphics: {
      label: "Graphics Quality",
      options: [
        { id: "low", label: "Low" },
        { id: "medium", label: "Medium" },
        { id: "high", label: "High" },
      ],
    },
  },
  intro: {
    eyebrow: "Enter the Portfolio",
    title: "A professional portfolio, staged as a playable world.",
    body:
      "Recruiters, hiring managers, and clients can explore the world in first person or use the fast path. The landmarks are organized around featured projects, current focus, core stack, AWS credentials, and direct contact.",
    cards: [
      {
        title: "Featured Projects",
        body: "Start with the flagship case studies to see product thinking, data work, and full-stack delivery in real-world domains.",
      },
      {
        title: "Current Focus",
        body: "The Builder's Beacon covers what Thomas is building now: AI-assisted workflows, cloud-native apps, and developer education.",
      },
      {
        title: "Direct Review",
        body: "If you do not want to navigate the world, use the quick links for resume, GitHub, LinkedIn, and contact.",
      },
    ],
    actions: [
      {
        type: "button",
        id: "enterRealm",
        label: "Explore the World",
        variant: "primary",
      },
      {
        type: "link",
        hrefKey: "resume",
        label: "Open Resume",
      },
      {
        type: "link",
        hrefKey: "email",
        label: "Email Thomas",
      },
    ],
  },
  fallbackCta: {
    eyebrow: "Prefer the Fast Path?",
    title: "Skip the Walkthrough",
    body:
      "Open the resume, review profiles, or start a direct conversation without navigating the 3D world.",
    actions: [
      {
        type: "link",
        hrefKey: "resume",
        label: "Resume",
      },
      {
        type: "link",
        hrefKey: "github",
        label: "GitHub",
      },
      {
        type: "link",
        hrefKey: "linkedin",
        label: "LinkedIn",
      },
      {
        type: "link",
        hrefKey: "email",
        label: "Contact",
      },
    ],
  },
  prompt: {
    eyebrow: "Nearby Landmark",
    defaultTitle: "Inspect",
    desktopHint: "Press E to inspect",
    mobileHint: "Tap to inspect this landmark",
  },
  inspect: {
    defaultZone: "Landmark",
    closeLabel: "Continue Exploring",
  },
  mobileActions: {
    sprint: "Run",
    inspect: "Inspect",
  },
  debug: {
    title: "Runtime Metrics",
    fpsLabel: "FPS",
    qualityLabel: "Quality",
    drawsLabel: "Draws",
    trianglesLabel: "Triangles",
  },
  noScript:
    "JavaScript is required for the 3D portfolio. Please enable it to explore the scene.",
  links: {
    github: "https://github.com/thomas-basham",
    linkedin: "https://linkedin.com/in/thomas-basham",
    email: "mailto:bashamtg@gmail.com",
    resume:
      "https://docs.google.com/document/d/1r2gCG-SukSTMMatzpvsP5FPkeMxlnhf3ZzH7Da187Fo/edit?usp=sharing",
    troutlytics: "https://github.com/troutlytics/troutlytics-frontend",
    creelReports: "https://github.com/thomas-basham/ps-creel",
  },
  assets: {
    headshot: "./headshot.jpeg",
    badges: {
      cloud: "./aws-certified-cloud-practitioner.png",
      architect: "./aws-certified-solutions-architect-associate.png",
    },
  },
  exhibits: [
    {
      id: "about",
      type: "portrait",
      zone: "Hall of the Builder",
      labelEyebrow: "Full Stack Developer",
      title: "Thomas Basham",
      kicker: "Full stack developer with cloud depth, AWS certifications, and a teacher's clarity",
      body:
        "I build useful web products end to end: frontend experience, backend systems, data workflows, and cloud delivery. The through-line in my work is practical engineering, clear communication, and systems that stay understandable after launch.",
      bullets: [
        "Frontend: React, Next.js, TypeScript, and UI systems designed for speed, clarity, and maintainability.",
        "Backend: Node.js, Express, Python, FastAPI, Django, SQL, and data-heavy application flows.",
        "Cloud: AWS-certified delivery across compute, databases, IAM, automation, and deployment pipelines.",
        "Teaching experience: I explain technical decisions clearly, which helps teams, clients, and stakeholders move faster with confidence.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "resume",
          label: "Open Resume",
        },
        {
          type: "link",
          hrefKey: "email",
          label: "Start a Conversation",
        },
        {
          type: "link",
          hrefKey: "linkedin",
          label: "View LinkedIn",
        },
      ],
      accent: "#f4dca9",
      position: {
        x: 0,
        z: 8,
      },
      colliderRadius: 4.4,
    },
    {
      id: "skills",
      type: "grove",
      zone: "Skill Grove",
      labelEyebrow: "Core Stack",
      title: "How I Build",
      kicker: "Modern full-stack delivery with cloud discipline",
      body:
        "My stack choices favor shipping speed now and maintainability later. I like tooling that helps products move quickly without pushing complexity into operations, documentation, or handoff.",
      bullets: [
        "Frontend: React, Next.js, TypeScript, TailwindCSS, and responsive product UI work.",
        "Backend: Node.js, Express, Python, FastAPI, Django, API design, data handling, and automation.",
        "Cloud: AWS services including Lambda, ECS, EC2, RDS, DynamoDB, API Gateway, IAM, plus Docker and GitHub Actions.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "github",
          label: "Browse GitHub",
        },
        {
          type: "link",
          hrefKey: "linkedin",
          label: "View LinkedIn",
        },
      ],
      sigils: ["React", "AWS", "API"],
      accent: "#8cc485",
      position: {
        x: -24,
        z: 13,
      },
      colliderRadius: 4,
    },
    {
      id: "focus",
      type: "grove",
      zone: "Builder's Beacon",
      labelEyebrow: "Current Focus",
      title: "Now Building",
      kicker: "AI workflows, cloud-native apps, and developer education",
      body:
        "Right now I am most interested in work that combines product usefulness with operational clarity: AI-assisted workflows, data-informed web applications, and cloud systems that teams can actually maintain. I also care about teaching developers how to make sound technical decisions under real constraints.",
      bullets: [
        "AI-assisted tooling and workflow automation that removes repetitive manual work.",
        "Cloud-first applications with practical architecture, clean interfaces, and sensible deployment paths.",
        "Teaching and mentoring that turns technical complexity into clear action for teams and clients.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "email",
          label: "Discuss Current Work",
        },
        {
          type: "link",
          hrefKey: "resume",
          label: "Open Resume",
        },
      ],
      sigils: ["AI", "Cloud", "Teach"],
      emphasisScale: 1.08,
      accent: "#d7c98b",
      position: {
        x: 0,
        z: -18,
      },
      colliderRadius: 4.3,
    },
    {
      id: "certifications",
      type: "sanctum",
      zone: "Cloud Sanctum",
      labelEyebrow: "AWS Certified",
      title: "AWS Certifications",
      kicker: "Credentials that reinforce hands-on cloud engineering",
      body:
        "The certifications matter because they match how I already like to work: choose services intentionally, keep system boundaries clear, and build with operational responsibility in mind.",
      bullets: [
        "AWS Certified Cloud Practitioner.",
        "AWS Certified Solutions Architect Associate.",
        "Hands-on cloud work across compute, databases, IAM, deployment flows, and secure service boundaries.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "linkedin",
          label: "Verify on LinkedIn",
        },
        {
          type: "link",
          hrefKey: "resume",
          label: "Open Resume",
        },
      ],
      accent: "#9bd2d9",
      position: {
        x: 24,
        z: 13,
      },
      colliderRadius: 4.6,
    },
    {
      id: "troutlytics",
      type: "project",
      zone: "River Forge",
      labelEyebrow: "Featured Project",
      featuredTag: "Featured Project",
      featuredRank: 2,
      emphasisScale: 1.08,
      title: "Troutlytics",
      kicker: "Turns Washington trout stocking updates into a product people can actually use",
      body:
        "Stocking information exists, but it is rarely presented in a way that helps anglers make faster decisions. Troutlytics turns that moving data into a cleaner web experience focused on timing, discovery, and repeat usefulness in the field.",
      bullets: [
        "Problem: time-sensitive fish-stocking data is hard to turn into confident trip planning.",
        "Solution: a product-focused web experience that surfaces recent activity, organizes the data, and keeps the signal readable.",
        "Stack and value: TypeScript-based frontend work, domain-focused UI, and product thinking aimed at practical repeat use.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "troutlytics",
          label: "Review Repository",
        },
        {
          type: "link",
          hrefKey: "email",
          label: "Discuss This Build",
        },
      ],
      accent: "#dd8a4c",
      glyph: "TL",
      position: {
        x: -18,
        z: -11,
      },
      colliderRadius: 4.1,
    },
    {
      id: "creel",
      type: "project",
      zone: "Sound Observatory",
      labelEyebrow: "Flagship Project",
      featuredTag: "Flagship Project",
      featuredRank: 1,
      emphasisScale: 1.16,
      title: "Puget Sound Creel Reports",
      kicker: "Makes fragmented public fisheries data searchable, visual, and decision-ready",
      body:
        "Public creel and boat-ramp data is valuable, but scattered sources make it hard to explore or compare. This project pulls those inputs into a single web application so users can search, interpret, and act on the information with much less friction.",
      bullets: [
        "Problem: useful Puget Sound fisheries data is spread across public sources and difficult to work with quickly.",
        "Solution: a search- and exploration-driven application that organizes location data and survey context into one workflow.",
        "Stack and value: full-stack web engineering, geospatial data handling, and practical UI design for a real local use case.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "creelReports",
          label: "Review Repository",
        },
        {
          type: "link",
          hrefKey: "email",
          label: "Discuss This Build",
        },
      ],
      accent: "#76c4d2",
      glyph: "PS",
      position: {
        x: 18,
        z: -11,
      },
      colliderRadius: 4.1,
    },
    {
      id: "contact",
      type: "portal",
      zone: "Portal Nexus",
      labelEyebrow: "Direct Contact",
      title: "Let's Connect",
      kicker: "Direct paths for recruiting conversations, client work, and technical follow-up",
      body:
        "If you want the concise version, use the portal. Resume, GitHub, LinkedIn, and email are all here so you can review the work or start a conversation without wandering the world.",
      bullets: [
        "Resume for experience, stack, projects, and AWS credentials.",
        "GitHub for repositories, implementation style, and side work.",
        "LinkedIn and email for recruiting conversations, collaborations, and client inquiries.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "github",
          label: "View GitHub",
        },
        {
          type: "link",
          hrefKey: "linkedin",
          label: "View LinkedIn",
        },
        {
          type: "link",
          hrefKey: "email",
          label: "Email Thomas",
        },
        {
          type: "link",
          hrefKey: "resume",
          label: "Open Resume",
        },
      ],
      accent: "#f0b56b",
      position: {
        x: 0,
        z: -30,
      },
      colliderRadius: 5.2,
    },
  ],
};
