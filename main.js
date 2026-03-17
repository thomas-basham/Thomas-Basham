import {
  buildFallbackPortfolioContent,
  portfolioContent as basePortfolioContent,
} from "./app/content.js";
import {
  INTERACTION_CONFIG,
  MOVEMENT_CONFIG,
  RUNTIME_CONFIG,
} from "./app/config.js";
import {
  getDomRefs,
  hideInspectPanel,
  hydrateStaticContent,
  renderFallbackPortfolio,
  renderInspectPanel,
  setPromptState,
  updateDebugMetrics,
  updateFallbackState,
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
import { runStartupValidation, warnRecoverable } from "./app/validation.js";
import { createWorld } from "./app/world.js";

const refs = getDomRefs();
const startupValidation = runStartupValidation({
  refs,
  content: basePortfolioContent,
});
const portfolioContent = startupValidation.content;
const metadataRefs = {
  metaDescription: document.getElementById("meta-description"),
  canonicalUrl: document.getElementById("canonical-url"),
  themeColor: document.getElementById("meta-theme-color"),
  ogTitle: document.getElementById("meta-og-title"),
  ogDescription: document.getElementById("meta-og-description"),
  ogUrl: document.getElementById("meta-og-url"),
  ogImage: document.getElementById("meta-og-image"),
  twitterTitle: document.getElementById("meta-twitter-title"),
  twitterDescription: document.getElementById("meta-twitter-description"),
  twitterImage: document.getElementById("meta-twitter-image"),
};
const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const experienceSettings = loadExperienceSettings(isTouchDevice, prefersReducedMotion);
const fallbackPortfolio = buildFallbackPortfolioContent(portfolioContent);

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
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const appState = {
  activeExhibit: null,
  nearbyExhibit: null,
  pointerLocked: false,
  fallbackOpen: false,
  introOpen: true,
  settingsOpen: false,
  webglUnavailable: false,
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
  renderLoopActive: false,
  lastFocusedElement: null,
};
const INTERACTION_REFRESH_INTERVAL = isTouchDevice
  ? RUNTIME_CONFIG.interactionRefreshInterval.touch
  : RUNTIME_CONFIG.interactionRefreshInterval.desktop;
const DEBUG_SAMPLE_INTERVAL = RUNTIME_CONFIG.debugSampleInterval;

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
let world = null;

initialize();

function initialize() {
  if (appState.initialized) {
    return;
  }

  if (!startupValidation.canInitialize) {
    warnRecoverable("Startup halted because required DOM elements are missing.");
    return;
  }

  appState.initialized = true;
  hydrateStaticContent(refs, portfolioContent, isTouchDevice, {
    enterRealm: handleEnterRealm,
    openFallbackMode: handleOpenFallbackMode,
    mobileInspect: handleInspectPrompt,
    toggleFallbackMode: handleToggleFallbackMode,
    toggleSettingsMenu: handleToggleSettingsMenu,
    togglePointerLock: handleTogglePointerLock,
    toggleReducedMotion: handleToggleReducedMotion,
    selectSensitivity: handleSelectSensitivity,
    selectGraphicsQuality: handleSelectGraphicsQuality,
  });
  renderFallbackPortfolio(refs, portfolioContent, fallbackPortfolio);
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

  bindEventListeners();
  attemptWorldInitialization();
  applyExperienceSettings();
  syncAppShell();
  window.requestAnimationFrame(() => {
    if (appState.introOpen && !appState.fallbackOpen) {
      focusPanel(refs.introPanel, [".action-button--primary", ".action-button"]);
    }
  });

  if (!world) {
    openFallbackMode({
      hideIntro: true,
      reason: "webgl",
    });
    return;
  }

  world.buildStaticScene();

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.finally(() => {
    if (!world) {
      return;
    }

    world.buildExhibits();
    updateInteractionUI();
  });

  updateInteractionUI();
  setRenderLoopActive(true);
}

function attemptWorldInitialization() {
  try {
    world = createWorld({
      canvas: refs.canvas,
      isTouchDevice,
      assetPaths: portfolioContent.assets,
      exhibitContent: portfolioContent.exhibits,
    });
  } catch (error) {
    appState.webglUnavailable = true;
    warnRecoverable("Three.js portfolio unavailable. Falling back to the 2D portfolio mode.", error);
  }
}

function isWorldAvailable() {
  return Boolean(world) && !appState.webglUnavailable;
}

function syncAppShell() {
  const worldAvailable = isWorldAvailable();

  refs.body.classList.toggle("is-intro-open", appState.introOpen && !appState.fallbackOpen);
  refs.body.classList.toggle("is-settings-open", appState.settingsOpen);
  refs.body.classList.toggle("is-inspect-open", Boolean(appState.activeExhibit));
  const introHidden = !appState.introOpen || appState.fallbackOpen;
  refs.introPanel.classList.toggle("hidden", introHidden);
  refs.introPanel.setAttribute("aria-hidden", String(introHidden));
  updateFallbackState(refs, portfolioContent, {
    fallbackOpen: appState.fallbackOpen,
    worldAvailable,
    webglUnavailable: appState.webglUnavailable,
  });
  updateUtilityState(refs, portfolioContent, {
    isTouchDevice,
    pointerLocked: appState.pointerLocked,
    settingsOpen: appState.settingsOpen,
    fallbackOpen: appState.fallbackOpen,
    introOpen: appState.introOpen,
    worldAvailable,
  });
  updateDocumentMetadata();

  if (appState.fallbackOpen || !worldAvailable) {
    appState.nearbyExhibit = null;
    setPromptState(refs, portfolioContent, {
      visible: false,
      isTouchDevice,
      isIntroOpen: appState.introOpen,
    });
    refs.mobileInspect.disabled = true;
    refs.mobileInspect.classList.add("is-disabled");
  }
}

function updateDocumentMetadata() {
  const { seo } = portfolioContent;
  const inWorldMode = !appState.introOpen && !appState.fallbackOpen && isWorldAvailable();
  const inFallbackMode = appState.fallbackOpen || appState.webglUnavailable;
  const title = inWorldMode
    ? seo.worldTitle
    : inFallbackMode
      ? seo.fallbackTitle
      : seo.defaultTitle;
  const description = inWorldMode
    ? seo.worldDescription
    : inFallbackMode
      ? seo.fallbackDescription
      : seo.defaultDescription;
  const canonicalUrl = new URL(seo.canonicalPath, seo.siteUrl).toString();
  const imageUrl = new URL(seo.ogImagePath, seo.siteUrl).toString();

  document.title = title;
  metadataRefs.metaDescription?.setAttribute("content", description);
  metadataRefs.canonicalUrl?.setAttribute("href", canonicalUrl);
  metadataRefs.themeColor?.setAttribute("content", seo.themeColor);
  metadataRefs.ogTitle?.setAttribute("content", title);
  metadataRefs.ogDescription?.setAttribute("content", description);
  metadataRefs.ogUrl?.setAttribute("content", canonicalUrl);
  metadataRefs.ogImage?.setAttribute("content", imageUrl);
  metadataRefs.twitterTitle?.setAttribute("content", title);
  metadataRefs.twitterDescription?.setAttribute("content", description);
  metadataRefs.twitterImage?.setAttribute("content", imageUrl);
}

function isElementVisible(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.closest(".hidden") || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const styles = window.getComputedStyle(element);
  return styles.display !== "none" && styles.visibility !== "hidden";
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    return !element.hasAttribute("disabled") && isElementVisible(element);
  });
}

