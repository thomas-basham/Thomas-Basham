import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const canvas = document.getElementById("world");
const body = document.body;
const introPanel = document.getElementById("intro-panel");
const enterRealmButton = document.getElementById("enter-realm");
const inspectPanel = document.getElementById("inspect-panel");
const inspectZone = document.getElementById("inspect-zone");
const inspectTitle = document.getElementById("inspect-title");
const inspectKicker = document.getElementById("inspect-kicker");
const inspectBody = document.getElementById("inspect-body");
const inspectBullets = document.getElementById("inspect-bullets");
const inspectActions = document.getElementById("inspect-actions");
const inspectPrompt = document.getElementById("inspect-prompt");
const promptTitle = document.getElementById("prompt-title");
const promptHint = document.getElementById("prompt-hint");
const zoneName = document.getElementById("zone-name");
const zoneDistance = document.getElementById("zone-distance");
const controlsCopy = document.getElementById("controls-copy");
const crosshair = document.getElementById("crosshair");

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const WORLD_RADIUS = 88;
const EYE_HEIGHT = 1.72;
const INTERACT_DISTANCE = 7.25;
const TURN_SPEED = 1.55;
const LOOK_SPEED = 1.15;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = !isTouchDevice;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x30515c);
scene.fog = new THREE.FogExp2(0x4f7380, 0.012);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

const playerRig = new THREE.Group();
const yawRig = new THREE.Group();
const pitchRig = new THREE.Group();
scene.add(playerRig);
playerRig.add(yawRig);
yawRig.add(pitchRig);
pitchRig.add(camera);
camera.position.set(0, EYE_HEIGHT, 0);
pitchRig.rotation.x = -0.08;
playerRig.position.set(0, terrainHeight(0, 28), 28);

const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

const controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  turnLeft: false,
  turnRight: false,
  lookUp: false,
  lookDown: false,
};

const state = {
  activeExhibit: null,
  nearbyExhibit: null,
  pointerLocked: false,
  introOpen: true,
  bobTimer: 0,
  touchLookId: null,
  lastTouchX: 0,
  lastTouchY: 0,
};

const moveVelocity = new THREE.Vector3();
const floaters = [];
const pulsingLights = [];
const obstacleFields = [];

const materials = {
  stone: new THREE.MeshStandardMaterial({
    color: 0x52655d,
    roughness: 0.98,
    metalness: 0.03,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    color: 0x2d3935,
    roughness: 1,
    metalness: 0.02,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xb99153,
    roughness: 0.32,
    metalness: 0.72,
  }),
  slate: new THREE.MeshStandardMaterial({
    color: 0x41515b,
    roughness: 0.76,
    metalness: 0.16,
  }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x9dc5c8,
    roughness: 0.16,
    metalness: 0.2,
    transparent: true,
    opacity: 0.82,
    emissive: new THREE.Color(0x25484e),
    emissiveIntensity: 0.8,
  }),
  bark: new THREE.MeshStandardMaterial({
    color: 0x5b4430,
    roughness: 1,
    metalness: 0.02,
  }),
  foliage: new THREE.MeshStandardMaterial({
    color: 0x5f8161,
    roughness: 1,
    metalness: 0.02,
  }),
};

const headshotTexture = loadTexture("./headshot.jpeg");
const badgeCloudTexture = loadTexture("./aws-certified-cloud-practitioner.png");
const badgeArchitectTexture = loadTexture(
  "./aws-certified-solutions-architect-associate.png"
);

const exhibits = [
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
        label: "Open Resume",
        href:
          "https://docs.google.com/document/d/1r2gCG-SukSTMMatzpvsP5FPkeMxlnhf3ZzH7Da187Fo/edit?usp=sharing",
      },
      {
        label: "Email Thomas",
        href: "mailto:bashamtg@gmail.com",
      },
    ],
    accent: "#f4dca9",
    position: new THREE.Vector3(0, 0, 8),
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
        label: "Browse GitHub",
        href: "https://github.com/thomas-basham",
      },
    ],
    accent: "#8cc485",
    position: new THREE.Vector3(-24, 0, 13),
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
        label: "View LinkedIn",
        href: "https://linkedin.com/in/thomas-basham",
      },
    ],
    accent: "#9bd2d9",
    position: new THREE.Vector3(24, 0, 13),
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
        label: "View Project",
        href: "https://github.com/troutlytics/troutlytics-frontend",
      },
    ],
    accent: "#dd8a4c",
    glyph: "TL",
    position: new THREE.Vector3(-18, 0, -11),
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
        label: "View Project",
        href: "https://github.com/thomas-basham/ps-creel",
      },
    ],
    accent: "#76c4d2",
    glyph: "PS",
    position: new THREE.Vector3(18, 0, -11),
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
        label: "GitHub",
        href: "https://github.com/thomas-basham",
      },
      {
        label: "LinkedIn",
        href: "https://linkedin.com/in/thomas-basham",
      },
      {
        label: "Email",
        href: "mailto:bashamtg@gmail.com",
      },
      {
        label: "Resume",
        href:
          "https://docs.google.com/document/d/1r2gCG-SukSTMMatzpvsP5FPkeMxlnhf3ZzH7Da187Fo/edit?usp=sharing",
      },
    ],
    accent: "#f0b56b",
    position: new THREE.Vector3(0, 0, -30),
    colliderRadius: 5.2,
  },
];

