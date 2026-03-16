import { portfolioContent } from "./app/content.js";
import {
  getDomRefs,
  hideInspectPanel,
  hydrateStaticContent,
  renderInspectPanel,
  setPromptState,
  updateDebugMetrics,
  updateSettingsControls,
  updateUtilityState,
  updateZoneStatus,
} from "./app/dom.js";
import {
  getSensitivityProfile,
  loadExperienceSettings,
  saveExperienceSettings,
} from "./app/settings.js";
import { THREE } from "./app/three.js";
import { createWorld } from "./app/world.js";

const refs = getDomRefs();
const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const experienceSettings = loadExperienceSettings(isTouchDevice, prefersReducedMotion);
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
const controlKeys = Object.keys(controls);

const appState = {
  activeExhibit: null,
  nearbyExhibit: null,
  pointerLocked: false,
  introOpen: true,
  settingsOpen: false,
  bobTimer: 0,
  cameraBobX: 0,
  cameraBobY: 0,
  cameraRoll: 0,
  sprintBlend: 0,
  touchLookId: null,
  lastTouchX: 0,
  lastTouchY: 0,
  initialized: false,
  listenersBound: false,
  interactionRefreshTimer: 0,
  interactionDirty: true,
  debugOpen: false,
  debugSampleTime: 0,
  debugFrameCount: 0,
  pendingResizeFrame: 0,
};
const INTERACTION_REFRESH_INTERVAL = isTouchDevice ? 0.12 : 0.08;
const DEBUG_SAMPLE_INTERVAL = 0.25;

const moveVelocity = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
const eyePosition = new THREE.Vector3();
const cameraForward = new THREE.Vector3();
const toExhibit = new THREE.Vector3();
const movementDirection = new THREE.Vector3();
const forwardDirection = new THREE.Vector3();
const rightDirection = new THREE.Vector3();
const bestInteractTarget = createInteractMetrics();
const currentInteractTarget = createInteractMetrics();

let sensitivityProfile = getSensitivityProfile(experienceSettings.sensitivity);

initialize();

function initialize() {
  if (appState.initialized) {
    return;
  }

  appState.initialized = true;
  hydrateStaticContent(refs, portfolioContent, isTouchDevice, {
    enterRealm: handleEnterRealm,
    mobileInspect: handleInspectPrompt,
    toggleSettingsMenu: handleToggleSettingsMenu,
    togglePointerLock: handleTogglePointerLock,
    toggleReducedMotion: handleToggleReducedMotion,
    selectSensitivity: handleSelectSensitivity,
    selectGraphicsQuality: handleSelectGraphicsQuality,
  });
  setPromptState(refs, portfolioContent, {
    visible: false,
    isTouchDevice,
    isIntroOpen: appState.introOpen,
  });
  updateDebugMetrics(refs, {
    visible: false,
    fps: 0,
    graphicsQuality: experienceSettings.graphicsQuality,
    drawCalls: 0,
    triangles: 0,
  });

  applyExperienceSettings();
  world.buildStaticScene();
  bindEventListeners();

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.finally(() => {
    world.buildExhibits();
    updateInteractionUI();
  });

  updateInteractionUI();
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
  window.visualViewport?.addEventListener("resize", onResize);

  refs.controlButtons.forEach((button) => {
    button.addEventListener("pointerdown", handleControlPointerDown);
    button.addEventListener("pointerup", handleControlPointerUp);
    button.addEventListener("pointerleave", handleControlPointerUp);
    button.addEventListener("pointercancel", handleControlPointerUp);
  });
}

function animate() {
  const delta = Math.min(world.clock.getDelta(), 0.05);
  const elapsed = world.clock.elapsedTime;

  updatePlayer(delta);
  appState.interactionRefreshTimer += delta;
  if (
    appState.interactionDirty ||
    appState.interactionRefreshTimer >= INTERACTION_REFRESH_INTERVAL
  ) {
    // UI state is less latency-sensitive than movement, so refresh it on a light cadence.
    appState.interactionDirty = false;
    appState.interactionRefreshTimer = 0;
    updateInteractionUI();
  }
  world.updateAmbientMotion(elapsed, delta);
  world.renderer.render(world.scene, world.camera);
  updateDebugPanel(delta);
}