function rememberFocusTarget(element = document.activeElement) {
  appState.lastFocusedElement =
    element instanceof HTMLElement && element !== document.body ? element : null;
}

function restoreFocusTarget(fallback) {
  const fallbackTarget = isElementVisible(fallback)
    ? fallback
    : isElementVisible(refs.canvas)
      ? refs.canvas
      : null;
  const target = isElementVisible(appState.lastFocusedElement)
    ? appState.lastFocusedElement
    : fallbackTarget;

  appState.lastFocusedElement = null;
  if (target instanceof HTMLElement) {
    target.focus({ preventScroll: true });
  }
}

function getActivePanelElement() {
  if (appState.fallbackOpen) {
    return refs.fallbackPanel;
  }
  if (appState.activeExhibit) {
    return refs.inspectPanel;
  }
  if (appState.settingsOpen) {
    return refs.settingsPanel;
  }
  if (appState.introOpen) {
    return refs.introPanel;
  }
  return null;
}

function focusPanel(panel, preferredSelectors = []) {
  const selectors = Array.isArray(preferredSelectors)
    ? preferredSelectors
    : [preferredSelectors];

  for (const selector of selectors) {
    if (!selector) {
      continue;
    }

    const preferred = panel.querySelector(selector);
    if (
      preferred instanceof HTMLElement &&
      !preferred.hasAttribute("disabled") &&
      isElementVisible(preferred)
    ) {
      preferred.focus({ preventScroll: true });
      return;
    }
  }

  const [firstFocusable] = getFocusableElements(panel);
  (firstFocusable ?? panel).focus({ preventScroll: true });
}