controlsCopy.textContent = isTouchDevice
  ? "Use the movement sigils, drag to look, and tap a landmark prompt to inspect."
  : "WASD moves. Mouse looks. Shift sprints. E inspects nearby landmarks.";
crosshair.classList.toggle("hidden", isTouchDevice);

createSkyDome();
createLighting();
createGround();
createStonePaths();
createLanternPath();
createForestRing();
createFloatingIslands();
createDistantStructures();
createStarField();

const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
fontsReady.finally(() => {
  createExhibits();
  updateNearestLandmark();
});

setPromptVisibility(false);
updateNearestLandmark();

enterRealmButton.addEventListener("click", () => {
  state.introOpen = false;
  introPanel.classList.add("hidden");
  if (!isTouchDevice) {
    requestPointerLock();
  }
});

inspectPrompt.addEventListener("click", () => {
  if (state.nearbyExhibit) {
    openExhibit(state.nearbyExhibit);
  }
});

canvas.addEventListener("click", () => {
  if (!state.introOpen && !state.activeExhibit && !isTouchDevice) {
    requestPointerLock();
  }
});

canvas.addEventListener("pointerdown", (event) => {
  if (!isTouchDevice || state.activeExhibit || state.introOpen) {
    return;
  }

  state.touchLookId = event.pointerId;
  state.lastTouchX = event.clientX;
  state.lastTouchY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!isTouchDevice || state.touchLookId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - state.lastTouchX;
  const deltaY = event.clientY - state.lastTouchY;
  state.lastTouchX = event.clientX;
  state.lastTouchY = event.clientY;
  yawRig.rotation.y -= deltaX * 0.0065;
  pitchRig.rotation.x = THREE.MathUtils.clamp(
    pitchRig.rotation.x - deltaY * 0.0045,
    -1.05,
    1.05
  );
});

canvas.addEventListener("pointerup", endTouchLook);
canvas.addEventListener("pointercancel", endTouchLook);

document.addEventListener("pointerlockchange", () => {
  state.pointerLocked = document.pointerLockElement === canvas;
  body.classList.toggle("is-locked", state.pointerLocked);
});

document.addEventListener("mousemove", (event) => {
  if (!state.pointerLocked) {
    return;
  }

  yawRig.rotation.y -= event.movementX * 0.0022;
  pitchRig.rotation.x = THREE.MathUtils.clamp(
    pitchRig.rotation.x - event.movementY * 0.0017,
    -1.05,
    1.05
  );
});

document.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  switch (event.code) {
    case "KeyW":
      controls.forward = true;
      break;
    case "KeyS":
      controls.backward = true;
      break;
    case "KeyA":
      controls.left = true;
      break;
    case "KeyD":
      controls.right = true;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      controls.sprint = true;
      break;
    case "KeyE":
      if (state.activeExhibit) {
        closeExhibit(true);
      } else if (state.nearbyExhibit) {
        openExhibit(state.nearbyExhibit);
      }
      break;
    case "Escape":
      if (state.activeExhibit) {
        closeExhibit(false);
      }
      break;
    default:
      break;
  }
});

document.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyW":
      controls.forward = false;
      break;
    case "KeyS":
      controls.backward = false;
      break;
    case "KeyA":
      controls.left = false;
      break;
    case "KeyD":
      controls.right = false;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      controls.sprint = false;
      break;
    default:
      break;
  }
});

window.addEventListener("blur", clearMovement);
window.addEventListener("resize", onResize);

document.querySelectorAll("[data-control]").forEach((button) => {
  const { control } = button.dataset;
  const activate = (event) => {
    event.preventDefault();
    controls[control] = true;
    button.classList.add("is-active");
  };
  const deactivate = (event) => {
    event.preventDefault();
    controls[control] = false;
    button.classList.remove("is-active");
  };

  button.addEventListener("pointerdown", activate);
  button.addEventListener("pointerup", deactivate);
  button.addEventListener("pointerleave", deactivate);
  button.addEventListener("pointercancel", deactivate);
});

renderer.setAnimationLoop(animate);

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  updatePlayer(delta);
  updateExhibitUI();
  updateAmbientMotion(elapsed, delta);
  renderer.render(scene, camera);
}

