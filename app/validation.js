import { STARTUP_VALIDATION_CONFIG } from "./config.js";

const WARNING_PREFIX = "[portfolio]";

export function warnRecoverable(message, details) {
  if (details === undefined) {
    console.warn(`${WARNING_PREFIX} ${message}`);
    return;
  }

  console.warn(`${WARNING_PREFIX} ${message}`, details);
}

export function runStartupValidation({ refs, content }) {
  const preparedContent = preparePortfolioContent(content);
  const missingDomRefs = STARTUP_VALIDATION_CONFIG.requiredDomRefs.filter((key) => !refs[key]);

  if (missingDomRefs.length) {
    warnRecoverable(
      `Missing required DOM nodes: ${missingDomRefs.join(", ")}. Startup will abort until index.html matches the expected shell.`
    );
  }

  return {
    canInitialize: missingDomRefs.length === 0,
    content: preparedContent,
    missingDomRefs,
  };
}

export function preparePortfolioContent(content) {
  validateRequiredAssets(content.assets);

  const introActions = sanitizeActionList(content.intro?.actions, content.links, "intro");
  const fallbackCtaActions = sanitizeActionList(
    content.fallbackCta?.actions,
    content.links,
    "fallback CTA"
  );
  const exhibits = Array.isArray(content.exhibits)
    ? content.exhibits
        .map((exhibit, index) => prepareExhibit(exhibit, content.links, index))
        .filter(Boolean)
    : [];

  const exhibitsById = new Map(exhibits.map((exhibit) => [exhibit.id, exhibit]));
  STARTUP_VALIDATION_CONFIG.requiredLandmarkIds.forEach((id) => {
    if (!exhibitsById.has(id)) {
      warnRecoverable(
        `Expected landmark "${id}" is missing after validation. The fallback portfolio may show placeholder copy for that section.`
      );
    }
  });

  return {
    ...content,
    intro: {
      ...content.intro,
      actions: introActions,
    },
    fallbackCta: {
      ...content.fallbackCta,
      actions: fallbackCtaActions,
    },
    exhibits,
  };
}

function prepareExhibit(exhibit, links, index) {
  if (!exhibit || typeof exhibit !== "object") {
    warnRecoverable(`Skipping exhibit at index ${index} because it is not an object.`);
    return null;
  }

  const id = hasNonEmptyString(exhibit.id) ? exhibit.id : `exhibit-${index + 1}`;
  const missingFields = STARTUP_VALIDATION_CONFIG.requiredExhibitFields.filter((path) =>
    isMissingValue(readPath(exhibit, path))
  );
  if (missingFields.length) {
    warnRecoverable(
      `Skipping exhibit "${id}" because required fields are missing: ${missingFields.join(", ")}.`
    );
    return null;
  }

  if (!STARTUP_VALIDATION_CONFIG.supportedExhibitTypes.includes(exhibit.type)) {
    warnRecoverable(
      `Skipping exhibit "${id}" because type "${exhibit.type}" is not supported by the world renderer.`
    );
    return null;
  }

  const accent = hasNonEmptyString(exhibit.accent)
    ? exhibit.accent
    : STARTUP_VALIDATION_CONFIG.defaultExhibitAccent;
  if (!hasNonEmptyString(exhibit.accent)) {
    warnRecoverable(`Exhibit "${id}" is missing an accent color. Using the default accent.`);
  }

  const colliderRadius =
    typeof exhibit.colliderRadius === "number" && Number.isFinite(exhibit.colliderRadius)
      ? exhibit.colliderRadius
      : STARTUP_VALIDATION_CONFIG.defaultColliderRadius;
  if (colliderRadius === STARTUP_VALIDATION_CONFIG.defaultColliderRadius && exhibit.colliderRadius !== colliderRadius) {
    warnRecoverable(
      `Exhibit "${id}" is missing a valid collider radius. Using ${STARTUP_VALIDATION_CONFIG.defaultColliderRadius}.`
    );
  }

  return {
    ...exhibit,
    accent,
    colliderRadius,
    bullets: sanitizeStringList(exhibit.bullets),
    actions: sanitizeActionList(exhibit.actions, links, `exhibit:${id}`),
    position: {
      x: Number(exhibit.position.x),
      z: Number(exhibit.position.z),
    },
  };
}

function validateRequiredAssets(assets) {
  STARTUP_VALIDATION_CONFIG.requiredAssets.forEach(({ path, label }) => {
    if (!hasNonEmptyString(readPath(assets, path.join(".")))) {
      warnRecoverable(
        `${label} is not configured in portfolio content. A generated placeholder texture will be used instead.`
      );
    }
  });
}

function sanitizeActionList(actions, links, contextLabel) {
  if (!Array.isArray(actions)) {
    if (actions != null) {
      warnRecoverable(`Ignoring invalid action list for ${contextLabel}. Expected an array.`);
    }
    return [];
  }

  return actions
    .map((action, index) => sanitizeAction(action, links, contextLabel, index))
    .filter(Boolean);
}

function sanitizeAction(action, links, contextLabel, index) {
  if (!action || typeof action !== "object") {
    warnRecoverable(`Ignoring malformed action ${index + 1} in ${contextLabel}.`);
    return null;
  }

  if (!hasNonEmptyString(action.label)) {
    warnRecoverable(`Ignoring action ${index + 1} in ${contextLabel} because it is missing a label.`);
    return null;
  }

  if (action.type === "link") {
    if (!hasNonEmptyString(action.hrefKey) || !hasNonEmptyString(links?.[action.hrefKey])) {
      warnRecoverable(
        `Ignoring link action "${action.label}" in ${contextLabel} because hrefKey "${action.hrefKey}" is not defined.`
      );
      return null;
    }
    return { ...action };
  }

  if (action.type === "button") {
    if (!hasNonEmptyString(action.id)) {
      warnRecoverable(
        `Ignoring button action "${action.label}" in ${contextLabel} because it is missing an action id.`
      );
      return null;
    }
    return { ...action };
  }

  warnRecoverable(
    `Ignoring action "${action.label}" in ${contextLabel} because type "${action.type}" is unsupported.`
  );
  return null;
}

function sanitizeStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter(hasNonEmptyString);
}

function readPath(value, path) {
  const segments = Array.isArray(path) ? path : String(path).split(".");
  return segments.reduce((current, segment) => current?.[segment], value);
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isMissingValue(value) {
  return value == null || (typeof value === "string" && value.trim().length === 0);
}
