import { THREE } from "./three.js";

export function createMaterialPalette() {
  return {
    stone: new THREE.MeshStandardMaterial({
      color: 0x52655d,
      roughness: 0.98,
      metalness: 0.03,
    }),
    stoneDark: new THREE.MeshStandardMaterial({
      color: 0x2d3935,
      roughness: 1,
      metalness: 0.02,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xb99153,
      roughness: 0.32,
      metalness: 0.72,
    }),
    slate: new THREE.MeshStandardMaterial({
      color: 0x41515b,
      roughness: 0.76,
      metalness: 0.16,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x9dc5c8,
      roughness: 0.16,
      metalness: 0.2,
      transparent: true,
      opacity: 0.82,
      emissive: new THREE.Color(0x25484e),
      emissiveIntensity: 0.8,
    }),
    bark: new THREE.MeshStandardMaterial({
      color: 0x5b4430,
      roughness: 1,
      metalness: 0.02,
    }),
    foliage: new THREE.MeshStandardMaterial({
      color: 0x5f8161,
      roughness: 1,
      metalness: 0.02,
    }),
  };
}

export function loadTexture(textureLoader, path, maxAnisotropy) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  return texture;
}

export function createGlowMaterial(color, intensity) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.15,
  });
}

export function createProjectTexture(exhibit, maxAnisotropy) {
  return createCanvasTexture(1024, 1400, maxAnisotropy, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(9, 22, 26, 0.95)");
    gradient.addColorStop(1, "rgba(19, 42, 46, 0.9)");
    ctx.fillStyle = gradient;
    roundRect(ctx, 32, 32, width - 64, height - 64, 54);
    ctx.fill();

    ctx.strokeStyle = exhibit.accent;
    ctx.lineWidth = 6;
    roundRect(ctx, 52, 52, width - 104, height - 104, 42);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.arc(width / 2, 280, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = exhibit.accent;
    ctx.font = "700 170px Cinzel, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(exhibit.glyph, width / 2, 335);

    ctx.fillStyle = "#f8f0dd";
    ctx.font = "700 82px Cinzel, Georgia, serif";
    wrapText(ctx, exhibit.title, width / 2, 560, width - 180, 92);

    ctx.fillStyle = "rgba(244, 220, 169, 0.75)";
    ctx.font = "700 30px Manrope, sans-serif";
    ctx.fillText(exhibit.zone.toUpperCase(), width / 2, 685);

    ctx.fillStyle = "rgba(247, 241, 227, 0.86)";
    ctx.font = "600 38px Manrope, sans-serif";
    wrapText(ctx, exhibit.kicker, width / 2, 835, width - 210, 52);
  });
}

export function createPortalTexture(color, maxAnisotropy) {
  return createCanvasTexture(1024, 1024, maxAnisotropy, (ctx, width, height) => {
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
  });
}

export function createLabelTexture(eyebrow, title, accent, maxAnisotropy) {
  return createCanvasTexture(900, 340, maxAnisotropy, (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(10, 20, 25, 0.8)");
    gradient.addColorStop(1, "rgba(10, 20, 25, 0.15)");
    ctx.fillStyle = gradient;
    roundRect(ctx, 28, 28, width - 56, height - 56, 46);
    ctx.fill();

    ctx.strokeStyle = colorToRgba(accent, 0.8);
    ctx.lineWidth = 4;
    roundRect(ctx, 44, 44, width - 88, height - 88, 34);
    ctx.stroke();

    ctx.fillStyle = "rgba(244, 220, 169, 0.9)";
    ctx.textAlign = "center";
    ctx.font = "700 28px Manrope, sans-serif";
    ctx.fillText(eyebrow.toUpperCase(), width / 2, 110);

    ctx.fillStyle = "#fbf5e6";
    ctx.font = "700 64px Cinzel, Georgia, serif";
    wrapText(ctx, title, width / 2, 210, width - 120, 68);
  });
}

export function createSigilTexture(text, accent, maxAnisotropy) {
  return createCanvasTexture(512, 512, maxAnisotropy, (ctx, width, height) => {
    const center = width / 2;
    ctx.fillStyle = "rgba(8, 20, 24, 0.75)";
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
    ctx.font = "700 120px Cinzel, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(text, center, 295);
  });
}

function createCanvasTexture(width, height, maxAnisotropy, draw) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = width;
  textureCanvas.height = height;
  const ctx = textureCanvas.getContext("2d");

  draw(ctx, width, height);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  return texture;
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