function updatePlayer(delta) {
  if (appState.introOpen || appState.activeExhibit || appState.settingsOpen) {
    moveVelocity.multiplyScalar(Math.exp(-6 * delta));
    appState.sprintBlend = THREE.MathUtils.damp(appState.sprintBlend, 0, 6, delta);
    updateCameraEffects(delta, 0, 0);
    return;
  }

  applyLookButtons(delta);

  const inputForward = Number(controls.forward) - Number(controls.backward);
  const inputRight = Number(controls.right) - Number(controls.left);
  const inputMagnitude = Math.hypot(inputForward, inputRight);
  const hasMovementInput = inputMagnitude > 0;

  movementDirection.set(0, 0, 0);
  forwardDirection.set(0, 0, -1).applyAxisAngle(worldUp, world.yawRig.rotation.y);
  rightDirection.set(1, 0, 0).applyAxisAngle(worldUp, world.yawRig.rotation.y);

  if (hasMovementInput) {
    movementDirection
      .addScaledVector(forwardDirection, inputForward)
      .addScaledVector(rightDirection, inputRight)
      .normalize();
  }

  const sprintRequested = controls.sprint && hasMovementInput && (isTouchDevice || inputForward > 0);
  appState.sprintBlend = THREE.MathUtils.damp(
    appState.sprintBlend,
    sprintRequested ? 1 : 0,
    5.4,
    delta
  );

  const targetSpeed = THREE.MathUtils.lerp(5.2, 7.8, appState.sprintBlend);
  const desiredVelocity = movementDirection.multiplyScalar(targetSpeed);
  const damping = hasMovementInput ? 10.5 : 7.2;
  moveVelocity.lerp(desiredVelocity, 1 - Math.exp(-damping * delta));

  const resolvedPosition = world.resolvePlayerMotion(
    world.playerRig.position,
    moveVelocity.x * delta,
    moveVelocity.z * delta,
    world.config.playerRadius
  );

  world.playerRig.position.x = resolvedPosition.x;
  world.playerRig.position.z = resolvedPosition.z;
  world.playerRig.position.y = THREE.MathUtils.damp(
    world.playerRig.position.y,
    resolvedPosition.y,
    10,
    delta
  );

  updateCameraEffects(delta, moveVelocity.length(), inputRight);
}

function updateCameraEffects(delta, speed, strafeInput) {
  const motionEnabled = !experienceSettings.reducedMotion;
  const speedFactor = THREE.MathUtils.clamp(speed / 7.8, 0, 1);
  const strideSpeed = THREE.MathUtils.lerp(5.4, 8.8, appState.sprintBlend);

  if (speedFactor > 0.04) {
    appState.bobTimer += delta * strideSpeed * (0.55 + speedFactor * 0.45);
  }

  const bobStrength = motionEnabled ? speedFactor : 0;
  const targetBobX =
    Math.sin(appState.bobTimer * 0.5) * (0.014 + appState.sprintBlend * 0.006) * bobStrength;
  const targetBobY =
    Math.abs(Math.sin(appState.bobTimer)) *
    (0.024 + appState.sprintBlend * 0.008) *
    bobStrength;
  const targetRoll = motionEnabled
    ? THREE.MathUtils.clamp((-strafeInput * 0.016 - appState.sprintBlend * 0.004) * speedFactor, -0.024, 0.024)
    : 0;

  appState.cameraBobX = THREE.MathUtils.damp(appState.cameraBobX, targetBobX, 12, delta);
  appState.cameraBobY = THREE.MathUtils.damp(appState.cameraBobY, targetBobY, 12, delta);
  appState.cameraRoll = THREE.MathUtils.damp(appState.cameraRoll, targetRoll, 9, delta);

  world.camera.position.x = appState.cameraBobX;
  world.camera.position.y = world.config.eyeHeight + appState.cameraBobY;
  world.camera.rotation.z = appState.cameraRoll;

  const targetFov = world.config.baseFov + (motionEnabled ? appState.sprintBlend * 1.2 : 0);
  const nextFov = THREE.MathUtils.damp(world.camera.fov, targetFov, 6, delta);
  if (Math.abs(nextFov - world.camera.fov) > 0.01) {
    world.camera.fov = nextFov;
    world.camera.updateProjectionMatrix();
  }
}

function applyLookButtons(delta) {
  if (controls.turnLeft) {
    world.yawRig.rotation.y += world.config.turnSpeed * sensitivityProfile.buttonTurn * delta;
  }
  if (controls.turnRight) {
    world.yawRig.rotation.y -= world.config.turnSpeed * sensitivityProfile.buttonTurn * delta;
  }
  if (controls.lookUp) {
    world.pitchRig.rotation.x = THREE.MathUtils.clamp(
      world.pitchRig.rotation.x + world.config.lookSpeed * sensitivityProfile.buttonLook * delta,
      -1.05,
      1.05
    );
  }
  if (controls.lookDown) {
    world.pitchRig.rotation.x = THREE.MathUtils.clamp(
      world.pitchRig.rotation.x - world.config.lookSpeed * sensitivityProfile.buttonLook * delta,
      -1.05,
      1.05
    );
  }
}

