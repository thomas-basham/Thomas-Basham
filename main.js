import { portfolioContent } from "./app/content.js";
import {
  getDomRefs,
  hideInspectPanel,
  hydrateStaticContent,
  renderInspectPanel,
  setPromptState,
  updateZoneStatus,
} from "./app/dom.js";
import { THREE } from "./app/three.js";
import { createWorld } from "./app/world.js";

// Runtime state
const refs = getDomRefs();
const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
const world = createWorld({
  canvas: refs.canvas,
  isTouchDevice,
  assetPaths: portfolioContent.assets,
  exhibitContent: portfolioContent.exhibits,
});
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
const appState = {
  activeExhibit: null,
  nearbyExhibit: null,
  pointerLocked: false,
  introOpen: true,
  bobTimer: 0,
  touchLookId: null,
  lastTouchX: 0,
  lastTouchY: 0,
  initialized: false,
  listenersBound: false,
};
const moveVelocity = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

initialize();

// Bootstrap
function initialize() {
  if (appState.initialized) {
    return;
  }

  appState.initialized = true;
  hydrateStaticContent(refs, portfolioContent, isTouchDevice, {
    enterRealm: handleEnterRealm,
  });
  setPromptState(refs, portfolioContent, {
    visible: false,
    isTouchDevice,
    isIntroOpen: appState.introOpen,
  });

  world.buildStaticScene();
  bindEventListeners();

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.finally(() => {
    world.buildExhibits();
    updateNearestLandmark();
  });

  updateNearestLandmark();
  world.renderer.setAnimationLoop(animate);
}

function bindEventListeners() {
  if (appState.listenersBound) {
    return;
  }

  appState.listenersBound = true;
  refs.inspectPrompt.addEventListener("click", handleInspectPrompt);
  refs.canvas.addEventListener("click", handleCanvasClick);
  refs.canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  refs.canvas.addEventListener("pointermove", handleCanvasPointerMove);
  refs.canvas.addEventListener("pointerup", endTouchLook);
  refs.canvas.addEventListener("pointercancel", endTouchLook);
  document.addEventListener("pointerlockchange", handlePointerLockChange);
  document.addEventListener("mousemove", handleDocumentMouseMove);
  document.addEventListener("keydown", handleDocumentKeyDown);
  document.addEventListener("keyup", handleDocumentKeyUp);
  window.addEventListener("blur", clearMovement);
  window.addEventListener("resize", onResize);

  refs.controlButtons.forEach((button) => {
    button.addEventListener("pointerdown", handleControlPointerDown);
    button.addEventListener("pointerup", handleControlPointerUp);
    button.addEventListener("pointerleave", handleControlPointerUp);
    button.addEventListener("pointercancel", handleControlPointerUp);
  });
}

// Input handlers
function handleEnterRealm() {
  appState.introOpen = false;
  refs.introPanel.classList.add("hidden");
  requestPointerLock();
}

function handleInspectPrompt() {
  if (appState.nearbyExhibit) {
    openExhibit(appState.nearbyExhibit);
  }
}

function handleCanvasClick() {
  if (!appState.introOpen && !appState.activeExhibit && !isTouchDevice) {
    requestPointerLock();
  }
}

function handleCanvasPointerDown(event) {
  if (
    !isTouchDevice ||
    !event.isPrimary ||
    appState.activeExhibit ||
    appState.introOpen ||
    appState.touchLookId !== null
  ) {
    return;
  }

  appState.touchLookId = event.pointerId;
  appState.lastTouchX = event.clientX;
  appState.lastTouchY = event.clientY;
  refs.canvas.setPointerCapture(event.pointerId);
}

