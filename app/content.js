export const portfolioContent = {
  brand: {
    eyebrow: "Fantasy Portfolio",
    title: "Thomas Basham",
  },
  status: {
    defaultZoneName: "Arrival Meadow",
    defaultZoneDistance: "Follow the lantern path into the realm.",
    lostZoneName: "Wandering the Wilds",
    lostZoneDistance: "The lantern trail has faded.",
  },
  controls: {
    eyebrow: "Controls",
    desktop:
      "WASD moves. Mouse looks. Shift sprints. E inspects nearby landmarks. Esc releases the cursor.",
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
    eyebrow: "Enter the Realm",
    title: "The portfolio is now a playable world.",
    body:
      "Walk a fantasy landscape in first person. Each shrine holds part of the portfolio: projects, current stack, AWS credentials, and contact portals.",
    cards: [
      {
        title: "Desktop",
        body: "WASD move, mouse look, shift sprint, E inspect, Esc releases the cursor.",
      },
      {
        title: "Mobile",
        body: "Use the on-screen sigils to move, Run to sprint, and drag the world to look around.",
      },
    ],
    actions: [
      {
        type: "button",
        id: "enterRealm",
        label: "Enter the Realm",
        variant: "primary",
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
      title: "Thomas Basham",
      kicker: "Full Stack Engineer | Cloud Developer | AWS Certified",
      body:
        "I build cloud-native apps with a maintainer's mindset: clear architecture, practical systems design, and code that can survive growth.",
      bullets: [
        "Frontend: React, Next.js, TypeScript, TailwindCSS, SWR.",
        "Backend: Node.js, Express, Python, FastAPI, Django, SQL.",
        "Cloud: AWS, GCP, Docker, GitHub Actions, scalable delivery pipelines.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "resume",
          label: "Resume",
        },
        {
          type: "link",
          hrefKey: "email",
          label: "Email",
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
      title: "Current Stack",
      kicker: "Modern web systems with room to scale",
      body:
        "My core stack stays grounded in shipping. I care about fast interfaces, reliable back ends, and cloud infrastructure that does not become a liability later.",
      bullets: [
        "React, Next.js, Node.js, Express, FastAPI, Django.",
        "AWS services across Lambda, ECS, EC2, RDS, DynamoDB, API Gateway, and IAM.",
        "Current focus: AI workflows, data pipelines, and cleaner automation.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "github",
          label: "GitHub",
        },
      ],
      accent: "#8cc485",
      position: {
        x: -24,
        z: 13,
      },
      colliderRadius: 4,
    },
    {
      id: "certifications",
      type: "sanctum",
      zone: "Cloud Sanctum",
      title: "AWS Certifications",
      kicker: "Proof that the cloud work is not just theory",
      body:
        "The sanctum displays two AWS badges and the infrastructure bias behind them: architecting systems, choosing services intentionally, and shipping with operational discipline.",
      bullets: [
        "AWS Certified Cloud Practitioner.",
        "AWS Certified Solutions Architect Associate.",
        "Hands-on work with containerized workloads, databases, and secure service boundaries.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "linkedin",
          label: "LinkedIn",
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
      title: "Troutlytics",
      kicker: "Data-driven fishing app for real-world use",
      body:
        "A product-focused app with real-time trout stocking insights and analytics. Built around turning raw updates into something genuinely useful for anglers.",
      bullets: [
        "Domain-specific UX grounded in outdoor data.",
        "Clean presentation of changing data and practical insights.",
        "A project that balances utility, clarity, and speed.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "troutlytics",
          label: "View Project",
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
      title: "Puget Sound Creel Reports",
      kicker: "Geospatial ramp and survey data, made legible",
      body:
        "A web app that aggregates and visualizes boat-ramp creel survey data across Puget Sound so anglers can move from scattered reports to useful signal.",
      bullets: [
        "Geospatial data thinking applied to a real local domain.",
        "Interfaces shaped around search, exploration, and decision support.",
        "Turns public fisheries data into something more actionable.",
      ],
      actions: [
        {
          type: "link",
          hrefKey: "creelReports",
          label: "View Project",
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
      title: "Let's Connect",
      kicker: "The exits from the realm",
      body:
        "If you want code, context, or a direct conversation, the nexus opens the clean paths out: GitHub, LinkedIn, email, and the full resume.",
      bullets: [
        "GitHub for source and side projects.",
        "LinkedIn for work history and network.",
        "Email for direct contact and collaboration.",
      ],
      actions: [
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
          label: "Email",
        },
        {
          type: "link",
          hrefKey: "resume",
          label: "Resume",
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