function updatePlayer(delta) {
  if (state.introOpen || state.activeExhibit) {
    moveVelocity.multiplyScalar(Math.exp(-6 * delta));
    return;
  }

  if (controls.turnLeft) {
    yawRig.rotation.y += TURN_SPEED * delta;
  }
  if (controls.turnRight) {
    yawRig.rotation.y -= TURN_SPEED * delta;
  }
  if (controls.lookUp) {
    pitchRig.rotation.x = THREE.MathUtils.clamp(
      pitchRig.rotation.x + LOOK_SPEED * delta,
      -1.05,
      1.05
    );
  }
  if (controls.lookDown) {
    pitchRig.rotation.x = THREE.MathUtils.clamp(
      pitchRig.rotation.x - LOOK_SPEED * delta,
      -1.05,
      1.05
    );
  }

  const inputForward = Number(controls.forward) - Number(controls.backward);
  const inputRight = Number(controls.right) - Number(controls.left);
  const direction = new THREE.Vector3();

  if (inputForward || inputRight) {
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(Y_AXIS, yawRig.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(Y_AXIS, yawRig.rotation.y);
    direction
      .addScaledVector(forward, inputForward)
      .addScaledVector(right, inputRight)
      .normalize();
  }

  const targetSpeed = controls.sprint && !isTouchDevice ? 8.2 : 5.4;
  const desiredVelocity = direction.multiplyScalar(targetSpeed);
  moveVelocity.lerp(desiredVelocity, 1 - Math.exp(-10 * delta));

  const stepX = moveVelocity.x * delta;
  const stepZ = moveVelocity.z * delta;
  attemptMove(stepX, stepZ, delta);

  state.bobTimer += moveVelocity.length() * delta * 0.75;
  const bobAmount = moveVelocity.length() > 0.2 ? Math.sin(state.bobTimer * 10) * 0.04 : 0;
  camera.position.y = EYE_HEIGHT + bobAmount;
}

function attemptMove(stepX, stepZ, delta) {
  const nextX = playerRig.position.x + stepX;
  const nextZ = playerRig.position.z + stepZ;

  if (!canOccupy(nextX, nextZ)) {
    const tryX = playerRig.position.x + stepX;
    if (canOccupy(tryX, playerRig.position.z)) {
      playerRig.position.x = tryX;
    }

    const tryZ = playerRig.position.z + stepZ;
    if (canOccupy(playerRig.position.x, tryZ)) {
      playerRig.position.z = tryZ;
    }
  } else {
    playerRig.position.x = nextX;
    playerRig.position.z = nextZ;
  }

  const groundY = terrainHeight(playerRig.position.x, playerRig.position.z);
  playerRig.position.y = THREE.MathUtils.damp(playerRig.position.y, groundY, 8, delta);
}

function canOccupy(x, z) {
  if (Math.hypot(x, z) > WORLD_RADIUS) {
    return false;
  }

  return !obstacleFields.some((field) => {
    const distance = Math.hypot(x - field.x, z - field.z);
    return distance < field.radius;
  });
}

function updateExhibitUI() {
  const nearest = getNearestExhibit();
  updateNearestLandmark(nearest);

  if (!nearest || nearest.distance > INTERACT_DISTANCE) {
    state.nearbyExhibit = null;
    setPromptVisibility(false);
    return;
  }

  state.nearbyExhibit = nearest.exhibit;
  promptTitle.textContent = nearest.exhibit.title;
  promptHint.textContent = isTouchDevice
    ? "Tap to inspect this landmark"
    : "Press E to inspect";
  setPromptVisibility(!state.activeExhibit);
}

function getNearestExhibit() {
  let best = null;

  for (const exhibit of exhibits) {
    const distance = playerRig.position.distanceTo(exhibit.position);
    if (!best || distance < best.distance) {
      best = { exhibit, distance };
    }
  }

  return best;
}

function updateNearestLandmark(nearest = getNearestExhibit()) {
  if (!nearest) {
    zoneName.textContent = "Wandering the Wilds";
    zoneDistance.textContent = "The lantern trail has faded.";
    return;
  }

  zoneName.textContent = nearest.exhibit.zone;
  zoneDistance.textContent =
    nearest.distance <= INTERACT_DISTANCE
      ? "You are within inspecting distance."
      : `${nearest.distance.toFixed(1)} meters from ${nearest.exhibit.title}.`;
}

function setPromptVisibility(visible) {
  inspectPrompt.classList.toggle("hidden", !visible);
}

function openExhibit(exhibit) {
  state.activeExhibit = exhibit;
  state.nearbyExhibit = exhibit;
  inspectZone.textContent = exhibit.zone;
  inspectTitle.textContent = exhibit.title;
  inspectKicker.textContent = exhibit.kicker;
  inspectBody.textContent = exhibit.body;
  inspectBullets.innerHTML = "";
  inspectActions.innerHTML = "";

  exhibit.bullets.forEach((bullet) => {
    const item = document.createElement("li");
    item.textContent = bullet;
    inspectBullets.appendChild(item);
  });

  exhibit.actions.forEach((action) => {
    const link = document.createElement("a");
    link.className = "action-button";
    link.href = action.href;
    link.textContent = action.label;
    if (!action.href.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    inspectActions.appendChild(link);
  });

  const closeButton = document.createElement("button");
  closeButton.className = "action-button action-button--primary";
  closeButton.type = "button";
  closeButton.textContent = "Continue Exploring";
  closeButton.addEventListener("click", () => {
    closeExhibit(true);
  });
  inspectActions.appendChild(closeButton);

  inspectPanel.classList.remove("hidden");
  setPromptVisibility(false);

  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
}

function closeExhibit(restoreControl) {
  state.activeExhibit = null;
  inspectPanel.classList.add("hidden");
  if (state.nearbyExhibit) {
    setPromptVisibility(true);
  }
  if (restoreControl && !isTouchDevice) {
    requestPointerLock();
  }
}

function requestPointerLock() {
  if (typeof canvas.requestPointerLock === "function") {
    canvas.requestPointerLock();
  }
}

function clearMovement() {
  Object.keys(controls).forEach((key) => {
    controls[key] = false;
  });
  document.querySelectorAll(".control-button").forEach((button) => {
    button.classList.remove("is-active");
  });
}

function endTouchLook(event) {
  if (state.touchLookId !== event.pointerId) {
    return;
  }

  state.touchLookId = null;
  canvas.releasePointerCapture(event.pointerId);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createSkyDome() {
  const geometry = new THREE.SphereGeometry(180, 32, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x9bc0c9) },
      horizonColor: { value: new THREE.Color(0x5c7d85) },
      bottomColor: { value: new THREE.Color(0x14252b) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, 28.0, 0.0)).y;
        vec3 color = mix(bottomColor, horizonColor, smoothstep(-0.25, 0.12, h));
        color = mix(color, topColor, smoothstep(0.08, 0.82, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const dome = new THREE.Mesh(geometry, material);
  scene.add(dome);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 40),
    new THREE.MeshBasicMaterial({
      color: 0xf6e4bb,
      transparent: true,
      opacity: 0.68,
    })
  );
  moon.position.set(-38, 42, -68);
  scene.add(moon);
}

function createLighting() {
  const hemi = new THREE.HemisphereLight(0xc3dbe1, 0x1c2b2c, 1.45);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffd9aa, 1.9);
  keyLight.position.set(28, 40, 12);
  if (!isTouchDevice) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 120;
    keyLight.shadow.camera.left = -50;
    keyLight.shadow.camera.right = 50;
    keyLight.shadow.camera.top = 50;
    keyLight.shadow.camera.bottom = -50;
  }
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x78afbf, 0.65);
  fillLight.position.set(-22, 16, -26);
  scene.add(fillLight);
}