function handleCanvasPointerMove(event) {
  if (!isTouchDevice || appState.touchLookId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - appState.lastTouchX;
  const deltaY = event.clientY - appState.lastTouchY;
  appState.lastTouchX = event.clientX;
  appState.lastTouchY = event.clientY;
  world.yawRig.rotation.y -= deltaX * 0.0065;
  world.pitchRig.rotation.x = THREE.MathUtils.clamp(
    world.pitchRig.rotation.x - deltaY * 0.0045,
    -1.05,
    1.05
  );
}

function handlePointerLockChange() {
  appState.pointerLocked = document.pointerLockElement === refs.canvas;
  refs.body.classList.toggle("is-locked", appState.pointerLocked);
}

function handleDocumentMouseMove(event) {
  if (!appState.pointerLocked) {
    return;
  }

  world.yawRig.rotation.y -= event.movementX * 0.0022;
  world.pitchRig.rotation.x = THREE.MathUtils.clamp(
    world.pitchRig.rotation.x - event.movementY * 0.0017,
    -1.05,
    1.05
  );
}

function handleDocumentKeyDown(event) {
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
      if (appState.activeExhibit) {
        closeExhibit(true);
      } else if (appState.nearbyExhibit) {
        openExhibit(appState.nearbyExhibit);
      }
      break;
    case "Escape":
      if (appState.activeExhibit) {
        closeExhibit(false);
      }
      break;
    default:
      break;
  }
}

function handleDocumentKeyUp(event) {
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
}

function handleControlPointerDown(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const { control } = button.dataset;
  controls[control] = true;
  button.classList.add("is-active");
}

function handleControlPointerUp(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const { control } = button.dataset;
  controls[control] = false;
  button.classList.remove("is-active");
}

// Animation and movement
function animate() {
  const delta = Math.min(world.clock.getDelta(), 0.05);
  const elapsed = world.clock.elapsedTime;

  updatePlayer(delta);
  updateExhibitUI();
  world.updateAmbientMotion(elapsed, delta);
  world.renderer.render(world.scene, world.camera);
}

function updatePlayer(delta) {
  if (appState.introOpen || appState.activeExhibit) {
    moveVelocity.multiplyScalar(Math.exp(-6 * delta));
    return;
  }

  if (controls.turnLeft) {
    world.yawRig.rotation.y += world.config.turnSpeed * delta;
  }
  if (controls.turnRight) {
    world.yawRig.rotation.y -= world.config.turnSpeed * delta;
  }
  if (controls.lookUp) {
    world.pitchRig.rotation.x = THREE.MathUtils.clamp(
      world.pitchRig.rotation.x + world.config.lookSpeed * delta,
      -1.05,
      1.05
    );
  }
  if (controls.lookDown) {
    world.pitchRig.rotation.x = THREE.MathUtils.clamp(
      world.pitchRig.rotation.x - world.config.lookSpeed * delta,
      -1.05,
      1.05
    );
  }

  const inputForward = Number(controls.forward) - Number(controls.backward);
  const inputRight = Number(controls.right) - Number(controls.left);
  const direction = new THREE.Vector3();

  if (inputForward || inputRight) {
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      worldUp,
      world.yawRig.rotation.y
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      worldUp,
      world.yawRig.rotation.y
    );
    direction
      .addScaledVector(forward, inputForward)
      .addScaledVector(right, inputRight)
      .normalize();
  }

  const targetSpeed = controls.sprint && !isTouchDevice ? 8.2 : 5.4;
  const desiredVelocity = direction.multiplyScalar(targetSpeed);
  moveVelocity.lerp(desiredVelocity, 1 - Math.exp(-10 * delta));

  attemptMove(moveVelocity.x * delta, moveVelocity.z * delta, delta);

  appState.bobTimer += moveVelocity.length() * delta * 0.75;
  const bobAmount =
    moveVelocity.length() > 0.2 ? Math.sin(appState.bobTimer * 10) * 0.04 : 0;
  world.camera.position.y = world.config.eyeHeight + bobAmount;
}

