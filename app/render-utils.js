import { THREE } from "./three.js";
import { warnRecoverable } from "./validation.js";

const TEXTURE_SCALES = {
  low: 0.55,
  medium: 0.75,
  high: 1,
};

const TEXTURE_ANISOTROPY_CAPS = {
  low: 2,
  medium: 4,
  high: 8,
};

const glowMaterialCache = new Map();
const canvasTextureCache = new Map();
const fallbackTextureCache = new Map();

export function createMaterialPalette() {
  return {
    stone: new THREE.MeshStandardMaterial({
      color: 0x5a6966,
      roughness: 0.96,
      metalness: 0.03,
    }),
    stoneDark: new THREE.MeshStandardMaterial({
      color: 0x26312f,
      roughness: 0.98,
      metalness: 0.02,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xc3a46a,
      roughness: 0.38,
      metalness: 0.66,
    }),
    slate: new THREE.MeshStandardMaterial({
      color: 0x42515a,
      roughness: 0.8,
      metalness: 0.12,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xa7cacf,
      roughness: 0.14,
      metalness: 0.16,
      transparent: true,
      opacity: 0.78,
      emissive: new THREE.Color(0x274b52),
      emissiveIntensity: 0.65,
    }),
    bark: new THREE.MeshStandardMaterial({
      color: 0x5d4533,
      roughness: 0.96,
      metalness: 0.02,
    }),
    foliage: new THREE.MeshStandardMaterial({
      color: 0x628466,
      roughness: 0.98,
      metalness: 0.02,
    }),
  };
}

export function loadTexture(
  textureLoader,
  path,
  maxAnisotropy,
  quality = "high",
  label = "texture"
) {
  const texture = createFallbackTexture(label, maxAnisotropy, quality);
  if (!path) {
    warnRecoverable(`${label} is missing a source path. Using a generated placeholder texture.`);
    return texture;
  }

  textureLoader.load(
    path,
    (loadedTexture) => {
      texture.image = loadedTexture.image;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = loadedTexture.flipY;
      texture.wrapS = loadedTexture.wrapS;
      texture.wrapT = loadedTexture.wrapT;
      texture.needsUpdate = true;
      applyTextureQuality(texture, maxAnisotropy, quality);
    },
    undefined,
    (error) => {
      warnRecoverable(`${label} failed to load from "${path}". Using a generated placeholder texture.`, error);
    }
  );

  return texture;
}

export function createGlowMaterial(color, intensity) {
  const key = `${color}:${intensity}`;
  if (!glowMaterialCache.has(key)) {
    glowMaterialCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: intensity,
        roughness: 0.24,
        metalness: 0.08,
      })
    );
  }

  return glowMaterialCache.get(key);
}

export function createProjectTexture(exhibit, options) {
  return createCanvasTexture({
    width: 1024,
    height: 1400,
    quality: options.quality,
    maxAnisotropy: options.maxAnisotropy,
    cacheKey: `project:${exhibit.id}:${exhibit.title}:${exhibit.kicker}:${exhibit.accent}:${exhibit.glyph ?? ""}`,
    draw: (ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(9, 18, 24, 0.97)");
      gradient.addColorStop(1, "rgba(18, 37, 44, 0.93)");
      ctx.fillStyle = gradient;
      roundRect(ctx, 32, 32, width - 64, height - 64, 54);
      ctx.fill();

      ctx.strokeStyle = colorToRgba(exhibit.accent, 0.9);
      ctx.lineWidth = 5;
      roundRect(ctx, 52, 52, width - 104, height - 104, 42);
      ctx.stroke();

      const innerGlow = ctx.createRadialGradient(width / 2, 330, 40, width / 2, 330, 300);
      innerGlow.addColorStop(0, colorToRgba(exhibit.accent, 0.18));
      innerGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(width / 2, 330, 250, 0, Math.PI * 2);
      ctx.fill();

      if (exhibit.featuredTag) {
        ctx.fillStyle = "rgba(244, 220, 169, 0.1)";
        roundRect(ctx, width / 2 - 192, 92, 384, 66, 33);
        ctx.fill();
        ctx.strokeStyle = colorToRgba(exhibit.accent, 0.8);
        ctx.lineWidth = 2.5;
        roundRect(ctx, width / 2 - 192, 92, 384, 66, 33);
        ctx.stroke();
        ctx.fillStyle = "#f4dca9";
        ctx.font = "700 26px Manrope, sans-serif";
        ctx.fillText(exhibit.featuredTag.toUpperCase(), width / 2, 133);
      }

      ctx.fillStyle = colorToRgba(exhibit.accent, 0.16);
      ctx.font = "700 158px Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(exhibit.glyph, width / 2, 374);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(150, 694);
      ctx.lineTo(width - 150, 694);
      ctx.stroke();

      ctx.fillStyle = "#f8f0dd";
      ctx.font = "700 78px Cinzel, Georgia, serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 22;
      wrapText(ctx, exhibit.title, width / 2, 538, width - 170, 88);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(244, 220, 169, 0.75)";
      ctx.font = "700 28px Manrope, sans-serif";
      ctx.fillText(exhibit.zone.toUpperCase(), width / 2, 650);

      ctx.fillStyle = "rgba(247, 241, 227, 0.86)";
      ctx.font = "600 36px Manrope, sans-serif";
      wrapText(ctx, exhibit.kicker, width / 2, 802, width - 210, 50);
    },
  });
}