function trapActivePanelFocus(event) {
  if (event.key !== "Tab") {
    return false;
  }

  const panel = getActivePanelElement();
  if (!panel) {
    return false;
  }

  const focusableElements = getFocusableElements(panel);
  if (!focusableElements.length) {
    event.preventDefault();
    panel.focus({ preventScroll: true });
    return true;
  }

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && (activeElement === first || !panel.contains(activeElement))) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }

  if (!event.shiftKey && (activeElement === last || !panel.contains(activeElement))) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }

  return false;
}

function openFallbackMode(options = {}) {
  const { hideIntro = false, reason = null } = options;

  if (!appState.fallbackOpen) {
    rememberFocusTarget();
  }

  if (hideIntro) {
    appState.introOpen = false;
  }
  if (reason === "webgl") {
    appState.webglUnavailable = true;
  }

  clearMovement();
  if (appState.pointerLocked && document.pointerLockElement === refs.canvas) {
    document.exitPointerLock();
  }

  appState.pointerLocked = false;
  refs.body.classList.remove("is-locked");
  appState.settingsOpen = false;
  appState.activeExhibit = null;
  appState.fallbackOpen = true;
  hideInspectPanel(refs);
  setRenderLoopActive(false);
  if (appState.debugOpen) {
    appState.debugOpen = false;
    updateDebugMetrics(refs, {
      visible: false,
      fps: 0,
      graphicsQuality: experienceSettings.graphicsQuality,
      drawCalls: 0,
      triangles: 0,
    });
  }
  syncAppShell();
  flagInteractionRefresh();
  refs.fallbackPanel.scrollTop = 0;
  focusPanel(refs.fallbackPanel, [
    isWorldAvailable() ? "#fallback-close" : "#fallback-hero-actions .action-button",
    "#fallback-hero-actions .action-button",
  ]);
}

function closeFallbackMode() {
  if (!appState.fallbackOpen || !isWorldAvailable()) {
    return;
  }

  appState.fallbackOpen = false;
  setRenderLoopActive(true);
  syncAppShell();
  flagInteractionRefresh();
  restoreFocusTarget(refs.portfolioToggle);

  if (world) {
    updateInteractionUI();
  }
}

