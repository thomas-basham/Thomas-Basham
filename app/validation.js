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

  const positionX = normalizeFiniteNumber(exhibit.position?.x);
  const positionZ = normalizeFiniteNumber(exhibit.position?.z);
  if (positionX === null || positionZ === null) {
    warnRecoverable(
      `Skipping exhibit "${id}" because position.x and position.z must be finite numbers.`
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
    normalizeFiniteNumber(exhibit.colliderRadius) ??
    STARTUP_VALIDATION_CONFIG.defaultColliderRadius;
  if (
    colliderRadius === STARTUP_VALIDATION_CONFIG.defaultColliderRadius &&
    normalizeFiniteNumber(exhibit.colliderRadius) === null
  ) {
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
    sigils: sanitizeStringList(exhibit.sigils).slice(0, 6),
    glyph: normalizeExhibitGlyph(exhibit),
    featuredRank: normalizeFiniteNumber(exhibit.featuredRank) ?? undefined,
    emphasisScale: normalizePositiveFiniteNumber(exhibit.emphasisScale),
    position: {
      x: positionX,
      z: positionZ,
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

function normalizeExhibitGlyph(exhibit) {
  if (hasNonEmptyString(exhibit.glyph)) {
    return exhibit.glyph.trim().slice(0, 6);
  }

  if (exhibit.type !== "project") {
    return undefined;
  }

  const fallbackGlyph = String(exhibit.title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (fallbackGlyph) {
    warnRecoverable(
      `Project exhibit "${exhibit.id}" is missing a glyph. Using "${fallbackGlyph}".`
    );
  }

  return fallbackGlyph || "PX";
}

function normalizeFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizePositiveFiniteNumber(value) {
  const normalized = normalizeFiniteNumber(value);
  return normalized !== null && normalized > 0 ? normalized : undefined;
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
