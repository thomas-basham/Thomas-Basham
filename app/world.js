import { THREE } from "./three.js";
import {
  applyTextureQuality,
  createGlowMaterial,
  createLabelTexture,
  createMaterialPalette,
  createPortalTexture,
  createProjectTexture,
  createSigilTexture,
  loadTexture,
} from "./render-utils.js";

const WORLD_CONFIG = {
  worldRadius: 88,
  eyeHeight: 1.72,
  baseFov: 72,
  interactDistance: 7.25,
  playerRadius: 0.92,
  turnSpeed: 1.55,
  lookSpeed: 1.15,
  spawn: {
    x: 0,
    z: 28,
  },
};

const QUALITY_PROFILES = {
  low: {
    desktopPixelRatio: 1,
    mobilePixelRatio: 0.8,
    desktopShadows: false,
    fogDensity: 0.0134,
    shadowMapSize: 0,
    textureQuality: "low",
    motionScale: 0.55,
    pulseScale: 0.55,
    ambientUpdateInterval: 1 / 24,
    lanternLights: false,
    landmarkLightScale: 0.72,
  },
  medium: {
    desktopPixelRatio: 1.35,
    mobilePixelRatio: 1,
    desktopShadows: false,
    fogDensity: 0.0125,
    shadowMapSize: 0,
    textureQuality: "medium",
    motionScale: 0.78,
    pulseScale: 0.82,
    ambientUpdateInterval: 1 / 30,
    lanternLights: true,
    landmarkLightScale: 0.88,
  },
  high: {
    desktopPixelRatio: 1.85,
    mobilePixelRatio: 1.2,
    desktopShadows: true,
    fogDensity: 0.012,
    shadowMapSize: 1536,
    textureQuality: "high",
    motionScale: 1,
    pulseScale: 1,
    ambientUpdateInterval: 0,
    lanternLights: true,
    landmarkLightScale: 1,
  },
};

