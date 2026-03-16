import { THREE } from "./three.js";
import {
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
  interactDistance: 7.25,
  turnSpeed: 1.55,
  lookSpeed: 1.15,
  spawn: {
    x: 0,
    z: 28,
  },
};

export function createWorld({ canvas, isTouchDevice, assetPaths, exhibitContent }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !isTouchDevice;
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
  };
  const textures = {
    headshot: loadTexture(textureLoader, assetPaths.headshot, maxAnisotropy),
    badgeCloud: loadTexture(textureLoader, assetPaths.badges.cloud, maxAnisotropy),
    badgeArchitect: loadTexture(
      textureLoader,
      assetPaths.badges.architect,
      maxAnisotropy
    ),
  };

  const playerRig = new THREE.Group();
  const yawRig = new THREE.Group();
  const pitchRig = new THREE.Group();

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
    getNearestExhibit,
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
  }

  function setSize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
    renderer.setSize(width, height);
  }

  function canOccupy(x, z) {
    if (Math.hypot(x, z) > WORLD_CONFIG.worldRadius) {
      return false;
    }

    return !worldState.obstacleFields.some((field) => {
      const distance = Math.hypot(x - field.x, z - field.z);
      return distance < field.radius;
    });
  }

  function getNearestExhibit(position) {
    let best = null;

    for (const exhibit of exhibits) {
      const distance = position.distanceTo(exhibit.position);
      if (!best || distance < best.distance) {
        best = { exhibit, distance };
      }
    }

    return best;
  }

  function updateAmbientMotion(elapsed, delta) {
    worldState.floaters.forEach((entry) => {
      if (entry.amplitude !== 0) {
        entry.object.position.y =
          entry.baseY + Math.sin(elapsed * entry.speed + entry.phase) * entry.amplitude;
      }

      if (entry.spinY) {
        entry.object.rotation.y += entry.spinY * delta;
      }
    });

    worldState.pulsingLights.forEach((pulse) => {
      pulse.light.intensity =
        pulse.baseIntensity +
        Math.sin(elapsed * pulse.speed + pulse.phase) * pulse.amplitude;
    });
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
    const hemi = new THREE.HemisphereLight(0xc3dbe1, 0x1c2b2c, 1.45);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffd9aa, 1.9);
    keyLight.position.set(28, 40, 12);
    if (!isTouchDevice) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
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

    stonePositions.forEach(([x, z, radius]) => {
      const disk = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 1.14, 0.32, 8),
        materials.slate
      );
      disk.position.set(x, terrainHeight(x, z) + 0.14, z);
      disk.rotation.y = Math.random() * Math.PI;
      disk.castShadow = !isTouchDevice;
      disk.receiveShadow = true;
      scene.add(disk);
    });
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

    lanterns.forEach(([x, z]) => {
      const group = new THREE.Group();
      group.position.set(x, terrainHeight(x, z), z);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 2.9, 8),
        materials.bark
      );
      pole.position.y = 1.4;
      pole.castShadow = !isTouchDevice;
      group.add(pole);

      const lantern = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        createGlowMaterial(0xf6c16c, 1.6)
      );
      lantern.position.y = 2.85;
      group.add(lantern);

      const light = new THREE.PointLight(0xf5b15e, 1.1, 10, 2);
      light.position.y = 2.85;
      group.add(light);
      addPulse(light, 1.1, 0.28, 2.2, Math.random() * Math.PI * 2);

      scene.add(group);
      addFloater(lantern, 0.08, 2.1, Math.random() * Math.PI * 2, 0.55);
    });
  }

  function createForestRing() {
    for (let index = 0; index < 34; index += 1) {
      const angle = (index / 34) * Math.PI * 2;
      const radius = 42 + Math.sin(index * 2.7) * 6 + (index % 3) * 3;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      if (Math.abs(x) < 8 && z > -36 && z < 28) {
        continue;
      }

      const scale = 0.85 + (index % 5) * 0.18;
      createTree(x, z, scale);
    }
  }

  function createFloatingIslands() {
    const islands = [
      [-32, 19, -10, 4.6],
      [35, 23, -20, 5.6],
      [11, 17, 26, 3.8],
    ];

    islands.forEach(([x, y, z, scale]) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const top = new THREE.Mesh(
        new THREE.SphereGeometry(scale, 18, 18),
        materials.stoneDark
      );
      top.scale.set(1.1, 0.42, 1);
      top.castShadow = !isTouchDevice;
      group.add(top);

      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(scale * 0.62, scale * 2.2, 7),
        materials.stone
      );
      spike.position.y = -scale * 1.15;
      spike.castShadow = !isTouchDevice;
      group.add(spike);

      const grass = new THREE.Mesh(
        new THREE.CylinderGeometry(scale * 0.9, scale * 0.96, 0.2, 10),
        new THREE.MeshStandardMaterial({
          color: 0x6d966f,
          roughness: 1,
          metalness: 0,
        })
      );
      grass.position.y = scale * 0.15;
      group.add(grass);

      scene.add(group);
      addFloater(group, 0.55, 0.5 + scale * 0.08, Math.random() * Math.PI * 2, 0.07);
    });
  }

  function createDistantStructures() {
    const towers = [
      [-52, -46, 18],
      [56, -55, 24],
      [0, -67, 28],
    ];

    towers.forEach(([x, z, height]) => {
      const tower = new THREE.Group();
      tower.position.set(x, terrainHeight(x, z), z);

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 3.6, height, 7),
        materials.stoneDark
      );
      shaft.position.y = height / 2;
      tower.add(shaft);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4.6, 6.2, 7),
        materials.bark
      );
      roof.position.y = height + 1.2;
      tower.add(roof);

      scene.add(tower);
    });
  }

  function createStarField() {
    const points = [];

    for (let index = 0; index < 650; index += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const radius = THREE.MathUtils.randFloat(92, 132);
      points.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) + 20,
        radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

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
    addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.3);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 4.4, 0.24),
      materials.brass
    );
    frame.position.set(0, 4.2, 0);
    frame.castShadow = !isTouchDevice;
    group.add(frame);

    const portrait = new THREE.Mesh(
      new THREE.PlaneGeometry(2.78, 3.72),
      new THREE.MeshBasicMaterial({
        map: textures.headshot,
        side: THREE.DoubleSide,
      })
    );
    portrait.position.set(0, 4.2, 0.13);
    group.add(portrait);

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.75, 0.09, 16, 64),
      createGlowMaterial(exhibit.accent, 1.2)
    );
    arch.position.set(0, 4.2, -0.16);
    group.add(arch);

    [
      [-2.45, 0, 0],
      [2.45, 0, 0],
    ].forEach(([x, y, z]) => {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 4.6, 10),
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
    const group = createPlatform(exhibit.position, 3.45, 1.12);
    addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 5.8);

    const card = createProjectCard(exhibit);
    card.position.set(0, 3.45, 0);
    group.add(card);

    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.44, 0),
      createGlowMaterial(exhibit.accent, 1.4)
    );
    orb.position.set(0, 5.1, 0);
    group.add(orb);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.08, 12, 64),
      createGlowMaterial(exhibit.accent, 1.05)
    );
    ring.position.set(0, 3.5, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    addFloater(orb, 0.18, 1.8, Math.random() * Math.PI * 2, 0.95);
    addFloater(ring, 0, 0, 0, 0.38);
    addCornerPillars(group, 2.2, 4.4, exhibit.accent);
    addLandmarkLight(group, exhibit.accent, 1.35, 12, 4.3);
  }

  function createSkillGrove(exhibit) {
    const group = createPlatform(exhibit.position, 3.8, 1.18);
    addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.1);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.7, 3.6, 10),
      materials.bark
    );
    trunk.position.set(0, 2.3, -0.4);
    trunk.castShadow = !isTouchDevice;
    group.add(trunk);

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 18, 18),
      materials.foliage
    );
    canopy.position.set(0, 4.35, -0.55);
    canopy.scale.set(1.2, 0.84, 1.1);
    canopy.castShadow = !isTouchDevice;
    group.add(canopy);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85, 0),
      createGlowMaterial(exhibit.accent, 1.55)
    );
    crystal.position.set(0, 3.2, 0.9);
    group.add(crystal);

    const orbit = new THREE.Group();
    orbit.position.y = 3.2;
    group.add(orbit);
    addFloater(orbit, 0, 0, 0, 0.55);

    ["Code", "Cloud", "AI"].forEach((label, index) => {
      const angle = (index / 3) * Math.PI * 2;
      const sigil = createSmallSigil(label, exhibit.accent);
      sigil.position.set(
        Math.cos(angle) * 1.95,
        0.2 + index * 0.12,
        Math.sin(angle) * 1.95
      );
      orbit.add(sigil);
      addFloater(sigil, 0.14, 1.3 + index * 0.35, index * 1.7, 0.9);
    });

    addLandmarkLight(group, exhibit.accent, 1.3, 12, 4.2);
  }

  function createCloudSanctum(exhibit) {
    const group = createPlatform(exhibit.position, 4.4, 1.2);
    addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.2);

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.1, 18, 72),
      createGlowMaterial(exhibit.accent, 1.3)
    );
    arch.position.set(0, 4.15, -0.2);
    group.add(arch);

    group.add(createBadgePedestal(textures.badgeCloud, -1.75, 3.2));
    group.add(createBadgePedestal(textures.badgeArchitect, 1.75, 3.2));

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.08, 12, 48),
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
    addLabelSprite(group, exhibit.zone, exhibit.title, exhibit.accent, 6.5);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.16, 20, 90),
      createGlowMaterial(exhibit.accent, 1.65)
    );
    ring.position.set(0, 4.1, 0);
    group.add(ring);
    addFloater(ring, 0.14, 1.6, 0.4, 0.4);

    const portal = new THREE.Mesh(
      new THREE.CircleGeometry(2.15, 48),
      new THREE.MeshBasicMaterial({
        map: createPortalTexture(exhibit.accent, maxAnisotropy),
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
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
      new THREE.PlaneGeometry(1.9, 1.9),
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
      new THREE.BoxGeometry(3.1, 4.2, 0.22),
      materials.glass
    );
    panel.add(slab);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.82, 3.88),
      new THREE.MeshBasicMaterial({
        map: createProjectTexture(exhibit, maxAnisotropy),
        transparent: true,
        side: THREE.DoubleSide,
      })
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
        new THREE.IcosahedronGeometry(0.18, 0),
        createGlowMaterial(accent, 1.1)
      );
      cap.position.set(x, height + 1.15, z);
      group.add(cap);
      addFloater(cap, 0.08, 1.5 + index * 0.2, index * 0.65, 0.85);
    });
  }

  function addLabelSprite(group, eyebrow, title, accent, y) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createLabelTexture(eyebrow, title, accent, maxAnisotropy),
        transparent: true,
        depthWrite: false,
      })
    );
    sprite.position.set(0, y, 0);
    sprite.scale.set(6.4, 2.4, 1);
    group.add(sprite);
    addFloater(sprite, 0.12, 1.25, Math.random() * Math.PI * 2, 0);
  }

  function createSmallSigil(text, accent) {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: createSigilTexture(text, accent, maxAnisotropy),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
  }

  function addLandmarkLight(group, color, intensity, distance, y) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(0, y, 0);
    group.add(light);
    addPulse(light, intensity, intensity * 0.22, 1.5, Math.random() * Math.PI * 2);
  }

  function createTree(x, z, scale) {
    const group = new THREE.Group();
    group.position.set(x, terrainHeight(x, z), z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32 * scale, 0.54 * scale, 2.8 * scale, 8),
      materials.bark
    );
    trunk.position.y = 1.45 * scale;
    trunk.castShadow = !isTouchDevice;
    group.add(trunk);

    [0, 1, 2].forEach((layer) => {
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry((1.45 - layer * 0.22) * scale, 2.1 * scale, 9),
        materials.foliage
      );
      canopy.position.y = (2.45 + layer * 0.92) * scale;
      canopy.castShadow = !isTouchDevice;
      group.add(canopy);
    });

    scene.add(group);
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

  function addPulse(light, baseIntensity, amplitude, speed, phase) {
    worldState.pulsingLights.push({
      light,
      baseIntensity,
      amplitude,
      speed,
      phase,
    });
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