function updateInteractionUI() {
  const nearest = world.getNearestExhibit(world.playerRig.position);
  world.camera.getWorldPosition(eyePosition);
  world.camera.getWorldDirection(cameraForward);
  const target = getStableInteractTarget();

  appState.nearbyExhibit = target?.exhibit ?? null;
  updateNearestLandmark(target ?? nearest);

  const promptVisible = Boolean(appState.nearbyExhibit) && !appState.activeExhibit && !appState.settingsOpen;
  setPromptState(refs, portfolioContent, {
    visible: promptVisible,
    title: appState.nearbyExhibit?.title,
    isTouchDevice,
    isIntroOpen: appState.introOpen,
  });

  refs.mobileInspect.disabled = !appState.nearbyExhibit;
  refs.mobileInspect.classList.toggle("is-disabled", !appState.nearbyExhibit);
}

function getStableInteractTarget() {
  if (!world.exhibits.length) {
    return null;
  }

  // Keep the current target unless a new candidate is meaningfully better.
  const bestCandidate = findBestInteractCandidate();
  const currentCandidate = appState.nearbyExhibit
    ? evaluateInteractMetrics(appState.nearbyExhibit, currentInteractTarget)
    : null;

  if (currentCandidate?.isInRange) {
    const hysteresis = isTouchDevice ? 0.9 : 0.6;
    if (!bestCandidate || currentCandidate.score <= bestCandidate.score + hysteresis) {
      return currentCandidate;
    }
  }

  return bestCandidate;
}

function findBestInteractCandidate() {
  let hasBestCandidate = false;

  for (const exhibit of world.exhibits) {
    const metrics = evaluateInteractMetrics(exhibit, currentInteractTarget);
    if (!metrics.isInRange) {
      continue;
    }

    if (!hasBestCandidate || metrics.score < bestInteractTarget.score) {
      copyInteractMetrics(metrics, bestInteractTarget);
      hasBestCandidate = true;
    }
  }

  return hasBestCandidate ? bestInteractTarget : null;
}

function evaluateInteractMetrics(exhibit, output) {
  toExhibit.copy(exhibit.position).sub(eyePosition);

  const centerDistance = toExhibit.length();
  const surfaceDistance = Math.max(0, centerDistance - exhibit.colliderRadius);
  const maxSurfaceDistance =
    world.config.interactDistance +
    (appState.nearbyExhibit?.id === exhibit.id ? 1.15 : 0.45);

  if (surfaceDistance > maxSurfaceDistance) {
    output.exhibit = exhibit;
    output.isInRange = false;
    output.distance = centerDistance;
    output.surfaceDistance = surfaceDistance;
    output.score = Number.POSITIVE_INFINITY;
    return output;
  }

  const alignment = cameraForward.dot(toExhibit.normalize());
  const minAlignment = isTouchDevice ? -0.2 : -0.05;
  if (alignment < minAlignment) {
    output.exhibit = exhibit;
    output.isInRange = false;
    output.distance = centerDistance;
    output.surfaceDistance = surfaceDistance;
    output.score = Number.POSITIVE_INFINITY;
    return output;
  }

  const desiredAlignment = isTouchDevice ? 0.15 : 0.5;
  const penaltyScale = isTouchDevice ? 3.2 : 5.2;
  const alignmentPenalty = Math.max(0, desiredAlignment - alignment) * penaltyScale;
  let score = surfaceDistance + alignmentPenalty;

  if (appState.nearbyExhibit?.id === exhibit.id) {
    score -= 0.3;
  }

  output.exhibit = exhibit;
  output.isInRange = true;
  output.distance = centerDistance;
  output.surfaceDistance = surfaceDistance;
  output.score = score;
  return output;
}

function updateNearestLandmark(reference) {
  const nextReference = reference ?? world.getNearestExhibit(world.playerRig.position);
  if (!nextReference) {
    updateZoneStatus(
      refs,
      portfolioContent.status.lostZoneName,
      portfolioContent.status.lostZoneDistance
    );
    return;
  }

  const surfaceDistance =
    nextReference.surfaceDistance ??
    world.getExhibitSurfaceDistance(nextReference.exhibit, world.playerRig.position);
  const distanceText =
    surfaceDistance <= world.config.interactDistance
      ? "You are within inspecting distance."
      : `${surfaceDistance.toFixed(1)} meters from ${nextReference.exhibit.title}.`;

  updateZoneStatus(refs, nextReference.exhibit.zone, distanceText);
}