function attemptMove(stepX, stepZ, delta) {
  const nextX = world.playerRig.position.x + stepX;
  const nextZ = world.playerRig.position.z + stepZ;

  if (!world.canOccupy(nextX, nextZ)) {
    const tryX = world.playerRig.position.x + stepX;
    if (world.canOccupy(tryX, world.playerRig.position.z)) {
      world.playerRig.position.x = tryX;
    }

    const tryZ = world.playerRig.position.z + stepZ;
    if (world.canOccupy(world.playerRig.position.x, tryZ)) {
      world.playerRig.position.z = tryZ;
    }
  } else {
    world.playerRig.position.x = nextX;
    world.playerRig.position.z = nextZ;
  }

  const groundY = world.terrainHeight(world.playerRig.position.x, world.playerRig.position.z);
  world.playerRig.position.y = THREE.MathUtils.damp(
    world.playerRig.position.y,
    groundY,
    8,
    delta
  );
}

// UI state
function updateExhibitUI() {
  const nearest = world.getNearestExhibit(world.playerRig.position);
  updateNearestLandmark(nearest);

  if (!nearest || nearest.distance > world.config.interactDistance) {
    appState.nearbyExhibit = null;
    setPromptState(refs, portfolioContent, {
      visible: false,
      isTouchDevice,
      isIntroOpen: appState.introOpen,
    });
    return;
  }

  appState.nearbyExhibit = nearest.exhibit;
  setPromptState(refs, portfolioContent, {
    visible: !appState.activeExhibit,
    title: nearest.exhibit.title,
    isTouchDevice,
    isIntroOpen: appState.introOpen,
  });
}

function updateNearestLandmark(nearest = world.getNearestExhibit(world.playerRig.position)) {
  if (!nearest) {
    updateZoneStatus(
      refs,
      portfolioContent.status.lostZoneName,
      portfolioContent.status.lostZoneDistance
    );
    return;
  }

  const distanceText =
    nearest.distance <= world.config.interactDistance
      ? "You are within inspecting distance."
      : `${nearest.distance.toFixed(1)} meters from ${nearest.exhibit.title}.`;
  updateZoneStatus(refs, nearest.exhibit.zone, distanceText);
}

function openExhibit(exhibit) {
  if (!exhibit || appState.activeExhibit?.id === exhibit.id) {
    return;
  }

  appState.activeExhibit = exhibit;
  appState.nearbyExhibit = exhibit;
  renderInspectPanel(refs, portfolioContent, exhibit, () => {
    closeExhibit(true);
  });
  setPromptState(refs, portfolioContent, {
    visible: false,
    isTouchDevice,
    isIntroOpen: appState.introOpen,
  });

  if (document.pointerLockElement === refs.canvas) {
    document.exitPointerLock();
  }
}

function closeExhibit(restoreControl) {
  appState.activeExhibit = null;
  hideInspectPanel(refs);
  if (appState.nearbyExhibit) {
    setPromptState(refs, portfolioContent, {
      visible: true,
      title: appState.nearbyExhibit.title,
      isTouchDevice,
      isIntroOpen: appState.introOpen,
    });
  }
  if (restoreControl && !isTouchDevice) {
    requestPointerLock();
  }
}

// Shared helpers
function requestPointerLock() {
  if (
    isTouchDevice ||
    appState.introOpen ||
    appState.activeExhibit ||
    document.pointerLockElement === refs.canvas ||
    typeof refs.canvas.requestPointerLock !== "function"
  ) {
    return;
  }

  refs.canvas.requestPointerLock();
}

function clearMovement() {
  Object.keys(controls).forEach((key) => {
    controls[key] = false;
  });
  refs.controlButtons.forEach((button) => {
    button.classList.remove("is-active");
  });
}

function endTouchLook(event) {
  if (appState.touchLookId !== event.pointerId) {
    return;
  }

  appState.touchLookId = null;
  if (refs.canvas.hasPointerCapture(event.pointerId)) {
    refs.canvas.releasePointerCapture(event.pointerId);
  }
}

function onResize() {
  world.setSize(window.innerWidth, window.innerHeight);
}