function createGround() {
  const size = 220;
  const segments = 140;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  const color = new THREE.Color();

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const y = terrainHeight(x, z);
    positions.setY(index, y);

    const path = pathInfluence(x, z);
    const heightFactor = THREE.MathUtils.clamp((y + 2.5) / 5.5, 0, 1);
    color.setRGB(0.21, 0.38, 0.29);
    color.lerp(new THREE.Color(0.49, 0.63, 0.47), heightFactor * 0.7);
    color.lerp(new THREE.Color(0.74, 0.63, 0.44), path * 0.72);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  scene.add(ground);
}

function createStonePaths() {
  const stonePositions = [
    [0, 22, 2.4],
    [0, 16, 2.2],
    [0, 10, 2.8],
    [0, 4, 2.6],
    [0, -2, 2.4],
    [0, -8, 2.5],
    [0, -14, 2.4],
    [0, -20, 2.6],
    [0, -26, 2.8],
    [-8, 13, 2.1],
    [-16, 13, 2.2],
    [8, 13, 2.1],
    [16, 13, 2.2],
    [-7, -11, 2.2],
    [-13, -11, 2.2],
    [7, -11, 2.2],
    [13, -11, 2.2],
  ];

  stonePositions.forEach(([x, z, radius]) => {
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.14, 0.32, 8),
      materials.slate
    );
    disk.position.set(x, terrainHeight(x, z) + 0.14, z);
    disk.rotation.y = Math.random() * Math.PI;
    disk.castShadow = !isTouchDevice;
    disk.receiveShadow = true;
    scene.add(disk);
  });
}

function createLanternPath() {
  const lanterns = [
    [-4.6, 19],
    [4.6, 19],
    [-4.8, 7],
    [4.8, 7],
    [-4.6, -5],
    [4.6, -5],
    [-4.4, -17],
    [4.4, -17],
  ];

  lanterns.forEach(([x, z]) => {
    const group = new THREE.Group();
    group.position.set(x, terrainHeight(x, z), z);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 2.9, 8),
      materials.bark
    );
    pole.position.y = 1.4;
    pole.castShadow = !isTouchDevice;
    group.add(pole);

    const lantern = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      createGlowMaterial(0xf6c16c, 1.6)
    );
    lantern.position.y = 2.85;
    group.add(lantern);

    const light = new THREE.PointLight(0xf5b15e, 1.1, 10, 2);
    light.position.y = 2.85;
    group.add(light);
    pulsingLights.push({
      light,
      baseIntensity: 1.1,
      amplitude: 0.28,
      speed: 2.2,
      phase: Math.random() * Math.PI * 2,
    });

    scene.add(group);
    floaters.push({
      object: lantern,
      baseY: lantern.position.y,
      amplitude: 0.08,
      speed: 2.1,
      phase: Math.random() * Math.PI * 2,
      spinY: 0.55,
    });
  });
}

