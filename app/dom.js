function createActionElement(action, links, handlers = {}) {
  const element = document.createElement(action.type === "button" ? "button" : "a");
  element.className = `action-button${
    action.variant === "primary" ? " action-button--primary" : ""
  }`;

  if (action.type === "button") {
    element.type = "button";
    const handler = handlers[action.id];
    if (handler) {
      element.addEventListener("click", handler);
    }
  } else {
    element.href = links[action.hrefKey];
    if (!element.href.startsWith("mailto:")) {
      element.target = "_blank";
      element.rel = "noreferrer";
    }
  }

  element.textContent = action.label;
  return element;
}

function renderActionList(container, actions, links, handlers) {
  container.innerHTML = "";
  actions.forEach((action) => {
    container.appendChild(createActionElement(action, links, handlers));
  });
}

function setHiddenState(element, hidden) {
  element.classList.toggle("hidden", hidden);
  element.setAttribute("aria-hidden", String(hidden));
}

function renderBulletList(container, bullets) {
  if (!bullets?.length) {
    return;
  }

  const list = document.createElement("ul");
  list.className = "fallback-card__bullets";
  bullets.forEach((bullet) => {
    const item = document.createElement("li");
    item.textContent = bullet;
    list.appendChild(item);
  });
  container.appendChild(list);
}

function createFallbackCard(card, content, handlers = {}) {
  const article = document.createElement("article");
  article.className = "fallback-card";
  if (card.meta) {
    article.classList.add("fallback-card--featured");
  }
  if (card.accent) {
    article.style.setProperty("--fallback-accent", card.accent);
  }

  if (card.meta) {
    const meta = document.createElement("span");
    meta.className = "fallback-card__meta";
    meta.textContent = card.meta;
    article.appendChild(meta);
  }

  const eyebrow = document.createElement("span");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = card.eyebrow;

  const title = document.createElement("h3");
  title.textContent = card.title;

  const kicker = document.createElement("p");
  kicker.className = "fallback-card__kicker";
  kicker.textContent = card.kicker;

  const body = document.createElement("p");
  body.className = "fallback-card__body";
  body.textContent = card.body;

  article.append(eyebrow, title, kicker, body);
  renderBulletList(article, card.bullets);

  if (card.actions?.length) {
    const actions = document.createElement("div");
    actions.className = "fallback-card__actions";
    renderActionList(actions, card.actions, content.links, handlers);
    article.appendChild(actions);
  }

  return article;
}

function createFallbackSection(section, content, handlers = {}) {
  const element = document.createElement("section");
  element.className = `fallback-section fallback-section--${section.layout}`;

  const header = document.createElement("header");
  header.className = "fallback-section__header";

  const eyebrow = document.createElement("span");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = section.eyebrow;

  const title = document.createElement("h2");
  title.textContent = section.title;
  header.append(eyebrow, title);

  const grid = document.createElement("div");
  grid.className = `fallback-section__grid fallback-section__grid--${section.layout}`;
  section.cards.forEach((card) => {
    grid.appendChild(createFallbackCard(card, content, handlers));
  });

  element.append(header, grid);
  return element;
}

function renderIntroCards(container, cards) {
  container.innerHTML = "";
  cards.forEach((card) => {
    const cardElement = document.createElement("div");
    const title = document.createElement("h3");
    const body = document.createElement("p");

    title.textContent = card.title;
    body.textContent = card.body;
    cardElement.append(title, body);
    container.appendChild(cardElement);
  });
}

function renderChoiceGroup(container, options, groupName, onSelect) {
  container.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "setting-choice";
    button.dataset.group = groupName;
    button.dataset.value = option.id;
    button.textContent = option.label;
    button.addEventListener("click", () => onSelect(option.id));
    container.appendChild(button);
  });
}