function updateDebugPanel(delta) {
  if (!appState.debugOpen) {
    return;
  }

  appState.debugFrameCount += 1;
  appState.debugSampleTime += delta;
  if (appState.debugSampleTime < DEBUG_SAMPLE_INTERVAL) {
    return;
  }

  updateDebugMetrics(refs, {
    visible: true,
    fps: Math.round(appState.debugFrameCount / appState.debugSampleTime),
    graphicsQuality: experienceSettings.graphicsQuality,
    drawCalls: world.renderer.info.render.calls,
    triangles: world.renderer.info.render.triangles,
  });

  appState.debugFrameCount = 0;
  appState.debugSampleTime = 0;
}

function createInteractMetrics() {
  return {
    exhibit: null,
    isInRange: false,
    distance: Number.POSITIVE_INFINITY,
    surfaceDistance: Number.POSITIVE_INFINITY,
    score: Number.POSITIVE_INFINITY,
  };
}

function copyInteractMetrics(source, target) {
  target.exhibit = source.exhibit;
  target.isInRange = source.isInRange;
  target.distance = source.distance;
  target.surfaceDistance = source.surfaceDistance;
  target.score = source.score;
}

function flagInteractionRefresh() {
  appState.interactionDirty = true;
  appState.interactionRefreshTimer = INTERACTION_REFRESH_INTERVAL;
}

function toggleDebugPanel() {
  appState.debugOpen = !appState.debugOpen;
  appState.debugFrameCount = 0;
  appState.debugSampleTime = 0;

  updateDebugMetrics(refs, {
    visible: appState.debugOpen,
    fps: 0,
    graphicsQuality: experienceSettings.graphicsQuality,
    drawCalls: world.renderer.info.render.calls,
    triangles: world.renderer.info.render.triangles,
  });
}

function scheduleResize() {
  if (appState.pendingResizeFrame) {
    return;
  }

  appState.pendingResizeFrame = window.requestAnimationFrame(() => {
    appState.pendingResizeFrame = 0;
    world.setSize(refs.canvas.clientWidth || window.innerWidth, refs.canvas.clientHeight || window.innerHeight);
    flagInteractionRefresh();
  });
}

function openExhibit(exhibit) {
  if (!exhibit || appState.activeExhibit?.id === exhibit.id) {
    return;
  }

  clearMovement();
  if (appState.pointerLocked && document.pointerLockElement === refs.canvas) {
    document.exitPointerLock();
  }

  appState.activeExhibit = exhibit;
  renderInspectPanel(refs, portfolioContent, exhibit, () => {
    closeExhibit(true);
  });
  setPromptState(refs, portfolioContent, {
    visible: false,
    isTouchDevice,
    isIntroOpen: appState.introOpen,
  });
  flagInteractionRefresh();
}

function closeExhibit(restoreControl) {
  appState.activeExhibit = null;
  hideInspectPanel(refs);
  updateInteractionUI();

  if (restoreControl && !isTouchDevice) {
    requestPointerLock();
  }

  flagInteractionRefresh();
}

function applyExperienceSettings() {
  sensitivityProfile = getSensitivityProfile(experienceSettings.sensitivity);
  world.applyPresentationSettings(experienceSettings);
  refs.body.classList.toggle("is-reduced-motion", experienceSettings.reducedMotion);
  updateSettingsControls(refs, portfolioContent, experienceSettings);
  updateUtilityState(refs, portfolioContent, {
    isTouchDevice,
    pointerLocked: appState.pointerLocked,
    settingsOpen: appState.settingsOpen,
  });
  if (appState.debugOpen) {
    updateDebugMetrics(refs, {
      visible: true,
      fps: 0,
      graphicsQuality: experienceSettings.graphicsQuality,
      drawCalls: world.renderer.info.render.calls,
      triangles: world.renderer.info.render.triangles,
    });
  }
  saveExperienceSettings(experienceSettings);
  flagInteractionRefresh();
}

function handleEnterRealm() {
  appState.introOpen = false;
  refs.introPanel.classList.add("hidden");
  flagInteractionRefresh();
  requestPointerLock();
}

function handleInspectPrompt() {
  if (appState.nearbyExhibit) {
    openExhibit(appState.nearbyExhibit);
  }
}

function handleToggleSettingsMenu() {
  appState.settingsOpen = !appState.settingsOpen;

  if (appState.settingsOpen && appState.pointerLocked && document.pointerLockElement === refs.canvas) {
    document.exitPointerLock();
  }

  if (appState.settingsOpen) {
    clearMovement();
  }

  updateUtilityState(refs, portfolioContent, {
    isTouchDevice,
    pointerLocked: appState.pointerLocked,
    settingsOpen: appState.settingsOpen,
  });
  flagInteractionRefresh();
}

