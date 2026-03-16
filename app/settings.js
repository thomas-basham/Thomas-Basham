const SETTINGS_STORAGE_KEY = "thomas-basham-portfolio-settings";

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
    graphicsQuality: isTouchDevice ? "medium" : "high",
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
      graphicsQuality: ["low", "medium", "high"].includes(parsed.graphicsQuality)
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
