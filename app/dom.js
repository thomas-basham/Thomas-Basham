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
    pointerHint: document.getElementById("pointer-hint"),
    settingsToggle: document.getElementById("settings-toggle"),
    settingsPanel: document.getElementById("settings-panel"),
    settingsEyebrow: document.getElementById("settings-eyebrow"),
    settingsTitle: document.getElementById("settings-title"),
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
  refs.settingsEyebrow.textContent = content.settings.eyebrow;
  refs.settingsTitle.textContent = content.settings.title;
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
  refs.crosshair.classList.toggle("hidden", isTouchDevice);
  refs.pointerToggle.classList.toggle("hidden", isTouchDevice);
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
  refs.pointerToggle.addEventListener("click", actionHandlers.togglePointerLock);
  refs.reducedMotionToggle.addEventListener("click", actionHandlers.toggleReducedMotion);
  refs.mobileInspect.addEventListener("click", actionHandlers.mobileInspect);
}

export function renderInspectPanel(refs, content, exhibit, onClose) {
  refs.inspectZone.textContent = exhibit.zone;
  refs.inspectTitle.textContent = exhibit.title;
  refs.inspectKicker.textContent = exhibit.kicker;
  refs.inspectBody.textContent = exhibit.body;
  refs.inspectBullets.innerHTML = "";
  refs.inspectActions.innerHTML = "";

  exhibit.bullets.forEach((bullet) => {
    const item = document.createElement("li");
    item.textContent = bullet;
    refs.inspectBullets.appendChild(item);
  });

  renderActionList(refs.inspectActions, exhibit.actions, content.links);

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
  refs.inspectActions.appendChild(closeButton);
  refs.inspectPanel.classList.remove("hidden");
}

export function hideInspectPanel(refs) {
  refs.inspectPanel.classList.add("hidden");
}

export function setPromptState(refs, content, options) {
  const { visible, title, isTouchDevice, isIntroOpen } = options;
  refs.promptTitle.textContent = title ?? content.prompt.defaultTitle;
  refs.promptHint.textContent = isTouchDevice
    ? content.prompt.mobileHint
    : content.prompt.desktopHint;
  refs.inspectPrompt.classList.toggle("hidden", !visible || isIntroOpen);
}

export function updateZoneStatus(refs, zoneName, distanceText) {
  refs.zoneName.textContent = zoneName;
  refs.zoneDistance.textContent = distanceText;
}

export function updateUtilityState(refs, content, options) {
  const { isTouchDevice, pointerLocked, settingsOpen } = options;
  const hint = isTouchDevice
    ? content.utility.mobileHint
    : pointerLocked
      ? content.utility.pointerLockedHint
      : content.utility.pointerUnlockedHint;
  refs.pointerToggle.textContent = pointerLocked
    ? content.utility.pointerLockedLabel
    : content.utility.pointerUnlockedLabel;
  refs.pointerToggle.setAttribute("aria-pressed", String(pointerLocked));
  refs.pointerHint.textContent = hint;
  refs.settingsNote.textContent = hint;
  refs.settingsToggle.setAttribute("aria-expanded", String(settingsOpen));
  refs.settingsToggle.setAttribute("aria-pressed", String(settingsOpen));
  refs.settingsPanel.classList.toggle("hidden", !settingsOpen);
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