function handleTogglePointerLock() {
  if (isTouchDevice) {
    return;
  }

  if (appState.pointerLocked && document.pointerLockElement === refs.canvas) {
    document.exitPointerLock();
    return;
  }

  requestPointerLock();
}

function handleToggleReducedMotion() {
  experienceSettings.reducedMotion = !experienceSettings.reducedMotion;
  applyExperienceSettings();
}

function handleSelectSensitivity(value) {
  experienceSettings.sensitivity = value;
  applyExperienceSettings();
}

function handleSelectGraphicsQuality(value) {
  experienceSettings.graphicsQuality = value;
  applyExperienceSettings();
  scheduleResize();
}

function handleCanvasClick() {
  if (
    !appState.introOpen &&
    !appState.activeExhibit &&
    !appState.settingsOpen &&
    !isTouchDevice
  ) {
    requestPointerLock();
  }
}

function handleCanvasPointerDown(event) {
  if (
    !isTouchDevice ||
    !event.isPrimary ||
    appState.activeExhibit ||
    appState.introOpen ||
    appState.settingsOpen ||
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

  world.yawRig.rotation.y -= deltaX * 0.0058 * sensitivityProfile.touch;
  world.pitchRig.rotation.x = THREE.MathUtils.clamp(
    world.pitchRig.rotation.x - deltaY * 0.0039 * sensitivityProfile.touch,
    -1.05,
    1.05
  );
}

function handlePointerLockChange() {
  appState.pointerLocked = document.pointerLockElement === refs.canvas;
  refs.body.classList.toggle("is-locked", appState.pointerLocked);

  if (appState.pointerLocked) {
    appState.settingsOpen = false;
  } else {
    clearMovement();
  }

  updateUtilityState(refs, portfolioContent, {
    isTouchDevice,
    pointerLocked: appState.pointerLocked,
    settingsOpen: appState.settingsOpen,
  });
  flagInteractionRefresh();
}

function handleDocumentMouseMove(event) {
  if (!appState.pointerLocked || appState.settingsOpen) {
    return;
  }

  const mouseScale = sensitivityProfile.mouse;
  world.yawRig.rotation.y -= event.movementX * 0.0021 * mouseScale;
  world.pitchRig.rotation.x = THREE.MathUtils.clamp(
    world.pitchRig.rotation.x - event.movementY * 0.00155 * mouseScale,
    -1.05,
    1.05
  );
}

function handleDocumentKeyDown(event) {
  if (event.repeat) {
    return;
  }

  if (event.code === "Backquote") {
    event.preventDefault();
    toggleDebugPanel();
    return;
  }

  if (event.code === "Escape" && appState.settingsOpen) {
    appState.settingsOpen = false;
    updateUtilityState(refs, portfolioContent, {
      isTouchDevice,
      pointerLocked: appState.pointerLocked,
      settingsOpen: appState.settingsOpen,
    });
    flagInteractionRefresh();
    return;
  }

  const movementBlocked = appState.settingsOpen || appState.activeExhibit;

  switch (event.code) {
    case "KeyW":
      if (!movementBlocked) {
        controls.forward = true;
      }
      break;
    case "KeyS":
      if (!movementBlocked) {
        controls.backward = true;
      }
      break;
    case "KeyA":
      if (!movementBlocked) {
        controls.left = true;
      }
      break;
    case "KeyD":
      if (!movementBlocked) {
        controls.right = true;
      }
      break;
    case "ShiftLeft":
    case "ShiftRight":
      if (!movementBlocked) {
        controls.sprint = true;
      }
      break;
    case "KeyE":
      if (appState.settingsOpen) {
        break;
      }
      if (appState.activeExhibit) {
        closeExhibit(true);
      } else if (appState.nearbyExhibit) {
        openExhibit(appState.nearbyExhibit);
      }
      break;
    case "Comma":
      if (!appState.introOpen && !appState.activeExhibit) {
        handleToggleSettingsMenu();
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
  if (appState.settingsOpen || appState.activeExhibit) {
    return;
  }

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

function requestPointerLock() {
  if (
    isTouchDevice ||
    appState.introOpen ||
    appState.activeExhibit ||
    appState.settingsOpen ||
    document.pointerLockElement === refs.canvas ||
    typeof refs.canvas.requestPointerLock !== "function"
  ) {
    return;
  }

  refs.canvas.requestPointerLock();
}

function clearMovement() {
  controlKeys.forEach((key) => {
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
  scheduleResize();
}
