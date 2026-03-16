const SETTINGS_STORAGE_KEY = "thomas-basham-portfolio-settings";
const GRAPHICS_QUALITY_LEVELS = ["low", "medium", "high"];

const SENSITIVITY_PROFILES = {
  low: {
    mouse: 0.75,
    touch: 0.78,
    buttonTurn: 0.78,
    buttonLook: 0.78,
  },
  normal: {
    mouse: 1,
    touch: 1,
    buttonTurn: 1,
    buttonLook: 1,
  },
  high: {
    mouse: 1.28,
    touch: 1.18,
    buttonTurn: 1.18,
    buttonLook: 1.18,
  },
};

export function getDefaultExperienceSettings(isTouchDevice, prefersReducedMotion) {
  return {
    reducedMotion: prefersReducedMotion,
    sensitivity: "normal",
    graphicsQuality: getAdaptiveGraphicsQuality(isTouchDevice),
  };
}

export function loadExperienceSettings(isTouchDevice, prefersReducedMotion) {
  const defaults = getDefaultExperienceSettings(isTouchDevice, prefersReducedMotion);

  try {
    const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return defaults;
    }

    const parsed = JSON.parse(rawValue);
    return {
      reducedMotion:
        typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : defaults.reducedMotion,
      sensitivity:
        parsed.sensitivity in SENSITIVITY_PROFILES
          ? parsed.sensitivity
          : defaults.sensitivity,
      graphicsQuality: GRAPHICS_QUALITY_LEVELS.includes(parsed.graphicsQuality)
        ? parsed.graphicsQuality
        : defaults.graphicsQuality,
    };
  } catch {
    return defaults;
  }
}

export function saveExperienceSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures and keep the in-memory settings active.
  }
}

export function getSensitivityProfile(level) {
  return SENSITIVITY_PROFILES[level] ?? SENSITIVITY_PROFILES.normal;
}

export function getAdaptiveGraphicsQuality(isTouchDevice) {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const deviceMemory = Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null;
  const hardwareConcurrency = Number.isFinite(navigator.hardwareConcurrency)
    ? navigator.hardwareConcurrency
    : null;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const mobileLikeDevice = isTouchDevice || coarsePointer;
  const constrainedDevice =
    (deviceMemory !== null && deviceMemory <= 4) ||
    (hardwareConcurrency !== null && hardwareConcurrency <= 4);
  const highHeadroom =
    !mobileLikeDevice &&
    (deviceMemory === null || deviceMemory >= 8) &&
    (hardwareConcurrency === null || hardwareConcurrency >= 8) &&
    devicePixelRatio <= 2.5;

  if (mobileLikeDevice) {
    return constrainedDevice || devicePixelRatio >= 2.5 ? "low" : "medium";
  }

  if (constrainedDevice) {
    return "medium";
  }

  return highHeadroom ? "high" : "medium";
}