export function createWorld({ canvas, isTouchDevice, assetPaths, exhibitContent }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isTouchDevice,
    powerPreference: isTouchDevice ? "low-power" : "high-performance",
  });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x30515c);
  scene.fog = new THREE.FogExp2(0x4f7380, 0.012);

  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );
  const clock = new THREE.Clock();
  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const materials = createMaterialPalette();
  const geometryCache = new Map();
  const staticTextures = [];
  const nearestExhibitResult = {
    exhibit: null,
    distance: Number.POSITIVE_INFINITY,
    surfaceDistance: Number.POSITIVE_INFINITY,
  };
  const instanceTransform = new THREE.Object3D();
  const exhibits = exhibitContent.map((exhibit) => ({
    ...exhibit,
    position: new THREE.Vector3(exhibit.position.x, 0, exhibit.position.z),
  }));
  const worldState = {
    staticSceneBuilt: false,
    exhibitsBuilt: false,
    floaters: [],
    pulsingLights: [],
    obstacleFields: [],
    reducedMotion: false,
    graphicsQuality: isTouchDevice ? "medium" : "high",
    dynamicTextureBindings: [],
    ambientTickAccumulator: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    viewportPixelRatio: 0,
  };
  const resolvedPosition = new THREE.Vector3();
  const textures = {
    headshot: trackStaticTexture(
      loadTexture(textureLoader, assetPaths.headshot, maxAnisotropy, worldState.graphicsQuality)
    ),
    badgeCloud: trackStaticTexture(
      loadTexture(textureLoader, assetPaths.badges.cloud, maxAnisotropy, worldState.graphicsQuality)
    ),
    badgeArchitect: trackStaticTexture(
      loadTexture(
        textureLoader,
        assetPaths.badges.architect,
        maxAnisotropy,
        worldState.graphicsQuality
      )
    ),
  };

  const playerRig = new THREE.Group();
  const yawRig = new THREE.Group();
  const pitchRig = new THREE.Group();
  let keyLight = null;

  scene.add(playerRig);
  playerRig.add(yawRig);
  yawRig.add(pitchRig);
  pitchRig.add(camera);

  camera.position.set(0, WORLD_CONFIG.eyeHeight, 0);
  pitchRig.rotation.x = -0.08;
  playerRig.position.set(
    WORLD_CONFIG.spawn.x,
    terrainHeight(WORLD_CONFIG.spawn.x, WORLD_CONFIG.spawn.z),
    WORLD_CONFIG.spawn.z
  );
  camera.fov = WORLD_CONFIG.baseFov;
  camera.updateProjectionMatrix();
  setGraphicsQuality(worldState.graphicsQuality);

  return {
    camera,
    clock,
    config: WORLD_CONFIG,
    playerRig,
    pitchRig,
    renderer,
    scene,
    yawRig,
    exhibits,
    buildStaticScene,
    buildExhibits,
    canOccupy,
    getExhibitSurfaceDistance,
    getNearestExhibit,
    resolvePlayerMotion,
    applyPresentationSettings,
    setSize,
    terrainHeight,
    updateAmbientMotion,
  };

  // Environment bootstrap
  function buildStaticScene() {
    if (worldState.staticSceneBuilt) {
      return;
    }

    worldState.staticSceneBuilt = true;
    createSkyDome();
    createLighting();
    createGround();
    createStonePaths();
    createLanternPath();
    createForestRing();
    createFloatingIslands();
    createDistantStructures();
    createStarField();
  }

  function buildExhibits() {
    if (worldState.exhibitsBuilt) {
      return;
    }

    exhibits.forEach((exhibit) => {
      exhibit.position.y = terrainHeight(exhibit.position.x, exhibit.position.z);
      switch (exhibit.type) {
        case "portrait":
          createPortraitHall(exhibit);
          break;
        case "grove":
          createSkillGrove(exhibit);
          break;
        case "sanctum":
          createCloudSanctum(exhibit);
          break;
        case "project":
          createProjectShrine(exhibit);
          break;
        case "portal":
          createPortalNexus(exhibit);
          break;
        default:
          break;
      }

      worldState.obstacleFields.push({
        x: exhibit.position.x,
        z: exhibit.position.z,
        radius: exhibit.colliderRadius,
      });
    });

    worldState.exhibitsBuilt = true;
    refreshDynamicTextureBindings();
  }

  function setSize(width, height) {
    const clampedWidth = Math.max(1, Math.floor(width));
    const clampedHeight = Math.max(1, Math.floor(height));
    const pixelRatio = getPixelRatioCap(worldState.graphicsQuality);

    if (camera.aspect !== clampedWidth / clampedHeight) {
      camera.aspect = clampedWidth / clampedHeight;
      camera.updateProjectionMatrix();
    }

    if (
      worldState.viewportWidth === clampedWidth &&
      worldState.viewportHeight === clampedHeight &&
      worldState.viewportPixelRatio === pixelRatio
    ) {
      return;
    }

    worldState.viewportWidth = clampedWidth;
    worldState.viewportHeight = clampedHeight;
    worldState.viewportPixelRatio = pixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(clampedWidth, clampedHeight, false);
  }

  function applyPresentationSettings(settings) {
    setReducedMotion(settings.reducedMotion);
    setGraphicsQuality(settings.graphicsQuality);
  }

  function setReducedMotion(reducedMotion) {
    worldState.reducedMotion = reducedMotion;
  }

  function setGraphicsQuality(graphicsQuality) {
    worldState.graphicsQuality = graphicsQuality;
    const profile = getQualityProfile(graphicsQuality);
    const shadowsEnabled = !isTouchDevice && profile.desktopShadows;

    renderer.shadowMap.enabled = shadowsEnabled;
    scene.fog.density = profile.fogDensity;
    applyStaticTextureQuality(profile.textureQuality);
    updatePointLightQuality(profile);
    setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);

    if (keyLight) {
      keyLight.castShadow = shadowsEnabled;
      if (shadowsEnabled) {
        keyLight.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
        keyLight.shadow.needsUpdate = true;
      }
    }

    if (worldState.exhibitsBuilt) {
      refreshDynamicTextureBindings();
    }
  }

  function getPixelRatioCap(graphicsQuality) {
    const profile = getQualityProfile(graphicsQuality);
    const cap = isTouchDevice ? profile.mobilePixelRatio : profile.desktopPixelRatio;
    return Math.min(window.devicePixelRatio, cap);
  }

  function canOccupy(x, z) {
    if (Math.hypot(x, z) > WORLD_CONFIG.worldRadius) {
      return false;
    }

    for (let index = 0; index < worldState.obstacleFields.length; index += 1) {
      const field = worldState.obstacleFields[index];
      if (Math.hypot(x - field.x, z - field.z) < field.radius) {
        return false;
      }
    }

    return true;
  }

  function resolvePlayerMotion(position, stepX, stepZ, radius) {
    resolvedPosition.set(position.x + stepX, position.y, position.z + stepZ);
    const maxRadius = WORLD_CONFIG.worldRadius - radius;

    // Push the player back out of any overlapping circular collider to avoid snagging.
    for (let iteration = 0; iteration < 3; iteration += 1) {
      let adjusted = false;
      const centerDistance = Math.hypot(resolvedPosition.x, resolvedPosition.z);

      if (centerDistance > maxRadius) {
        const scale = maxRadius / Math.max(centerDistance, 0.0001);
        resolvedPosition.x *= scale;
        resolvedPosition.z *= scale;
        adjusted = true;
      }

      for (let index = 0; index < worldState.obstacleFields.length; index += 1) {
        const field = worldState.obstacleFields[index];
        const minDistance = field.radius + radius;
        let dx = resolvedPosition.x - field.x;
        let dz = resolvedPosition.z - field.z;
        let distance = Math.hypot(dx, dz);

        if (distance < minDistance) {
          if (distance < 0.0001) {
            dx = 1;
            dz = 0;
            distance = 1;
          }

          const pushScale = minDistance / distance;
          resolvedPosition.x = field.x + dx * pushScale;
          resolvedPosition.z = field.z + dz * pushScale;
          adjusted = true;
        }
      }

      if (!adjusted) {
        break;
      }
    }

    resolvedPosition.y = terrainHeight(resolvedPosition.x, resolvedPosition.z);
    return resolvedPosition;
  }

  function getExhibitSurfaceDistance(exhibit, position) {
    return Math.max(0, position.distanceTo(exhibit.position) - exhibit.colliderRadius);
  }

  function getNearestExhibit(position) {
    let bestExhibit = null;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const exhibit of exhibits) {
      const distanceSquared = position.distanceToSquared(exhibit.position);
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestExhibit = exhibit;
      }
    }

    if (!bestExhibit) {
      return null;
    }

    nearestExhibitResult.exhibit = bestExhibit;
    nearestExhibitResult.distance = Math.sqrt(bestDistanceSquared);
    nearestExhibitResult.surfaceDistance = Math.max(
      0,
      nearestExhibitResult.distance - bestExhibit.colliderRadius
    );
    return nearestExhibitResult;
  }

  function updateAmbientMotion(elapsed, delta) {
    const profile = getQualityProfile(worldState.graphicsQuality);
    let stepDelta = delta;

    if (profile.ambientUpdateInterval > 0) {
      worldState.ambientTickAccumulator += delta;
      if (worldState.ambientTickAccumulator < profile.ambientUpdateInterval) {
        return;
      }

      stepDelta = worldState.ambientTickAccumulator;
      worldState.ambientTickAccumulator = 0;
    }

    const motionScale = (worldState.reducedMotion ? 0.28 : 1) * profile.motionScale;
    const spinScale = (worldState.reducedMotion ? 0.35 : 1) * profile.motionScale;

    for (let index = 0; index < worldState.floaters.length; index += 1) {
      const entry = worldState.floaters[index];
      if (entry.amplitude !== 0) {
        entry.object.position.y =
          entry.baseY +
          Math.sin(elapsed * entry.speed + entry.phase) * entry.amplitude * motionScale;
      }

      if (entry.spinY) {
        entry.object.rotation.y += entry.spinY * stepDelta * spinScale;
      }
    }

    for (let index = 0; index < worldState.pulsingLights.length; index += 1) {
      const pulse = worldState.pulsingLights[index];
      if (!pulse.enabled) {
        continue;
      }

      pulse.light.intensity =
        (pulse.baseIntensity +
          Math.sin(elapsed * pulse.speed + pulse.phase) * pulse.amplitude * profile.pulseScale) *
        pulse.intensityScale;
    }
  }

  function getQualityProfile(graphicsQuality) {
    return QUALITY_PROFILES[graphicsQuality] ?? QUALITY_PROFILES.medium;
  }

  function trackStaticTexture(texture) {
    staticTextures.push(texture);
    return texture;
  }

  function applyStaticTextureQuality(textureQuality) {
    for (let index = 0; index < staticTextures.length; index += 1) {
      applyTextureQuality(staticTextures[index], maxAnisotropy, textureQuality);
    }
  }

  function updatePointLightQuality(profile) {
    for (let index = 0; index < worldState.pulsingLights.length; index += 1) {
      const pulse = worldState.pulsingLights[index];
      const isLanternLight = pulse.group === "lantern";
      pulse.enabled = isLanternLight ? profile.lanternLights : true;
      pulse.intensityScale = isLanternLight ? 1 : profile.landmarkLightScale;
      pulse.light.visible = pulse.enabled;
    }
  }

  function registerDynamicTextureBinding(material, buildTexture) {
    const binding = {
      material,
      buildTexture,
      texture: null,
    };
    worldState.dynamicTextureBindings.push(binding);
    return binding;
  }

  function refreshDynamicTextureBindings() {
    for (let index = 0; index < worldState.dynamicTextureBindings.length; index += 1) {
      const binding = worldState.dynamicTextureBindings[index];
      const nextTexture = binding.buildTexture(getQualityProfile(worldState.graphicsQuality));
      if (binding.texture === nextTexture) {
        continue;
      }

      binding.texture = nextTexture;
      binding.material.map = nextTexture;
      binding.material.needsUpdate = true;
    }
  }

  function getGeometry(key, create) {
    if (!geometryCache.has(key)) {
      geometryCache.set(key, create());
    }

    return geometryCache.get(key);
  }

  function addInstancedMesh(geometry, material, transforms, options = {}) {
    if (!transforms.length) {
      return null;
    }

    // Static scenery batches reuse a single draw path per mesh type.
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    mesh.castShadow = Boolean(options.castShadow);
    mesh.receiveShadow = Boolean(options.receiveShadow);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    for (let index = 0; index < transforms.length; index += 1) {
      const transform = transforms[index];
      instanceTransform.position.set(
        transform.position[0],
        transform.position[1],
        transform.position[2]
      );
      instanceTransform.rotation.set(
        transform.rotation?.[0] ?? 0,
        transform.rotation?.[1] ?? 0,
        transform.rotation?.[2] ?? 0
      );
      instanceTransform.scale.set(
        transform.scale?.[0] ?? 1,
        transform.scale?.[1] ?? 1,
        transform.scale?.[2] ?? 1
      );
      instanceTransform.updateMatrix();
      mesh.setMatrixAt(index, instanceTransform.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  }

  function bindDynamicTexture(material, buildTexture) {
    // Canvas-backed exhibit art swaps quality tiers without rebuilding the scene graph.
    const binding = registerDynamicTextureBinding(material, (profile) =>
      buildTexture({
        maxAnisotropy,
        quality: profile.textureQuality,
      })
    );
    binding.texture = binding.buildTexture(getQualityProfile(worldState.graphicsQuality));
    material.map = binding.texture;
    material.needsUpdate = true;
    return material;
  }

  function createDynamicBasicMaterial(options, buildTexture) {
    return bindDynamicTexture(new THREE.MeshBasicMaterial(options), buildTexture);
  }

  function createDynamicSpriteMaterial(options, buildTexture) {
    return bindDynamicTexture(new THREE.SpriteMaterial(options), buildTexture);
  }

  // Static environment builders
  function createSkyDome() {
    const geometry = new THREE.SphereGeometry(180, 32, 24);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x9bc0c9) },
        horizonColor: { value: new THREE.Color(0x5c7d85) },
        bottomColor: { value: new THREE.Color(0x14252b) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, 28.0, 0.0)).y;
          vec3 color = mix(bottomColor, horizonColor, smoothstep(-0.25, 0.12, h));
          color = mix(color, topColor, smoothstep(0.08, 0.82, h));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const dome = new THREE.Mesh(geometry, material);
    scene.add(dome);

    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(5.8, 40),
      new THREE.MeshBasicMaterial({
        color: 0xf6e4bb,
        transparent: true,
        opacity: 0.68,
      })
    );
    moon.position.set(-38, 42, -68);
    scene.add(moon);
  }

  function createLighting() {
    const profile = getQualityProfile(worldState.graphicsQuality);
    const hemi = new THREE.HemisphereLight(0xc3dbe1, 0x1c2b2c, 1.45);
    scene.add(hemi);

    keyLight = new THREE.DirectionalLight(0xffd9aa, 1.9);
    keyLight.position.set(28, 40, 12);
    if (!isTouchDevice && profile.desktopShadows) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 120;
      keyLight.shadow.camera.left = -50;
      keyLight.shadow.camera.right = 50;
      keyLight.shadow.camera.top = 50;
      keyLight.shadow.camera.bottom = -50;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x78afbf, 0.65);
    fillLight.position.set(-22, 16, -26);
    scene.add(fillLight);
  }

  function createGround() {
    const size = 220;
    const segments = 140;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const y = terrainHeight(x, z);
      positions.setY(index, y);

      const path = pathInfluence(x, z);
      const heightFactor = THREE.MathUtils.clamp((y + 2.5) / 5.5, 0, 1);
      color.setRGB(0.21, 0.38, 0.29);
      color.lerp(new THREE.Color(0.49, 0.63, 0.47), heightFactor * 0.7);
      color.lerp(new THREE.Color(0.74, 0.63, 0.44), path * 0.72);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const ground = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        metalness: 0,
      })
    );
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function createStonePaths() {
    const stonePositions = [
      [0, 22, 2.4],
      [0, 16, 2.2],
      [0, 10, 2.8],
      [0, 4, 2.6],
      [0, -2, 2.4],
      [0, -8, 2.5],
      [0, -14, 2.4],
      [0, -20, 2.6],
      [0, -26, 2.8],
      [-8, 13, 2.1],
      [-16, 13, 2.2],
      [8, 13, 2.1],
      [16, 13, 2.2],
      [-7, -11, 2.2],
      [-13, -11, 2.2],
      [7, -11, 2.2],
      [13, -11, 2.2],
    ];
    const transforms = stonePositions.map(([x, z, radius], index) => ({
      position: [x, terrainHeight(x, z) + 0.14, z],
      rotation: [0, ((index * 47) % 180) * (Math.PI / 180), 0],
      scale: [radius, 0.32, radius],
    }));

    addInstancedMesh(
      getGeometry("stone-path-disk", () => new THREE.CylinderGeometry(1, 1.14, 1, 8)),
      materials.slate,
      transforms,
      {
        castShadow: !isTouchDevice,
        receiveShadow: true,
      }
    );
  }

  function createLanternPath() {
    const lanterns = [
      [-4.6, 19],
      [4.6, 19],
      [-4.8, 7],
      [4.8, 7],
      [-4.6, -5],
      [4.6, -5],
      [-4.4, -17],
      [4.4, -17],
    ];

    const poleGeometry = getGeometry(
      "lantern-pole",
      () => new THREE.CylinderGeometry(0.12, 0.16, 2.9, 8)
    );
    const lanternGeometry = getGeometry(
      "lantern-orb",
      () => new THREE.OctahedronGeometry(0.28, 0)
    );

    lanterns.forEach(([x, z], index) => {
      const group = new THREE.Group();
      group.position.set(x, terrainHeight(x, z), z);

      const pole = new THREE.Mesh(poleGeometry, materials.bark);
      pole.position.y = 1.4;
      pole.castShadow = !isTouchDevice;
      group.add(pole);

      const lantern = new THREE.Mesh(lanternGeometry, createGlowMaterial(0xf6c16c, 1.6));
      lantern.position.y = 2.85;
      group.add(lantern);

      const light = new THREE.PointLight(0xf5b15e, 1.1, 10, 2);
      light.position.y = 2.85;
      group.add(light);
      addPulse(light, 1.1, 0.28, 2.2, index * 0.9, "lantern");

      scene.add(group);
      addFloater(lantern, 0.08, 2.1, index * 0.75, 0.55);
    });
  }

  function createForestRing() {
    const trunkTransforms = [];
    const canopyTransforms = [];

    for (let index = 0; index < 34; index += 1) {
      const angle = (index / 34) * Math.PI * 2;
      const radius = 42 + Math.sin(index * 2.7) * 6 + (index % 3) * 3;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      if (Math.abs(x) < 8 && z > -36 && z < 28) {
        continue;
      }

      const scale = 0.85 + (index % 5) * 0.18;
      const y = terrainHeight(x, z);
      trunkTransforms.push({
        position: [x, y + 1.45 * scale, z],
        scale: [scale, scale, scale],
      });

      for (let layer = 0; layer < 3; layer += 1) {
        canopyTransforms.push({
          position: [x, y + (2.45 + layer * 0.92) * scale, z],
          scale: [
            scale * ((1.45 - layer * 0.22) / 1.45),
            scale,
            scale * ((1.45 - layer * 0.22) / 1.45),
          ],
        });
      }
    }

    addInstancedMesh(
      getGeometry("forest-trunk", () => new THREE.CylinderGeometry(0.32, 0.54, 2.8, 8)),
      materials.bark,
      trunkTransforms,
      {
        castShadow: !isTouchDevice,
      }
    );

    addInstancedMesh(
      getGeometry("forest-canopy", () => new THREE.ConeGeometry(1.45, 2.1, 9)),
      materials.foliage,
      canopyTransforms,
      {
        castShadow: !isTouchDevice,
      }
    );
  }

  function createFloatingIslands() {
    const islands = [
      [-32, 19, -10, 4.6],
      [35, 23, -20, 5.6],
      [11, 17, 26, 3.8],
    ];

    const topGeometry = getGeometry(
      "floating-island-top",
      () => new THREE.SphereGeometry(1, 18, 18)
    );
    const spikeGeometry = getGeometry(
      "floating-island-spike",
      () => new THREE.ConeGeometry(1, 1, 7)
    );
    const grassGeometry = getGeometry(
      "floating-island-grass",
      () => new THREE.CylinderGeometry(1, 1.07, 1, 10)
    );
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d966f,
      roughness: 1,
      metalness: 0,
    });

    islands.forEach(([x, y, z, scale], index) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const top = new THREE.Mesh(topGeometry, materials.stoneDark);
      top.scale.set(scale * 1.1, scale * 0.42, scale);
      top.castShadow = !isTouchDevice;
      group.add(top);

      const spike = new THREE.Mesh(spikeGeometry, materials.stone);
      spike.position.y = -scale * 1.15;
      spike.scale.set(scale * 0.62, scale * 2.2, scale * 0.62);
      spike.castShadow = !isTouchDevice;
      group.add(spike);

      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.position.y = scale * 0.15;
      grass.scale.set(scale * 0.9, 0.2, scale * 0.9);
      group.add(grass);

      scene.add(group);
      addFloater(group, 0.55, 0.5 + scale * 0.08, index * 1.4, 0.07);
    });
  }

  function createDistantStructures() {
    const towers = [
      [-52, -46, 18],
      [56, -55, 24],
      [0, -67, 28],
    ];
    const shaftTransforms = [];
    const roofTransforms = [];

    for (let index = 0; index < towers.length; index += 1) {
      const [x, z, height] = towers[index];
      const y = terrainHeight(x, z);
      shaftTransforms.push({
        position: [x, y + height / 2, z],
        scale: [1, height, 1],
      });
      roofTransforms.push({
        position: [x, y + height + 1.2, z],
      });
    }

    addInstancedMesh(
      getGeometry("distant-tower-shaft", () => new THREE.CylinderGeometry(2.8, 3.6, 1, 7)),
      materials.stoneDark,
      shaftTransforms
    );
    addInstancedMesh(
      getGeometry("distant-tower-roof", () => new THREE.ConeGeometry(4.6, 6.2, 7)),
      materials.bark,
      roofTransforms
    );
  }

  function createStarField() {
    const points = new Float32Array(650 * 3);

    for (let index = 0; index < 650; index += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const radius = THREE.MathUtils.randFloat(92, 132);
      const pointOffset = index * 3;
      points[pointOffset] = radius * Math.sin(phi) * Math.cos(theta);
      points[pointOffset + 1] = radius * Math.cos(phi) + 20;
      points[pointOffset + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));

    const stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xfff7da,
        size: 0.35,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    scene.add(stars);
    addFloater(stars, 0, 0, 0, 0.008);
  }

  // Exhibit builders
  function createPortraitHall(exhibit) {
    const group = createPlatform(exhibit.position, 4.1, 1.25);
    addLabelSprite(group, exhibit.labelEyebrow ?? exhibit.zone, exhibit.title, exhibit.accent, 6.3);

    const frame = new THREE.Mesh(getGeometry("portrait-frame", () => new THREE.BoxGeometry(3.4, 4.4, 0.24)), materials.brass);
    frame.position.set(0, 4.2, 0);
    frame.castShadow = !isTouchDevice;
    group.add(frame);

    const portrait = new THREE.Mesh(
      getGeometry("portrait-plane", () => new THREE.PlaneGeometry(2.78, 3.72)),
      new THREE.MeshBasicMaterial({
        map: textures.headshot,
        side: THREE.DoubleSide,
      })
    );
    portrait.position.set(0, 4.2, 0.13);
    group.add(portrait);

    const arch = new THREE.Mesh(
      getGeometry("portrait-arch", () => new THREE.TorusGeometry(2.75, 0.09, 16, 64)),
      createGlowMaterial(exhibit.accent, 1.2)
    );
    arch.position.set(0, 4.2, -0.16);
    group.add(arch);

    [
      [-2.45, 0, 0],
      [2.45, 0, 0],
    ].forEach(([x, y, z]) => {
      const column = new THREE.Mesh(
        getGeometry("portrait-column", () => new THREE.CylinderGeometry(0.35, 0.5, 4.6, 10)),
        materials.stone
      );
      column.position.set(x, 2.5 + y, z);
      column.castShadow = !isTouchDevice;
      column.receiveShadow = true;
      group.add(column);
    });

    addLandmarkLight(group, exhibit.accent, 1.6, 14, 4.8);
  }

  function createProjectShrine(exhibit) {
    const emphasisScale =
      exhibit.emphasisScale ??
      (exhibit.featuredRank === 1 ? 1.16 : exhibit.featuredTag ? 1.08 : 1);
    const platformRadius = 3.45 * emphasisScale;
    const platformHeight = 1.12 * emphasisScale;
    const group = createPlatform(exhibit.position, platformRadius, platformHeight);
    addLabelSprite(
      group,
      exhibit.labelEyebrow ?? exhibit.zone,
      exhibit.title,
      exhibit.accent,
      5.8 * emphasisScale
    );

    const card = createProjectCard(exhibit);
    card.position.set(0, 3.45 * emphasisScale, 0);
    card.scale.setScalar(emphasisScale);
    group.add(card);

    const orb = new THREE.Mesh(
      getGeometry("project-orb", () => new THREE.IcosahedronGeometry(0.44, 0)),
      createGlowMaterial(exhibit.accent, 1.4)
    );
    orb.position.set(0, 5.1 * emphasisScale, 0);
    orb.scale.setScalar(emphasisScale);
    group.add(orb);

    const ring = new THREE.Mesh(
      getGeometry("project-ring", () => new THREE.TorusGeometry(2.2, 0.08, 12, 64)),
      createGlowMaterial(exhibit.accent, 1.05)
    );
    ring.position.set(0, 3.5 * emphasisScale, 0);
    ring.rotation.x = Math.PI / 2;
    ring.scale.setScalar(emphasisScale);
    group.add(ring);

    if (exhibit.featuredTag) {
      const halo = new THREE.Mesh(
        getGeometry("featured-project-halo", () => new THREE.TorusGeometry(2.85, 0.06, 12, 72)),
        createGlowMaterial(exhibit.accent, 1.12)
      );
      halo.position.set(0, 4.55 * emphasisScale, 0);
      halo.rotation.x = Math.PI / 2;
      halo.scale.setScalar(emphasisScale);
      group.add(halo);
      addFloater(halo, 0.08, 1.35, emphasisScale, 0.22);
    }

    addFloater(orb, 0.18, 1.8, Math.random() * Math.PI * 2, 0.95);
    addFloater(ring, 0, 0, 0, 0.38);
    addCornerPillars(group, 2.2 * emphasisScale, 4.4 * emphasisScale, exhibit.accent);
    addLandmarkLight(
      group,
      exhibit.accent,
      1.35 * emphasisScale,
      12 * emphasisScale,
      4.3 * emphasisScale
    );
  }

  function createSkillGrove(exhibit) {
    const emphasisScale = exhibit.emphasisScale ?? 1;
    const group = createPlatform(exhibit.position, 3.8 * emphasisScale, 1.18 * emphasisScale);
    addLabelSprite(
      group,
      exhibit.labelEyebrow ?? exhibit.zone,
      exhibit.title,
      exhibit.accent,
      6.1 * emphasisScale
    );

    const trunk = new THREE.Mesh(
      getGeometry("grove-trunk", () => new THREE.CylinderGeometry(0.42, 0.7, 3.6, 10)),
      materials.bark
    );
    trunk.position.set(0, 2.3 * emphasisScale, -0.4);
    trunk.scale.setScalar(emphasisScale);
    trunk.castShadow = !isTouchDevice;
    group.add(trunk);

    const canopy = new THREE.Mesh(
      getGeometry("grove-canopy", () => new THREE.SphereGeometry(1.9, 18, 18)),
      materials.foliage
    );
    canopy.position.set(0, 4.35 * emphasisScale, -0.55);
    canopy.scale.set(1.2 * emphasisScale, 0.84 * emphasisScale, 1.1 * emphasisScale);
    canopy.castShadow = !isTouchDevice;
    group.add(canopy);

    const crystal = new THREE.Mesh(
      getGeometry("grove-crystal", () => new THREE.OctahedronGeometry(0.85, 0)),
      createGlowMaterial(exhibit.accent, 1.55)
    );
    crystal.position.set(0, 3.2 * emphasisScale, 0.9);
    crystal.scale.setScalar(emphasisScale);
    group.add(crystal);

    const orbit = new THREE.Group();
    orbit.position.y = 3.2 * emphasisScale;
    group.add(orbit);
    addFloater(orbit, 0, 0, 0, 0.55);

    const sigils = exhibit.sigils ?? ["Code", "Cloud", "AI"];
    sigils.forEach((label, index) => {
      const angle = (index / sigils.length) * Math.PI * 2;
      const sigil = createSmallSigil(label, exhibit.accent);
      sigil.position.set(
        Math.cos(angle) * 1.95 * emphasisScale,
        0.2 * emphasisScale + index * 0.12,
        Math.sin(angle) * 1.95 * emphasisScale
      );
      sigil.scale.setScalar(Math.max(0.9, emphasisScale));
      orbit.add(sigil);
      addFloater(sigil, 0.14, 1.3 + index * 0.35, index * 1.7, 0.9);
    });

    addLandmarkLight(
      group,
      exhibit.accent,
      1.3 * emphasisScale,
      12 * emphasisScale,
      4.2 * emphasisScale
    );
  }

  function createCloudSanctum(exhibit) {
    const group = createPlatform(exhibit.position, 4.4, 1.2);
    addLabelSprite(group, exhibit.labelEyebrow ?? exhibit.zone, exhibit.title, exhibit.accent, 6.2);

    const arch = new THREE.Mesh(
      getGeometry("sanctum-arch", () => new THREE.TorusGeometry(2.5, 0.1, 18, 72)),
      createGlowMaterial(exhibit.accent, 1.3)
    );
    arch.position.set(0, 4.15, -0.2);
    group.add(arch);

    group.add(createBadgePedestal(textures.badgeCloud, -1.75, 3.2));
    group.add(createBadgePedestal(textures.badgeArchitect, 1.75, 3.2));

    const halo = new THREE.Mesh(
      getGeometry("sanctum-halo", () => new THREE.TorusGeometry(1.15, 0.08, 12, 48)),
      createGlowMaterial("#dfeff3", 1.1)
    );
    halo.position.set(0, 5.25, 0.3);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    addFloater(halo, 0.15, 1.5, 1, 0.26);

    addLandmarkLight(group, exhibit.accent, 1.45, 14, 4.8);
  }

  function createPortalNexus(exhibit) {
    const group = createPlatform(exhibit.position, 4.7, 1.25);
    addLabelSprite(group, exhibit.labelEyebrow ?? exhibit.zone, exhibit.title, exhibit.accent, 6.5);

    const ring = new THREE.Mesh(
      getGeometry("portal-ring", () => new THREE.TorusGeometry(2.6, 0.16, 20, 90)),
      createGlowMaterial(exhibit.accent, 1.65)
    );
    ring.position.set(0, 4.1, 0);
    group.add(ring);
    addFloater(ring, 0.14, 1.6, 0.4, 0.4);

    const portal = new THREE.Mesh(
      getGeometry("portal-plane", () => new THREE.CircleGeometry(2.15, 48)),
      createDynamicBasicMaterial({
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }, (textureOptions) => createPortalTexture(exhibit.accent, textureOptions))
    );
    portal.position.set(0, 4.1, -0.04);
    group.add(portal);
    addFloater(portal, 0.08, 1.2, 1.6, -0.22);

    const orbit = new THREE.Group();
    orbit.position.set(0, 4.1, 0);
    group.add(orbit);
    addFloater(orbit, 0, 0, 0, -0.48);

    ["GH", "IN", "@", "CV"].forEach((text, index) => {
      const sigil = createSmallSigil(text, exhibit.accent);
      const angle = (index / 4) * Math.PI * 2;
      sigil.position.set(
        Math.cos(angle) * 3.25,
        Math.sin(index) * 0.25,
        Math.sin(angle) * 3.25
      );
      orbit.add(sigil);
      addFloater(sigil, 0.12, 1.5 + index * 0.25, index, 0.8);
    });

    addLandmarkLight(group, exhibit.accent, 1.85, 16, 4.4);
  }

  // Shared builder helpers
  function createPlatform(position, radius, height) {
    const group = new THREE.Group();
    group.position.set(position.x, terrainHeight(position.x, position.z), position.z);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.12, height, 10),
      materials.stoneDark
    );
    base.position.y = height / 2;
    base.castShadow = !isTouchDevice;
    base.receiveShadow = true;
    group.add(base);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.92, radius * 0.98, 0.2, 12),
      materials.stone
    );
    cap.position.y = height + 0.08;
    cap.receiveShadow = true;
    group.add(cap);

    scene.add(group);
    return group;
  }

  function createBadgePedestal(texture, x, height) {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1, height, 9),
      materials.stone
    );
    pedestal.position.y = height / 2;
    pedestal.castShadow = !isTouchDevice;
    group.add(pedestal);

    const badge = new THREE.Mesh(
      getGeometry("badge-plane", () => new THREE.PlaneGeometry(1.9, 1.9)),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    badge.position.set(0, height + 0.95, 0.01);
    group.add(badge);

    return group;
  }

  function createProjectCard(exhibit) {
    const panel = new THREE.Group();
    const slab = new THREE.Mesh(
      getGeometry("project-slab", () => new THREE.BoxGeometry(3.1, 4.2, 0.22)),
      materials.glass
    );
    panel.add(slab);

    const face = new THREE.Mesh(
      getGeometry("project-face", () => new THREE.PlaneGeometry(2.82, 3.88)),
      createDynamicBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
      }, (textureOptions) => createProjectTexture(exhibit, textureOptions))
    );
    face.position.z = 0.13;
    panel.add(face);
    return panel;
  }

  function addCornerPillars(group, radius, height, accent) {
    [
      [-radius, 0, -radius * 0.15],
      [radius, 0, -radius * 0.15],
      [-radius, 0, radius * 0.15],
      [radius, 0, radius * 0.15],
    ].forEach(([x, y, z], index) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.34, height, 8),
        materials.stone
      );
      pillar.position.set(x, height / 2 + 0.9 + y, z);
      pillar.castShadow = !isTouchDevice;
      pillar.receiveShadow = true;
      group.add(pillar);

      const cap = new THREE.Mesh(
        getGeometry("pillar-cap", () => new THREE.IcosahedronGeometry(0.18, 0)),
        createGlowMaterial(accent, 1.1)
      );
      cap.position.set(x, height + 1.15, z);
      group.add(cap);
      addFloater(cap, 0.08, 1.5 + index * 0.2, index * 0.65, 0.85);
    });
  }

  function addLabelSprite(group, eyebrow, title, accent, y) {
    const sprite = new THREE.Sprite(
      createDynamicSpriteMaterial({
        transparent: true,
        depthWrite: false,
      }, (textureOptions) => createLabelTexture(eyebrow, title, accent, textureOptions))
    );
    sprite.position.set(0, y, 0);
    sprite.scale.set(6.4, 2.4, 1);
    group.add(sprite);
    addFloater(sprite, 0.12, 1.25, Math.random() * Math.PI * 2, 0);
  }

  function createSmallSigil(text, accent) {
    return new THREE.Mesh(
      getGeometry("small-sigil-plane", () => new THREE.PlaneGeometry(1, 1)),
      createDynamicBasicMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }, (textureOptions) => createSigilTexture(text, accent, textureOptions))
    );
  }

  function addLandmarkLight(group, color, intensity, distance, y) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(0, y, 0);
    group.add(light);
    addPulse(light, intensity, intensity * 0.22, 1.5, worldState.pulsingLights.length * 0.8, "landmark");
  }

  function addFloater(object, amplitude, speed, phase, spinY) {
    worldState.floaters.push({
      object,
      baseY: object.position.y,
      amplitude,
      speed,
      phase,
      spinY,
    });
  }

  function addPulse(light, baseIntensity, amplitude, speed, phase, group = "ambient") {
    const profile = getQualityProfile(worldState.graphicsQuality);
    const isLanternLight = group === "lantern";
    const pulse = {
      light,
      baseIntensity,
      amplitude,
      speed,
      phase,
      group,
      enabled: isLanternLight ? profile.lanternLights : true,
      intensityScale: isLanternLight ? 1 : profile.landmarkLightScale,
    };
    pulse.light.visible = pulse.enabled;
    worldState.pulsingLights.push(pulse);
  }

  // Terrain math
  function terrainHeight(x, z) {
    let y =
      Math.sin(x * 0.085) * 0.9 +
      Math.cos(z * 0.078) * 0.8 +
      Math.sin((x + z) * 0.048) * 0.55;
    y += Math.sin(Math.hypot(x, z) * 0.11) * 0.32;
    y *= 0.42;

    const flatten = pathInfluence(x, z);
    return THREE.MathUtils.lerp(y, y * 0.18, flatten);
  }

  function pathInfluence(x, z) {
    const avenue = Math.exp(-Math.pow(x / 7, 2));
    const arrival = Math.exp(-(x * x + Math.pow(z - 24, 2)) / 180);
    const nexus = Math.exp(-(x * x + Math.pow(z + 28, 2)) / 210);
    return Math.min(1, avenue * 0.82 + arrival * 0.55 + nexus * 0.7);
  }
}