function createForestRing() {
  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * Math.PI * 2;
    const radius = 42 + Math.sin(index * 2.7) * 6 + (index % 3) * 3;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (Math.abs(x) < 8 && z > -36 && z < 28) {
      continue;
    }

    const scale = 0.85 + (index % 5) * 0.18;
    createTree(x, z, scale);
  }
}

function createFloatingIslands() {
  const islands = [
    [-32, 19, -10, 4.6],
    [35, 23, -20, 5.6],
    [11, 17, 26, 3.8],
  ];

  islands.forEach(([x, y, z, scale]) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const top = new THREE.Mesh(
      new THREE.SphereGeometry(scale, 18, 18),
      materials.stoneDark
    );
    top.scale.set(1.1, 0.42, 1);
    top.castShadow = !isTouchDevice;
    group.add(top);

    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(scale * 0.62, scale * 2.2, 7),
      materials.stone
    );
    spike.position.y = -scale * 1.15;
    spike.castShadow = !isTouchDevice;
    group.add(spike);

    const grass = new THREE.Mesh(
      new THREE.CylinderGeometry(scale * 0.9, scale * 0.96, 0.2, 10),
      new THREE.MeshStandardMaterial({
        color: 0x6d966f,
        roughness: 1,
        metalness: 0,
      })
    );
    grass.position.y = scale * 0.15;
    group.add(grass);

    scene.add(group);
    floaters.push({
      object: group,
      baseY: group.position.y,
      amplitude: 0.55,
      speed: 0.5 + scale * 0.08,
      phase: Math.random() * Math.PI * 2,
      spinY: 0.07,
    });
  });
}

function createDistantStructures() {
  const towers = [
    [-52, -46, 18],
    [56, -55, 24],
    [0, -67, 28],
  ];

  towers.forEach(([x, z, height]) => {
    const tower = new THREE.Group();
    tower.position.set(x, terrainHeight(x, z), z);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 3.6, height, 7),
      materials.stoneDark
    );
    shaft.position.y = height / 2;
    tower.add(shaft);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 6.2, 7),
      materials.bark
    );
    roof.position.y = height + 1.2;
    tower.add(roof);

    scene.add(tower);
  });
}

function createStarField() {
  const points = [];

  for (let index = 0; index < 650; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const radius = THREE.MathUtils.randFloat(92, 132);
    points.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + 20,
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xfff7da,
      size: 0.35,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  scene.add(stars);

  floaters.push({
    object: stars,
    baseY: 0,
    amplitude: 0,
    speed: 0,
    phase: 0,
    spinY: 0.008,
  });
}

function createExhibits() {
  exhibits.forEach((exhibit) => {
    exhibit.position.y = terrainHeight(exhibit.position.x, exhibit.position.z);
    switch (exhibit.type) {
      case "portrait":
        createPortraitHall(exhibit);
        break;
      case "grove":
        createSkillGrove(exhibit);
        break;
      case "sanctum":
        createCloudSanctum(exhibit);
        break;
      case "project":
        createProjectShrine(exhibit);
        break;
      case "portal":
        createPortalNexus(exhibit);
        break;
      default:
        break;
    }

    obstacleFields.push({
      x: exhibit.position.x,
      z: exhibit.position.z,
      radius: exhibit.colliderRadius,
    });
  });
}

function createPortraitHall(exhibit) {
  const group = createPlatform(exhibit.position, 4.1, 1.25);
  addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.3);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 4.4, 0.24),
    materials.brass
  );
  frame.position.set(0, 4.2, 0);
  frame.castShadow = !isTouchDevice;
  group.add(frame);

  const portrait = new THREE.Mesh(
    new THREE.PlaneGeometry(2.78, 3.72),
    new THREE.MeshBasicMaterial({ map: headshotTexture, side: THREE.DoubleSide })
  );
  portrait.position.set(0, 4.2, 0.13);
  group.add(portrait);

  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(2.75, 0.09, 16, 64),
    createGlowMaterial(exhibit.accent, 1.2)
  );
  arch.position.set(0, 4.2, -0.16);
  group.add(arch);

  const columns = [
    [-2.45, 0, 0],
    [2.45, 0, 0],
  ];
  columns.forEach(([x, y, z]) => {
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.5, 4.6, 10),
      materials.stone
    );
    column.position.set(x, 2.5 + y, z);
    column.castShadow = !isTouchDevice;
    column.receiveShadow = true;
    group.add(column);
  });

  addLandmarkLight(group, exhibit.accent, 1.6, 14, 4.8);
}