function bindEventListeners() {
  if (appState.listenersBound) {
    return;
  }

  appState.listenersBound = true;
  refs.fallbackClose.addEventListener("click", closeFallbackMode);
  refs.inspectPrompt.addEventListener("click", handleInspectPrompt);
  refs.canvas.addEventListener("click", handleCanvasClick);
  refs.canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  refs.canvas.addEventListener("pointermove", handleCanvasPointerMove);
  refs.canvas.addEventListener("pointerup", endTouchLook);
  refs.canvas.addEventListener("pointercancel", endTouchLook);
  refs.canvas.addEventListener("webglcontextlost", handleWebglContextLost, { passive: false });
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
  if (!world) {
    return;
  }

  const delta = Math.min(world.clock.getDelta(), RUNTIME_CONFIG.maxFrameDelta);
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

function setRenderLoopActive(active) {
  if (!world || appState.renderLoopActive === active) {
    return;
  }

  world.renderer.setAnimationLoop(active ? animate : null);
  appState.renderLoopActive = active;
}

function updatePlayer(delta) {
  if (!world) {
    return;
  }

  if (appState.introOpen || appState.fallbackOpen || appState.activeExhibit || appState.settingsOpen) {
    moveVelocity.multiplyScalar(Math.exp(-6 * delta));
    appState.sprintBlend = THREE.MathUtils.damp(
      appState.sprintBlend,
      0,
      MOVEMENT_CONFIG.sprintReleaseDamping,
      delta
    );
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
    MOVEMENT_CONFIG.sprintBlendDamping,
    delta
  );

  const targetSpeed = THREE.MathUtils.lerp(
    MOVEMENT_CONFIG.walkSpeed,
    MOVEMENT_CONFIG.sprintSpeed,
    appState.sprintBlend
  );
  const desiredVelocity = movementDirection.multiplyScalar(targetSpeed);
  const damping = hasMovementInput
    ? MOVEMENT_CONFIG.activeVelocityDamping
    : MOVEMENT_CONFIG.idleVelocityDamping;
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
    MOVEMENT_CONFIG.groundFollowDamping,
    delta
  );

  updateCameraEffects(delta, moveVelocity.length(), inputRight);
}

function updateCameraEffects(delta, speed, strafeInput) {
  const motionEnabled = !experienceSettings.reducedMotion;
  const speedFactor = THREE.MathUtils.clamp(speed / MOVEMENT_CONFIG.sprintSpeed, 0, 1);
  const strideSpeed = THREE.MathUtils.lerp(
    MOVEMENT_CONFIG.camera.strideWalkSpeed,
    MOVEMENT_CONFIG.camera.strideSprintSpeed,
    appState.sprintBlend
  );

  if (speedFactor > MOVEMENT_CONFIG.camera.bobStartThreshold) {
    appState.bobTimer +=
      delta *
      strideSpeed *
      (MOVEMENT_CONFIG.camera.stridePhaseScale + speedFactor * (1 - MOVEMENT_CONFIG.camera.stridePhaseScale));
  }

  const bobStrength = motionEnabled ? speedFactor : 0;
  const targetBobX =
    Math.sin(appState.bobTimer * 0.5) *
    (MOVEMENT_CONFIG.camera.bobXAmplitude +
      appState.sprintBlend * MOVEMENT_CONFIG.camera.bobXSprintBoost) *
    bobStrength;
  const targetBobY =
    Math.abs(Math.sin(appState.bobTimer)) *
    (MOVEMENT_CONFIG.camera.bobYAmplitude +
      appState.sprintBlend * MOVEMENT_CONFIG.camera.bobYSprintBoost) *
    bobStrength;
  const targetRoll = motionEnabled
    ? THREE.MathUtils.clamp(
        (-strafeInput * MOVEMENT_CONFIG.camera.strafeRollFactor -
          appState.sprintBlend * MOVEMENT_CONFIG.camera.sprintRollFactor) *
          speedFactor,
        -MOVEMENT_CONFIG.camera.maxRoll,
        MOVEMENT_CONFIG.camera.maxRoll
      )
    : 0;

  appState.cameraBobX = THREE.MathUtils.damp(
    appState.cameraBobX,
    targetBobX,
    MOVEMENT_CONFIG.camera.bobXDamping,
    delta
  );
  appState.cameraBobY = THREE.MathUtils.damp(
    appState.cameraBobY,
    targetBobY,
    MOVEMENT_CONFIG.camera.bobYDamping,
    delta
  );
  appState.cameraRoll = THREE.MathUtils.damp(
    appState.cameraRoll,
    targetRoll,
    MOVEMENT_CONFIG.camera.rollDamping,
    delta
  );

  world.camera.position.x = appState.cameraBobX;
  world.camera.position.y = world.config.eyeHeight + appState.cameraBobY;
  world.camera.rotation.z = appState.cameraRoll;

  const targetFov =
    world.config.baseFov +
    (motionEnabled ? appState.sprintBlend * MOVEMENT_CONFIG.camera.sprintFovBoost : 0);
  const nextFov = THREE.MathUtils.damp(
    world.camera.fov,
    targetFov,
    MOVEMENT_CONFIG.camera.fovDamping,
    delta
  );
  if (Math.abs(nextFov - world.camera.fov) > 0.01) {
    world.camera.fov = nextFov;
    world.camera.updateProjectionMatrix();
  }
}