export function createPortalTexture(color, options) {
  return createCanvasTexture({
    width: 1024,
    height: 1024,
    quality: options.quality,
    maxAnisotropy: options.maxAnisotropy,
    cacheKey: `portal:${color}`,
    draw: (ctx, width, height) => {
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
    },
  });
}

export function createLabelTexture(eyebrow, title, accent, options) {
  return createCanvasTexture({
    width: 980,
    height: 360,
    quality: options.quality,
    maxAnisotropy: options.maxAnisotropy,
    cacheKey: `label:${eyebrow}:${title}:${accent}`,
    draw: (ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(8, 18, 24, 0.92)");
      gradient.addColorStop(1, "rgba(9, 20, 25, 0.28)");
      ctx.fillStyle = gradient;
      roundRect(ctx, 28, 28, width - 56, height - 56, 50);
      ctx.fill();

      const topGlow = ctx.createLinearGradient(0, 50, 0, 180);
      topGlow.addColorStop(0, colorToRgba(accent, 0.18));
      topGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = topGlow;
      roundRect(ctx, 44, 44, width - 88, 124, 34);
      ctx.fill();

      ctx.strokeStyle = colorToRgba(accent, 0.84);
      ctx.lineWidth = 3.5;
      roundRect(ctx, 44, 44, width - 88, height - 88, 34);
      ctx.stroke();

      ctx.fillStyle = "rgba(244, 220, 169, 0.9)";
      ctx.textAlign = "center";
      ctx.font = "700 26px Manrope, sans-serif";
      ctx.fillText(eyebrow.toUpperCase(), width / 2, 108);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(118, 138);
      ctx.lineTo(width - 118, 138);
      ctx.stroke();

      ctx.fillStyle = "#fbf5e6";
      ctx.font = "700 66px Cinzel, Georgia, serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 18;
      wrapText(ctx, title, width / 2, 230, width - 120, 70);
      ctx.shadowBlur = 0;
    },
  });
}

export function createSigilTexture(text, accent, options) {
  return createCanvasTexture({
    width: 512,
    height: 512,
    quality: options.quality,
    maxAnisotropy: options.maxAnisotropy,
    cacheKey: `sigil:${text}:${accent}`,
    draw: (ctx, width, height) => {
      const center = width / 2;
      ctx.fillStyle = "rgba(8, 20, 24, 0.78)";
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
      ctx.font = "700 112px Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
      ctx.shadowBlur = 14;
      ctx.fillText(text, center, 292);
      ctx.shadowBlur = 0;
    },
  });
}

export function applyTextureQuality(texture, maxAnisotropy, quality = "high") {
  texture.anisotropy = getTextureAnisotropy(maxAnisotropy, quality);
  texture.needsUpdate = true;
  return texture;
}

function createCanvasTexture({ width, height, maxAnisotropy, quality = "high", cacheKey, draw }) {
  const scale = TEXTURE_SCALES[quality] ?? TEXTURE_SCALES.high;
  const scaledWidth = Math.max(256, Math.round(width * scale));
  const scaledHeight = Math.max(256, Math.round(height * scale));
  const anisotropy = getTextureAnisotropy(maxAnisotropy, quality);
  const resolvedCacheKey = cacheKey
    ? `${cacheKey}:${scaledWidth}x${scaledHeight}:${anisotropy}`
    : null;

  if (resolvedCacheKey && canvasTextureCache.has(resolvedCacheKey)) {
    return canvasTextureCache.get(resolvedCacheKey);
  }

  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = scaledWidth;
  textureCanvas.height = scaledHeight;
  const ctx = textureCanvas.getContext("2d");
  if (!ctx) {
    warnRecoverable("Unable to create a 2D canvas context for UI textures. Using a generated placeholder texture.");
    return createFallbackTexture("ui texture", maxAnisotropy, quality);
  }
  ctx.setTransform(scaledWidth / width, 0, 0, scaledHeight / height, 0, 0);

  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter =
    quality === "low" ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = quality !== "low";
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;

  if (resolvedCacheKey) {
    canvasTextureCache.set(resolvedCacheKey, texture);
  }

  return texture;
}

function getTextureAnisotropy(maxAnisotropy, quality) {
  return Math.min(TEXTURE_ANISOTROPY_CAPS[quality] ?? TEXTURE_ANISOTROPY_CAPS.medium, maxAnisotropy);
}

function createFallbackTexture(label, maxAnisotropy, quality) {
  const cacheKey = `${label}:${quality}`;
  if (!fallbackTextureCache.has(cacheKey)) {
    const pixels = new Uint8Array([
      244,
      220,
      169,
      255,
      34,
      56,
      63,
      255,
      34,
      56,
      63,
      255,
      118,
      139,
      143,
      255,
    ]);
    const texture = new THREE.DataTexture(pixels, 2, 2, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.name = `fallback:${label}`;
    fallbackTextureCache.set(cacheKey, applyTextureQuality(texture, maxAnisotropy, quality));
  }

  return fallbackTextureCache.get(cacheKey);
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