function updateChoiceGroup(container, selectedValue) {
  container.querySelectorAll(".setting-choice").forEach((button) => {
    const isSelected = button.dataset.value === selectedValue;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

export function getDomRefs() {
  return {
    body: document.body,
    canvas: document.getElementById("world"),
    brandEyebrow: document.getElementById("brand-eyebrow"),
    brandTitle: document.getElementById("brand-title"),
    zoneName: document.getElementById("zone-name"),
    zoneDistance: document.getElementById("zone-distance"),
    pointerToggle: document.getElementById("pointer-toggle"),
    portfolioToggle: document.getElementById("portfolio-toggle"),
    pointerHint: document.getElementById("pointer-hint"),
    fallbackCta: document.getElementById("fallback-cta"),
    fallbackCtaEyebrow: document.getElementById("fallback-cta-eyebrow"),
    fallbackCtaTitle: document.getElementById("fallback-cta-title"),
    fallbackCtaBody: document.getElementById("fallback-cta-body"),
    fallbackCtaActions: document.getElementById("fallback-cta-actions"),
    settingsToggle: document.getElementById("settings-toggle"),
    settingsPanel: document.getElementById("settings-panel"),
    settingsEyebrow: document.getElementById("settings-eyebrow"),
    settingsTitle: document.getElementById("settings-title"),
    settingsClose: document.getElementById("settings-close"),
    settingsNote: document.getElementById("settings-note"),
    reducedMotionLabel: document.getElementById("reduced-motion-label"),
    reducedMotionDescription: document.getElementById("reduced-motion-description"),
    reducedMotionToggle: document.getElementById("reduced-motion-toggle"),
    sensitivityLabel: document.getElementById("sensitivity-label"),
    sensitivityOptions: document.getElementById("sensitivity-options"),
    graphicsLabel: document.getElementById("graphics-label"),
    graphicsOptions: document.getElementById("graphics-options"),
    introPanel: document.getElementById("intro-panel"),
    introEyebrow: document.getElementById("intro-eyebrow"),
    introTitle: document.getElementById("intro-title"),
    introBody: document.getElementById("intro-body"),
    introGrid: document.getElementById("intro-grid"),
    introActions: document.getElementById("intro-actions"),
    fallbackPanel: document.getElementById("fallback-panel"),
    fallbackStatus: document.getElementById("fallback-status"),
    fallbackClose: document.getElementById("fallback-close"),
    fallbackHeroEyebrow: document.getElementById("fallback-hero-eyebrow"),
    fallbackHeroTitle: document.getElementById("fallback-hero-title"),
    fallbackHeroKicker: document.getElementById("fallback-hero-kicker"),
    fallbackHeroBody: document.getElementById("fallback-hero-body"),
    fallbackHeroActions: document.getElementById("fallback-hero-actions"),
    fallbackSections: document.getElementById("fallback-sections"),
    inspectPanel: document.getElementById("inspect-panel"),
    inspectZone: document.getElementById("inspect-zone"),
    inspectTitle: document.getElementById("inspect-title"),
    inspectKicker: document.getElementById("inspect-kicker"),
    inspectBody: document.getElementById("inspect-body"),
    inspectBullets: document.getElementById("inspect-bullets"),
    inspectActions: document.getElementById("inspect-actions"),
    inspectPrompt: document.getElementById("inspect-prompt"),
    promptEyebrow: document.getElementById("prompt-eyebrow"),
    promptTitle: document.getElementById("prompt-title"),
    promptHint: document.getElementById("prompt-hint"),
    controlsEyebrow: document.getElementById("controls-eyebrow"),
    controlsCopy: document.getElementById("controls-copy"),
    crosshair: document.getElementById("crosshair"),
    debugPanel: document.getElementById("debug-panel"),
    debugTitle: document.getElementById("debug-title"),
    debugFps: document.getElementById("debug-fps"),
    debugQuality: document.getElementById("debug-quality"),
    debugDraws: document.getElementById("debug-draws"),
    debugTriangles: document.getElementById("debug-triangles"),
    noScriptCopy: document.getElementById("noscript-copy"),
    mobileInspect: document.getElementById("mobile-inspect"),
    mobileSprintLabel: document.getElementById("mobile-sprint-label"),
    mobileInspectLabel: document.getElementById("mobile-inspect-label"),
    controlButtons: Array.from(document.querySelectorAll("[data-control]")),
  };
}

export function hydrateStaticContent(refs, content, isTouchDevice, actionHandlers) {
  refs.brandEyebrow.textContent = content.brand.eyebrow;
  refs.brandTitle.textContent = content.brand.title;
  refs.zoneName.textContent = content.status.defaultZoneName;
  refs.zoneDistance.textContent = content.status.defaultZoneDistance;
  refs.settingsToggle.textContent = content.utility.settingsButton;
  refs.portfolioToggle.textContent = content.fallbackMode.openLabel;
  refs.fallbackCtaEyebrow.textContent = content.fallbackCta.eyebrow;
  refs.fallbackCtaTitle.textContent = content.fallbackCta.title;
  refs.fallbackCtaBody.textContent = content.fallbackCta.body;
  renderActionList(
    refs.fallbackCtaActions,
    content.fallbackCta.actions,
    content.links,
    actionHandlers
  );
  refs.settingsEyebrow.textContent = content.settings.eyebrow;
  refs.settingsTitle.textContent = content.settings.title;
  refs.settingsClose.textContent = content.settings.closeLabel;
  refs.reducedMotionLabel.textContent = content.settings.reducedMotion.label;
  refs.reducedMotionDescription.textContent = content.settings.reducedMotion.description;
  refs.sensitivityLabel.textContent = content.settings.sensitivity.label;
  refs.graphicsLabel.textContent = content.settings.graphics.label;
  refs.mobileSprintLabel.textContent = content.mobileActions.sprint;
  refs.mobileInspectLabel.textContent = content.mobileActions.inspect;

  refs.introEyebrow.textContent = content.intro.eyebrow;
  refs.introTitle.textContent = content.intro.title;
  refs.introBody.textContent = content.intro.body;
  renderIntroCards(refs.introGrid, content.intro.cards);
  renderActionList(refs.introActions, content.intro.actions, content.links, actionHandlers);

  refs.inspectZone.textContent = content.inspect.defaultZone;
  refs.promptEyebrow.textContent = content.prompt.eyebrow;
  refs.promptTitle.textContent = content.prompt.defaultTitle;
  refs.promptHint.textContent = isTouchDevice
    ? content.prompt.mobileHint
    : content.prompt.desktopHint;
  refs.controlsEyebrow.textContent = content.controls.eyebrow;
  refs.controlsCopy.textContent = isTouchDevice
    ? content.controls.mobile
    : content.controls.desktop;
  refs.debugTitle.textContent = content.debug.title;
  refs.debugFps.setAttribute("data-label", content.debug.fpsLabel);
  refs.debugQuality.setAttribute("data-label", content.debug.qualityLabel);
  refs.debugDraws.setAttribute("data-label", content.debug.drawsLabel);
  refs.debugTriangles.setAttribute("data-label", content.debug.trianglesLabel);
  refs.crosshair.classList.toggle("hidden", isTouchDevice);
  refs.pointerToggle.classList.toggle("hidden", isTouchDevice);
  refs.pointerToggle.setAttribute("aria-hidden", String(isTouchDevice));
  refs.mobileInspect.disabled = true;
  refs.mobileInspect.classList.add("is-disabled");
  if (refs.noScriptCopy) {
    refs.noScriptCopy.textContent = content.noScript;
  }

  renderChoiceGroup(
    refs.sensitivityOptions,
    content.settings.sensitivity.options,
    "sensitivity",
    actionHandlers.selectSensitivity
  );
  renderChoiceGroup(
    refs.graphicsOptions,
    content.settings.graphics.options,
    "graphics",
    actionHandlers.selectGraphicsQuality
  );
  refs.settingsToggle.addEventListener("click", actionHandlers.toggleSettingsMenu);
  refs.settingsClose.addEventListener("click", actionHandlers.toggleSettingsMenu);
  refs.portfolioToggle.addEventListener("click", actionHandlers.toggleFallbackMode);
  refs.pointerToggle.addEventListener("click", actionHandlers.togglePointerLock);
  refs.reducedMotionToggle.addEventListener("click", actionHandlers.toggleReducedMotion);
  refs.mobileInspect.addEventListener("click", actionHandlers.mobileInspect);
}

export function renderFallbackPortfolio(refs, content, fallbackContent, handlers = {}) {
  refs.fallbackHeroEyebrow.textContent = fallbackContent.hero.eyebrow;
  refs.fallbackHeroTitle.textContent = fallbackContent.hero.title;
  refs.fallbackHeroKicker.textContent = fallbackContent.hero.kicker;
  refs.fallbackHeroBody.textContent = fallbackContent.hero.body;
  refs.fallbackHeroTitle.tabIndex = -1;
  renderActionList(
    refs.fallbackHeroActions,
    fallbackContent.hero.actions,
    content.links,
    handlers
  );

  refs.fallbackSections.innerHTML = "";
  fallbackContent.sections.forEach((section) => {
    refs.fallbackSections.appendChild(createFallbackSection(section, content, handlers));
  });
}

export function renderInspectPanel(refs, content, exhibit, onClose) {
  refs.inspectZone.textContent = exhibit.zone;
  refs.inspectTitle.textContent = exhibit.title;
  refs.inspectKicker.textContent = exhibit.kicker;
  refs.inspectBody.textContent = exhibit.body;
  refs.inspectBullets.innerHTML = "";
  refs.inspectActions.innerHTML = "";

  const closeButton = createActionElement(
    {
      type: "button",
      id: "closeInspect",
      label: content.inspect.closeLabel,
      variant: "primary",
    },
    content.links,
    { closeInspect: onClose }
  );
  closeButton.classList.add("action-button--subtle");
  exhibit.bullets.forEach((bullet) => {
    const item = document.createElement("li");
    item.textContent = bullet;
    refs.inspectBullets.appendChild(item);
  });

  renderActionList(refs.inspectActions, exhibit.actions, content.links);
  refs.inspectActions.appendChild(closeButton);
  setHiddenState(refs.inspectPanel, false);
}

export function hideInspectPanel(refs) {
  setHiddenState(refs.inspectPanel, true);
}

export function setPromptState(refs, content, options) {
  const { visible, title, isTouchDevice, isIntroOpen } = options;
  const promptVisible = visible && !isIntroOpen;
  const promptHint = isTouchDevice
    ? content.prompt.mobileHint
    : content.prompt.desktopHint;
  refs.promptTitle.textContent = title ?? content.prompt.defaultTitle;
  refs.promptHint.textContent = promptHint;
  refs.inspectPrompt.disabled = !promptVisible;
  refs.inspectPrompt.setAttribute(
    "aria-label",
    promptVisible
      ? `${title ?? content.prompt.defaultTitle}. ${promptHint}.`
      : content.prompt.defaultTitle
  );
  setHiddenState(refs.inspectPrompt, !promptVisible);
}

export function updateZoneStatus(refs, zoneName, distanceText, accent = null) {
  refs.zoneName.textContent = zoneName;
  refs.zoneDistance.textContent = distanceText;
  refs.body.style.setProperty("--zone-accent", accent ?? "var(--gold)");
}

export function updateUtilityState(refs, content, options) {
  const { isTouchDevice, pointerLocked, settingsOpen, fallbackOpen, worldAvailable, introOpen } = options;
  const controlsDisabled = !worldAvailable || fallbackOpen || introOpen;
  const hint = isTouchDevice
    ? content.utility.mobileHint
    : pointerLocked
      ? content.utility.pointerLockedHint
      : content.utility.pointerUnlockedHint;
  refs.portfolioToggle.textContent =
    fallbackOpen && worldAvailable
      ? content.fallbackMode.closeLabel
      : worldAvailable
        ? content.fallbackMode.openLabel
        : content.fallbackMode.unavailableLabel;
  refs.portfolioToggle.setAttribute("aria-expanded", String(fallbackOpen));
  refs.portfolioToggle.setAttribute("aria-pressed", String(fallbackOpen));
  refs.portfolioToggle.disabled = !worldAvailable && fallbackOpen;
  refs.pointerToggle.textContent = pointerLocked
    ? content.utility.pointerLockedLabel
    : content.utility.pointerUnlockedLabel;
  refs.pointerToggle.setAttribute("aria-pressed", String(pointerLocked));
  refs.pointerHint.textContent = hint;
  refs.settingsNote.textContent = hint;
  refs.settingsToggle.setAttribute("aria-expanded", String(settingsOpen));
  refs.settingsToggle.setAttribute("aria-pressed", String(settingsOpen));
  refs.pointerToggle.disabled = controlsDisabled;
  refs.settingsToggle.disabled = controlsDisabled;
  refs.portfolioToggle.setAttribute("aria-disabled", String(refs.portfolioToggle.disabled));
  refs.pointerToggle.setAttribute("aria-disabled", String(refs.pointerToggle.disabled));
  refs.settingsToggle.setAttribute("aria-disabled", String(refs.settingsToggle.disabled));
  setHiddenState(refs.settingsPanel, !settingsOpen);
}

export function updateFallbackState(refs, content, options) {
  const { fallbackOpen, worldAvailable, webglUnavailable } = options;
  refs.body.classList.toggle("is-fallback-open", fallbackOpen);
  refs.body.classList.toggle("is-webgl-unavailable", webglUnavailable);
  refs.canvas.setAttribute("aria-hidden", String(fallbackOpen || webglUnavailable));
  setHiddenState(refs.fallbackPanel, !fallbackOpen);
  refs.fallbackClose.textContent = content.fallbackMode.closeButtonLabel;
  setHiddenState(refs.fallbackClose, !worldAvailable);

  if (webglUnavailable) {
    refs.fallbackStatus.textContent = content.fallbackMode.unavailableMessage;
    setHiddenState(refs.fallbackStatus, false);
  } else {
    refs.fallbackStatus.textContent = "";
    setHiddenState(refs.fallbackStatus, true);
  }
}

export function updateSettingsControls(refs, content, settings) {
  const reducedMotionOn = settings.reducedMotion;
  refs.reducedMotionToggle.textContent = reducedMotionOn
    ? content.settings.reducedMotion.on
    : content.settings.reducedMotion.off;
  refs.reducedMotionToggle.setAttribute("aria-pressed", String(reducedMotionOn));
  refs.reducedMotionToggle.classList.toggle("is-selected", reducedMotionOn);

  updateChoiceGroup(refs.sensitivityOptions, settings.sensitivity);
  updateChoiceGroup(refs.graphicsOptions, settings.graphicsQuality);
}

export function updateDebugMetrics(refs, options) {
  const { visible, fps, graphicsQuality, drawCalls, triangles } = options;
  refs.debugPanel.classList.toggle("hidden", !visible);
  if (!visible) {
    return;
  }

  refs.debugFps.textContent = String(fps);
  refs.debugQuality.textContent =
    typeof graphicsQuality === "string"
      ? `${graphicsQuality.charAt(0).toUpperCase()}${graphicsQuality.slice(1)}`
      : "";
  refs.debugDraws.textContent = String(drawCalls);
  refs.debugTriangles.textContent = Number(triangles).toLocaleString();
}