function applyLookButtons(delta) {
  if (!world) {
    return;
  }

  if (controls.turnLeft) {
    world.yawRig.rotation.y += world.config.turnSpeed * sensitivityProfile.buttonTurn * delta;
  }
  if (controls.turnRight) {
    world.yawRig.rotation.y -= world.config.turnSpeed * sensitivityProfile.buttonTurn * delta;
  }
  if (controls.lookUp) {
    world.pitchRig.rotation.x = THREE.MathUtils.clamp(
      world.pitchRig.rotation.x + world.config.lookSpeed * sensitivityProfile.buttonLook * delta,
      -MOVEMENT_CONFIG.lookClamp,
      MOVEMENT_CONFIG.lookClamp
    );
  }
  if (controls.lookDown) {
    world.pitchRig.rotation.x = THREE.MathUtils.clamp(
      world.pitchRig.rotation.x - world.config.lookSpeed * sensitivityProfile.buttonLook * delta,
      -MOVEMENT_CONFIG.lookClamp,
      MOVEMENT_CONFIG.lookClamp
    );
  }
}

function updateInteractionUI() {
  if (!world || appState.fallbackOpen) {
    appState.nearbyExhibit = null;
    setPromptState(refs, portfolioContent, {
      visible: false,
      isTouchDevice,
      isIntroOpen: appState.introOpen,
    });
    refs.mobileInspect.disabled = true;
    refs.mobileInspect.classList.add("is-disabled");
    return;
  }

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
    const hysteresis = isTouchDevice
      ? INTERACTION_CONFIG.hysteresis.touch
      : INTERACTION_CONFIG.hysteresis.desktop;
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
    (appState.nearbyExhibit?.id === exhibit.id
      ? INTERACTION_CONFIG.currentTargetRangePadding.active
      : INTERACTION_CONFIG.currentTargetRangePadding.passive);

  if (surfaceDistance > maxSurfaceDistance) {
    output.exhibit = exhibit;
    output.isInRange = false;
    output.distance = centerDistance;
    output.surfaceDistance = surfaceDistance;
    output.score = Number.POSITIVE_INFINITY;
    return output;
  }

  const alignment = cameraForward.dot(toExhibit.normalize());
  const minAlignment = isTouchDevice
    ? INTERACTION_CONFIG.minAlignment.touch
    : INTERACTION_CONFIG.minAlignment.desktop;
  if (alignment < minAlignment) {
    output.exhibit = exhibit;
    output.isInRange = false;
    output.distance = centerDistance;
    output.surfaceDistance = surfaceDistance;
    output.score = Number.POSITIVE_INFINITY;
    return output;
  }

  const desiredAlignment = isTouchDevice
    ? INTERACTION_CONFIG.desiredAlignment.touch
    : INTERACTION_CONFIG.desiredAlignment.desktop;
  const penaltyScale = isTouchDevice
    ? INTERACTION_CONFIG.penaltyScale.touch
    : INTERACTION_CONFIG.penaltyScale.desktop;
  const alignmentPenalty = Math.max(0, desiredAlignment - alignment) * penaltyScale;
  let score = surfaceDistance + alignmentPenalty;

  if (appState.nearbyExhibit?.id === exhibit.id) {
    score -= INTERACTION_CONFIG.currentTargetScoreBonus;
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
      portfolioContent.status.lostZoneDistance,
      null
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

  updateZoneStatus(refs, nextReference.exhibit.zone, distanceText, nextReference.exhibit.accent);
}

function updateDebugPanel(delta) {
  if (!appState.debugOpen || !world) {
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
  if (!world) {
    appState.debugOpen = false;
    updateDebugMetrics(refs, {
      visible: false,
      fps: 0,
      graphicsQuality: experienceSettings.graphicsQuality,
      drawCalls: 0,
      triangles: 0,
    });
    return;
  }

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
  if (!world || appState.pendingResizeFrame) {
    return;
  }

  appState.pendingResizeFrame = window.requestAnimationFrame(() => {
    appState.pendingResizeFrame = 0;
    world.setSize(refs.canvas.clientWidth || window.innerWidth, refs.canvas.clientHeight || window.innerHeight);
    flagInteractionRefresh();
  });
}

function openExhibit(exhibit) {
  if (!world || appState.fallbackOpen || !exhibit || appState.activeExhibit?.id === exhibit.id) {
    return;
  }

  rememberFocusTarget();
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
  syncAppShell();
  focusPanel(refs.inspectPanel);
  flagInteractionRefresh();
}

function closeExhibit(restoreControl) {
  appState.activeExhibit = null;
  hideInspectPanel(refs);
  syncAppShell();
  if (world) {
    updateInteractionUI();
  }

  if (restoreControl && !isTouchDevice) {
    requestPointerLock();
  } else {
    restoreFocusTarget(refs.inspectPrompt);
  }

  flagInteractionRefresh();
}

function applyExperienceSettings() {
  sensitivityProfile = getSensitivityProfile(experienceSettings.sensitivity);
  if (world) {
    world.applyPresentationSettings(experienceSettings);
  }
  refs.body.classList.toggle("is-reduced-motion", experienceSettings.reducedMotion);
  updateSettingsControls(refs, portfolioContent, experienceSettings);
  syncAppShell();
  if (appState.debugOpen && world) {
    updateDebugMetrics(refs, {
      visible: true,
      fps: 0,
      graphicsQuality: experienceSettings.graphicsQuality,
      drawCalls: world.renderer.info.render.calls,
      triangles: world.renderer.info.render.triangles,
    });
  } else if (!world) {
    updateDebugMetrics(refs, {
      visible: false,
      fps: 0,
      graphicsQuality: experienceSettings.graphicsQuality,
      drawCalls: 0,
      triangles: 0,
    });
  }
  saveExperienceSettings(experienceSettings);
  flagInteractionRefresh();
}

function handleEnterRealm() {
  if (!isWorldAvailable()) {
    openFallbackMode({
      hideIntro: true,
      reason: "webgl",
    });
    return;
  }

  appState.introOpen = false;
  appState.fallbackOpen = false;
  syncAppShell();
  flagInteractionRefresh();
  updateInteractionUI();
  requestPointerLock();
}

function handleOpenFallbackMode() {
  openFallbackMode({
    hideIntro: !isWorldAvailable(),
  });
}

function handleToggleFallbackMode() {
  if (appState.fallbackOpen) {
    closeFallbackMode();
    return;
  }

  openFallbackMode({
    hideIntro: !isWorldAvailable(),
  });
}

function handleInspectPrompt() {
  if (appState.fallbackOpen || !world) {
    return;
  }

  if (appState.nearbyExhibit) {
    openExhibit(appState.nearbyExhibit);
  }
}

function handleToggleSettingsMenu() {
  if (!world || appState.fallbackOpen || appState.introOpen) {
    return;
  }

  if (!appState.settingsOpen) {
    rememberFocusTarget();
  }
  appState.settingsOpen = !appState.settingsOpen;

  if (appState.settingsOpen && appState.pointerLocked && document.pointerLockElement === refs.canvas) {
    document.exitPointerLock();
  }

  if (appState.settingsOpen) {
    clearMovement();
  }

  syncAppShell();
  if (appState.settingsOpen) {
    focusPanel(refs.settingsPanel, ["#settings-close", "#reduced-motion-toggle"]);
  } else {
    restoreFocusTarget(refs.settingsToggle);
  }
  flagInteractionRefresh();
}

function handleTogglePointerLock() {
  if (isTouchDevice || !world || appState.fallbackOpen) {
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
    world &&
    !appState.introOpen &&
    !appState.fallbackOpen &&
    !appState.activeExhibit &&
    !appState.settingsOpen &&
    !isTouchDevice
  ) {
    requestPointerLock();
  }
}

function handleCanvasPointerDown(event) {
  if (
    !world ||
    !isTouchDevice ||
    !event.isPrimary ||
    appState.activeExhibit ||
    appState.fallbackOpen ||
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
  if (!world || appState.fallbackOpen || !isTouchDevice || appState.touchLookId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - appState.lastTouchX;
  const deltaY = event.clientY - appState.lastTouchY;
  appState.lastTouchX = event.clientX;
  appState.lastTouchY = event.clientY;

  world.yawRig.rotation.y -= deltaX * MOVEMENT_CONFIG.touchYawFactor * sensitivityProfile.touch;
  world.pitchRig.rotation.x = THREE.MathUtils.clamp(
    world.pitchRig.rotation.x - deltaY * MOVEMENT_CONFIG.touchPitchFactor * sensitivityProfile.touch,
    -MOVEMENT_CONFIG.lookClamp,
    MOVEMENT_CONFIG.lookClamp
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

  syncAppShell();
  flagInteractionRefresh();
}

function handleWebglContextLost(event) {
  event.preventDefault();
  warnRecoverable("WebGL context lost. Switching to the 2D portfolio mode.");
  openFallbackMode({
    hideIntro: true,
    reason: "webgl",
  });
}

function handleDocumentMouseMove(event) {
  if (!world || appState.fallbackOpen || !appState.pointerLocked || appState.settingsOpen) {
    return;
  }

  const mouseScale = sensitivityProfile.mouse;
  world.yawRig.rotation.y -= event.movementX * MOVEMENT_CONFIG.mouseYawFactor * mouseScale;
  world.pitchRig.rotation.x = THREE.MathUtils.clamp(
    world.pitchRig.rotation.x - event.movementY * MOVEMENT_CONFIG.mousePitchFactor * mouseScale,
    -MOVEMENT_CONFIG.lookClamp,
    MOVEMENT_CONFIG.lookClamp
  );
}

function handleDocumentKeyDown(event) {
  const worldAvailable = isWorldAvailable();

  if (event.repeat) {
    return;
  }

  if (trapActivePanelFocus(event)) {
    return;
  }

  if (appState.fallbackOpen) {
    if (event.code === "Escape" && worldAvailable) {
      event.preventDefault();
      closeFallbackMode();
    }
    return;
  }

  if (event.code === "Backquote") {
    event.preventDefault();
    toggleDebugPanel();
    return;
  }

  if (event.code === "Escape" && appState.settingsOpen) {
    appState.settingsOpen = false;
    syncAppShell();
    restoreFocusTarget(refs.settingsToggle);
    flagInteractionRefresh();
    return;
  }

  const movementBlocked =
    !worldAvailable || appState.introOpen || appState.settingsOpen || appState.activeExhibit;

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
      if (!worldAvailable || appState.settingsOpen || appState.introOpen) {
        break;
      }
      if (appState.activeExhibit) {
        closeExhibit(true);
      } else if (appState.nearbyExhibit) {
        openExhibit(appState.nearbyExhibit);
      }
      break;
    case "Comma":
      if (worldAvailable && !appState.introOpen && !appState.activeExhibit) {
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
  if (!world || appState.introOpen || appState.fallbackOpen || appState.settingsOpen || appState.activeExhibit) {
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
    !world ||
    isTouchDevice ||
    appState.introOpen ||
    appState.fallbackOpen ||
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
  releaseTouchLook();
}

function releaseTouchLook(pointerId = appState.touchLookId) {
  if (pointerId === null || appState.touchLookId !== pointerId) {
    return;
  }

  appState.touchLookId = null;
  if (refs.canvas.hasPointerCapture?.(pointerId)) {
    refs.canvas.releasePointerCapture(pointerId);
  }
}

function endTouchLook(event) {
  releaseTouchLook(event.pointerId);
}

function onResize() {
  scheduleResize();
}