function createProjectShrine(exhibit) {
  const group = createPlatform(exhibit.position, 3.45, 1.12);
  addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 5.8);

  const card = createProjectCard(exhibit);
  card.position.set(0, 3.45, 0);
  card.castShadow = !isTouchDevice;
  group.add(card);

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.44, 0),
    createGlowMaterial(exhibit.accent, 1.4)
  );
  orb.position.set(0, 5.1, 0);
  group.add(orb);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.08, 12, 64),
    createGlowMaterial(exhibit.accent, 1.05)
  );
  ring.position.set(0, 3.5, 0);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  floaters.push({
    object: orb,
    baseY: orb.position.y,
    amplitude: 0.18,
    speed: 1.8,
    phase: Math.random() * Math.PI * 2,
    spinY: 0.95,
  });
  floaters.push({
    object: ring,
    baseY: ring.position.y,
    amplitude: 0,
    speed: 0,
    phase: 0,
    spinY: 0.38,
  });

  addCornerPillars(group, 2.2, 4.4, exhibit.accent);
  addLandmarkLight(group, exhibit.accent, 1.35, 12, 4.3);
}

function createSkillGrove(exhibit) {
  const group = createPlatform(exhibit.position, 3.8, 1.18);
  addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.1);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.7, 3.6, 10),
    materials.bark
  );
  trunk.position.set(0, 2.3, -0.4);
  trunk.castShadow = !isTouchDevice;
  group.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.9, 18, 18),
    materials.foliage
  );
  canopy.position.set(0, 4.35, -0.55);
  canopy.scale.set(1.2, 0.84, 1.1);
  canopy.castShadow = !isTouchDevice;
  group.add(canopy);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85, 0),
    createGlowMaterial(exhibit.accent, 1.55)
  );
  crystal.position.set(0, 3.2, 0.9);
  group.add(crystal);

  const orbit = new THREE.Group();
  orbit.position.y = 3.2;
  group.add(orbit);
  floaters.push({
    object: orbit,
    baseY: orbit.position.y,
    amplitude: 0,
    speed: 0,
    phase: 0,
    spinY: 0.55,
  });

  ["Code", "Cloud", "AI"].forEach((label, index) => {
    const angle = (index / 3) * Math.PI * 2;
    const sigil = createSmallSigil(label, exhibit.accent);
    sigil.position.set(Math.cos(angle) * 1.95, 0.2 + index * 0.12, Math.sin(angle) * 1.95);
    orbit.add(sigil);
    floaters.push({
      object: sigil,
      baseY: sigil.position.y,
      amplitude: 0.14,
      speed: 1.3 + index * 0.35,
      phase: index * 1.7,
      spinY: 0.9,
    });
  });

  addLandmarkLight(group, exhibit.accent, 1.3, 12, 4.2);
}

function createCloudSanctum(exhibit) {
  const group = createPlatform(exhibit.position, 4.4, 1.2);
  addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.2);

  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(2.5, 0.1, 18, 72),
    createGlowMaterial(exhibit.accent, 1.3)
  );
  arch.position.set(0, 4.15, -0.2);
  group.add(arch);

  const leftBadge = createBadgePedestal(badgeCloudTexture, -1.75, 3.2);
  const rightBadge = createBadgePedestal(badgeArchitectTexture, 1.75, 3.2);
  group.add(leftBadge);
  group.add(rightBadge);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.08, 12, 48),
    createGlowMaterial("#dfeff3", 1.1)
  );
  halo.position.set(0, 5.25, 0.3);
  halo.rotation.x = Math.PI / 2;
  group.add(halo);
  floaters.push({
    object: halo,
    baseY: halo.position.y,
    amplitude: 0.15,
    speed: 1.5,
    phase: 1,
    spinY: 0.26,
  });

  addLandmarkLight(group, exhibit.accent, 1.45, 14, 4.8);
}

function createPortalNexus(exhibit) {
  const group = createPlatform(exhibit.position, 4.7, 1.25);
  addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.5);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.16, 20, 90),
    createGlowMaterial(exhibit.accent, 1.65)
  );
  ring.position.set(0, 4.1, 0);
  group.add(ring);
  floaters.push({
    object: ring,
    baseY: ring.position.y,
    amplitude: 0.14,
    speed: 1.6,
    phase: 0.4,
    spinY: 0.4,
  });

  const portal = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 48),
    new THREE.MeshBasicMaterial({
      map: createPortalTexture(exhibit.accent),
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  portal.position.set(0, 4.1, -0.04);
  group.add(portal);
  floaters.push({
    object: portal,
    baseY: portal.position.y,
    amplitude: 0.08,
    speed: 1.2,
    phase: 1.6,
    spinY: -0.22,
  });

  const orbit = new THREE.Group();
  orbit.position.set(0, 4.1, 0);
  group.add(orbit);
  floaters.push({
    object: orbit,
    baseY: orbit.position.y,
    amplitude: 0,
    speed: 0,
    phase: 0,
    spinY: -0.48,
  });

  ["GH", "IN", "@", "CV"].forEach((text, index) => {
    const sigil = createSmallSigil(text, exhibit.accent);
    const angle = (index / 4) * Math.PI * 2;
    sigil.position.set(Math.cos(angle) * 3.25, Math.sin(index) * 0.25, Math.sin(angle) * 3.25);
    orbit.add(sigil);
    floaters.push({
      object: sigil,
      baseY: sigil.position.y,
      amplitude: 0.12,
      speed: 1.5 + index * 0.25,
      phase: index,
      spinY: 0.8,
    });
  });

  addLandmarkLight(group, exhibit.accent, 1.85, 16, 4.4);
}

function createPlatform(position, radius, height) {
  const group = new THREE.Group();
  group.position.set(position.x, terrainHeight(position.x, position.z), position.z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.12, height, 10),
    materials.stoneDark
  );
  base.position.y = height / 2;
  base.castShadow = !isTouchDevice;
  base.receiveShadow = true;
  group.add(base);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 0.98, 0.2, 12),
    materials.stone
  );
  cap.position.y = height + 0.08;
  cap.receiveShadow = true;
  group.add(cap);

  scene.add(group);
  return group;
}

function createBadgePedestal(texture, x, y) {
  const group = new THREE.Group();
  group.position.set(x, 0, 0);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1, y, 9),
    materials.stone
  );
  pedestal.position.y = y / 2;
  pedestal.castShadow = !isTouchDevice;
  group.add(pedestal);

  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  badge.position.set(0, y + 0.95, 0.01);
  group.add(badge);
  return group;
}

function createProjectCard(exhibit) {
  const panel = new THREE.Group();

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 4.2, 0.22),
    materials.glass
  );
  panel.add(slab);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.82, 3.88),
    new THREE.MeshBasicMaterial({
      map: createProjectTexture(exhibit),
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  face.position.z = 0.13;
  panel.add(face);

  return panel;
}

function createProjectTexture(exhibit) {
  const canvasTexture = createCanvasTexture(1024, 1400, (ctx, width, height) => {
    const accent = exhibit.accent;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(9, 22, 26, 0.95)");
    gradient.addColorStop(1, "rgba(19, 42, 46, 0.9)");
    ctx.fillStyle = gradient;
    roundRect(ctx, 32, 32, width - 64, height - 64, 54);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    roundRect(ctx, 52, 52, width - 104, height - 104, 42);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.arc(width / 2, 280, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.font = "700 170px Cinzel, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(exhibit.glyph, width / 2, 335);

    ctx.fillStyle = "#f8f0dd";
    ctx.font = "700 82px Cinzel, Georgia, serif";
    wrapText(ctx, exhibit.title, width / 2, 560, width - 180, 92);

    ctx.fillStyle = "rgba(244, 220, 169, 0.75)";
    ctx.font = "700 30px Manrope, sans-serif";
    ctx.fillText(exhibit.zone.toUpperCase(), width / 2, 685);

    ctx.fillStyle = "rgba(247, 241, 227, 0.86)";
    ctx.font = "600 38px Manrope, sans-serif";
    wrapText(ctx, exhibit.kicker, width / 2, 835, width - 210, 52);
  });

  return canvasTexture;
}

function createPortalTexture(color) {
  return createCanvasTexture(1024, 1024, (ctx, width, height) => {
    const center = width / 2;
    const gradient = ctx.createRadialGradient(center, center, 80, center, center, 430);
    gradient.addColorStop(0, "rgba(255, 250, 230, 0.95)");
    gradient.addColorStop(0.2, colorToRgba(color, 0.85));
    gradient.addColorStop(0.55, colorToRgba(color, 0.2));
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 8;
    for (let ring = 0; ring < 4; ring += 1) {
      ctx.beginPath();
      ctx.arc(center, center, 160 + ring * 70, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function addCornerPillars(group, radius, height, accent) {
  const pillarMaterial = materials.stone;
  [
    [-radius, 0, -radius * 0.15],
    [radius, 0, -radius * 0.15],
    [-radius, 0, radius * 0.15],
    [radius, 0, radius * 0.15],
  ].forEach(([x, y, z], index) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.34, height, 8),
      pillarMaterial
    );
    pillar.position.set(x, height / 2 + 0.9 + y, z);
    pillar.castShadow = !isTouchDevice;
    pillar.receiveShadow = true;
    group.add(pillar);

    const cap = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 0),
      createGlowMaterial(accent, 1.1)
    );
    cap.position.set(x, height + 1.15, z);
    group.add(cap);
    floaters.push({
      object: cap,
      baseY: cap.position.y,
      amplitude: 0.08,
      speed: 1.5 + index * 0.2,
      phase: index * 0.65,
      spinY: 0.85,
    });
  });
}

function addLabelSprite(group, eyebrow, title, accent, y) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createLabelTexture(eyebrow, title, accent),
      transparent: true,
      depthWrite: false,
    })
  );
  sprite.position.set(0, y, 0);
  sprite.scale.set(6.4, 2.4, 1);
  group.add(sprite);
  floaters.push({
    object: sprite,
    baseY: sprite.position.y,
    amplitude: 0.12,
    speed: 1.25,
    phase: Math.random() * Math.PI * 2,
    spinY: 0,
  });
}

function createSmallSigil(text, accent) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: createSigilTexture(text, accent),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  return plane;
}

function addLandmarkLight(group, color, intensity, distance, y) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(0, y, 0);
  group.add(light);
  pulsingLights.push({
    light,
    baseIntensity: intensity,
    amplitude: intensity * 0.22,
    speed: 1.5,
    phase: Math.random() * Math.PI * 2,
  });
}

function createLabelTexture(eyebrow, title, accent) {
  return createCanvasTexture(900, 340, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(10, 20, 25, 0.8)");
    gradient.addColorStop(1, "rgba(10, 20, 25, 0.15)");
    ctx.fillStyle = gradient;
    roundRect(ctx, 28, 28, width - 56, height - 56, 46);
    ctx.fill();

    ctx.strokeStyle = colorToRgba(accent, 0.8);
    ctx.lineWidth = 4;
    roundRect(ctx, 44, 44, width - 88, height - 88, 34);
    ctx.stroke();

    ctx.fillStyle = "rgba(244, 220, 169, 0.9)";
    ctx.textAlign = "center";
    ctx.font = "700 28px Manrope, sans-serif";
    ctx.fillText(eyebrow.toUpperCase(), width / 2, 110);

    ctx.fillStyle = "#fbf5e6";
    ctx.font = "700 64px Cinzel, Georgia, serif";
    wrapText(ctx, title, width / 2, 210, width - 120, 68);
  });
}

function createSigilTexture(text, accent) {
  return createCanvasTexture(512, 512, (ctx, width, height) => {
    const center = width / 2;
    ctx.fillStyle = "rgba(8, 20, 24, 0.75)";
    ctx.beginPath();
    ctx.arc(center, center, 205, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colorToRgba(accent, 0.84);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(center, center, 190, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(center, center, 150, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = "700 120px Cinzel, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(text, center, 295);
  });
}

function createCanvasTexture(width, height, draw) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = width;
  textureCanvas.height = height;
  const ctx = textureCanvas.getContext("2d");
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  return texture;
}

function createGlowMaterial(color, intensity) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.15,
  });
}

function createTree(x, z, scale) {
  const group = new THREE.Group();
  group.position.set(x, terrainHeight(x, z), z);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32 * scale, 0.54 * scale, 2.8 * scale, 8),
    materials.bark
  );
  trunk.position.y = 1.45 * scale;
  trunk.castShadow = !isTouchDevice;
  group.add(trunk);

  [0, 1, 2].forEach((layer) => {
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry((1.45 - layer * 0.22) * scale, 2.1 * scale, 9),
      materials.foliage
    );
    canopy.position.y = (2.45 + layer * 0.92) * scale;
    canopy.castShadow = !isTouchDevice;
    group.add(canopy);
  });

  scene.add(group);
}

function loadTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  return texture;
}

function terrainHeight(x, z) {
  let y =
    Math.sin(x * 0.085) * 0.9 +
    Math.cos(z * 0.078) * 0.8 +
    Math.sin((x + z) * 0.048) * 0.55;
  y += Math.sin(Math.hypot(x, z) * 0.11) * 0.32;
  y *= 0.42;

  const flatten = pathInfluence(x, z);
  return THREE.MathUtils.lerp(y, y * 0.18, flatten);
}

function pathInfluence(x, z) {
  const avenue = Math.exp(-Math.pow(x / 7, 2));
  const arrival = Math.exp(-(x * x + Math.pow(z - 24, 2)) / 180);
  const nexus = Math.exp(-(x * x + Math.pow(z + 28, 2)) / 210);
  return Math.min(1, avenue * 0.82 + arrival * 0.55 + nexus * 0.7);
}

function colorToRgba(color, alpha) {
  const threeColor = new THREE.Color(color);
  const r = Math.round(threeColor.r * 255);
  const g = Math.round(threeColor.g * 255);
  const b = Math.round(threeColor.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, centerX, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let y = startY;

  words.forEach((word, index) => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line.trim(), centerX, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }

    if (index === words.length - 1) {
      ctx.fillText(line.trim(), centerX, y);
    }
  });
}

function updateAmbientMotion(elapsed, delta) {
  floaters.forEach((entry) => {
    if (entry.amplitude !== 0) {
      entry.object.position.y =
        entry.baseY + Math.sin(elapsed * entry.speed + entry.phase) * entry.amplitude;
    }

    if (entry.spinY) {
      entry.object.rotation.y += entry.spinY * delta;
    }
  });

  pulsingLights.forEach((pulse) => {
    pulse.light.intensity =
      pulse.baseIntensity +
      Math.sin(elapsed * pulse.speed + pulse.phase) * pulse.amplitude;
  });
}
