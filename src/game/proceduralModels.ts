/**
 * Procedural 3D Models & Textures for Free Kick Master 3D
 * Compliant with Three.js Skill (3-12 part composite groups, procedural textures, zero 404s)
 */

import * as THREE from 'three';
import { BallSkin } from '../types/game';

/** Creates procedural grass pitch texture */
export function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base grass green
  ctx.fillStyle = '#227b34';
  ctx.fillRect(0, 0, 1024, 1024);

  // Mown lawn stripes
  const stripeWidth = 64;
  for (let y = 0; y < 1024; y += stripeWidth * 2) {
    ctx.fillStyle = '#1e6d2e';
    ctx.fillRect(0, y, 1024, stripeWidth);
  }

  // Grass blade noise grain
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.max(0, Math.min(255, data[i] + noise * 0.4));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.3));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 20);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Creates procedural soccer ball texture based on skin */
export function createBallTexture(skin: BallSkin): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base ball background
  ctx.fillStyle = skin.primaryColor || '#ffffff';
  ctx.fillRect(0, 0, 512, 256);

  if (skin.pattern === 'classic') {
    // Classic black pentagons & seams
    ctx.fillStyle = skin.secondaryColor || '#111827';
    const spots = [
      [128, 64], [384, 64], [256, 128], [128, 192], [384, 192],
      [0, 128], [512, 128], [64, 0], [448, 0], [64, 256], [448, 256]
    ];
    spots.forEach(([x, y]) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = x + Math.cos(angle) * 32;
        const py = y + Math.sin(angle) * 32;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    });

    // Subtle stitching seams
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    spots.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 42, 0, Math.PI * 2);
      ctx.stroke();
    });
  } else if (skin.pattern === 'inferno') {
    // Fiery red/orange dynamic stripes
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#ff1a1a');
    grad.addColorStop(0.5, '#ff8000');
    grad.addColorStop(1, '#ffe600');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = '#3a0007';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0);
      ctx.lineTo(i * 64 + 40, 128);
      ctx.lineTo(i * 64 + 20, 256);
      ctx.lineTo(i * 64 - 10, 256);
      ctx.closePath();
      ctx.fill();
    }
  } else if (skin.pattern === 'gold') {
    // Luxury gold honeycomb
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += 48) {
      for (let y = 0; y < 256; y += 42) {
        ctx.strokeRect(x, y, 36, 32);
      }
    }
  } else if (skin.pattern === 'cyber') {
    // Cyberpunk neon cyan & magenta grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    for (let x = 0; x < 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 32, 256);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ec4899';
    for (let y = 0; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + 32);
      ctx.stroke();
    }
  } else {
    // Champions stars
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const x = (i * 85) % 512;
      const y = ((i * 65) % 200) + 28;
      drawStar(ctx, x, y, 5, 24, 11);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

/** Creates a 3D FIFA Regulation Goal with posts, crossbar, net frame & procedural netting */
export function createRegulationGoal(): THREE.Group {
  const goalGroup = new THREE.Group();
  goalGroup.name = 'SoccerGoal';

  const postRadius = 0.08;
  const goalWidth = 7.32;
  const goalHeight = 2.44;
  const goalDepth = 1.6;

  // White gloss material for posts
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.1,
  });

  // Left Post
  const leftPostGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16);
  const leftPost = new THREE.Mesh(leftPostGeo, postMaterial);
  leftPost.position.set(-goalWidth / 2, goalHeight / 2, 0);
  leftPost.castShadow = true;
  leftPost.receiveShadow = true;
  goalGroup.add(leftPost);

  // Right Post
  const rightPostGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16);
  const rightPost = new THREE.Mesh(rightPostGeo, postMaterial);
  rightPost.position.set(goalWidth / 2, goalHeight / 2, 0);
  rightPost.castShadow = true;
  rightPost.receiveShadow = true;
  goalGroup.add(rightPost);

  // Crossbar
  const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth + postRadius * 2, 16);
  const crossbar = new THREE.Mesh(crossbarGeo, postMaterial);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, goalHeight, 0);
  crossbar.castShadow = true;
  crossbar.receiveShadow = true;
  goalGroup.add(crossbar);

  // Back support poles (stanchions)
  const supportMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.4,
    metalness: 0.5,
  });
  const stanchionRadius = 0.04;

  const leftStanchionGeo = new THREE.CylinderGeometry(stanchionRadius, stanchionRadius, goalDepth, 12);
  const leftStanchion = new THREE.Mesh(leftStanchionGeo, supportMat);
  leftStanchion.rotation.x = Math.PI / 2;
  leftStanchion.position.set(-goalWidth / 2, goalHeight, -goalDepth / 2);
  goalGroup.add(leftStanchion);

  const rightStanchion = leftStanchion.clone();
  rightStanchion.position.set(goalWidth / 2, goalHeight, -goalDepth / 2);
  goalGroup.add(rightStanchion);

  // Ground base frame
  const groundLeft = new THREE.Mesh(new THREE.CylinderGeometry(stanchionRadius, stanchionRadius, goalDepth, 8), supportMat);
  groundLeft.rotation.x = Math.PI / 2;
  groundLeft.position.set(-goalWidth / 2, 0.04, -goalDepth / 2);
  goalGroup.add(groundLeft);

  const groundRight = groundLeft.clone();
  groundRight.position.set(goalWidth / 2, 0.04, -goalDepth / 2);
  goalGroup.add(groundRight);

  const groundBack = new THREE.Mesh(new THREE.CylinderGeometry(stanchionRadius, stanchionRadius, goalWidth, 8), supportMat);
  groundBack.rotation.z = Math.PI / 2;
  groundBack.position.set(0, 0.04, -goalDepth);
  goalGroup.add(groundBack);

  // Procedural Net Texture
  const netCanvas = document.createElement('canvas');
  netCanvas.width = 64;
  netCanvas.height = 64;
  const nctx = netCanvas.getContext('2d')!;
  nctx.fillStyle = 'rgba(255,255,255,0)';
  nctx.fillRect(0, 0, 64, 64);
  nctx.strokeStyle = 'rgba(240, 240, 240, 0.85)';
  nctx.lineWidth = 3;
  nctx.strokeRect(0, 0, 64, 64);

  const netTexture = new THREE.CanvasTexture(netCanvas);
  netTexture.wrapS = THREE.RepeatWrapping;
  netTexture.wrapT = THREE.RepeatWrapping;
  netTexture.repeat.set(40, 16);

  const netMaterial = new THREE.MeshStandardMaterial({
    map: netTexture,
    transparent: true,
    opacity: 0.72,
    roughness: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Back net
  const backNetGeo = new THREE.PlaneGeometry(goalWidth, goalHeight, 16, 8);
  const backNet = new THREE.Mesh(backNetGeo, netMaterial);
  backNet.position.set(0, goalHeight / 2, -goalDepth);
  goalGroup.add(backNet);

  // Top net
  const topNetGeo = new THREE.PlaneGeometry(goalWidth, goalDepth, 16, 6);
  const topNet = new THREE.Mesh(topNetGeo, netMaterial);
  topNet.rotation.x = Math.PI / 2;
  topNet.position.set(0, goalHeight, -goalDepth / 2);
  goalGroup.add(topNet);

  // Left net
  const leftNetGeo = new THREE.PlaneGeometry(goalDepth, goalHeight, 6, 8);
  const leftNet = new THREE.Mesh(leftNetGeo, netMaterial);
  leftNet.rotation.y = Math.PI / 2;
  leftNet.position.set(-goalWidth / 2, goalHeight / 2, -goalDepth / 2);
  goalGroup.add(leftNet);

  // Right net
  const rightNetGeo = new THREE.PlaneGeometry(goalDepth, goalHeight, 6, 8);
  const rightNet = new THREE.Mesh(rightNetGeo, netMaterial);
  rightNet.rotation.y = -Math.PI / 2;
  rightNet.position.set(goalWidth / 2, goalHeight / 2, -goalDepth / 2);
  goalGroup.add(rightNet);

  return goalGroup;
}

/** Procedural 3D Wall Defender Player Model (Composite Group of 9 parts) */
export function createWallDefender(jerseyColor = 0xdc2626, numberStr = '4'): THREE.Group {
  const player = new THREE.Group();
  player.name = 'Defender';

  // Skin tone material
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    roughness: 0.65,
    metalness: 0.05,
  });

  // Jersey Material with number
  const jerseyMat = new THREE.MeshStandardMaterial({
    color: jerseyColor,
    roughness: 0.5,
    metalness: 0.1,
  });

  // Shorts Material (navy / dark)
  const shortsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
  });

  // Socks Material
  const socksMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
  });

  // Cleats / Boots Material
  const bootsMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Hair Material
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.9,
  });

  // 1. Cleats / Feet
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.26), bootsMat);
  leftBoot.position.set(-0.14, 0.04, 0.04);
  leftBoot.castShadow = true;
  player.add(leftBoot);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.26), bootsMat);
  rightBoot.position.set(0.14, 0.04, 0.04);
  rightBoot.castShadow = true;
  player.add(rightBoot);

  // 2. Socks / Lower legs
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.44, 12), socksMat);
  leftLeg.position.set(-0.14, 0.28, 0);
  leftLeg.castShadow = true;
  player.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.44, 12), socksMat);
  rightLeg.position.set(0.14, 0.28, 0);
  rightLeg.castShadow = true;
  player.add(rightLeg);

  // 3. Knees (Skin)
  const leftKnee = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), skinMat);
  leftKnee.position.set(-0.14, 0.52, 0);
  player.add(leftKnee);

  const rightKnee = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), skinMat);
  rightKnee.position.set(0.14, 0.52, 0);
  player.add(rightKnee);

  // 4. Shorts
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.32, 14), shortsMat);
  shorts.position.set(0, 0.72, 0);
  shorts.castShadow = true;
  player.add(shorts);

  // 5. Torso / Jersey (Primary silhouette)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.26), jerseyMat);
  torso.position.set(0, 1.14, 0);
  torso.castShadow = true;
  player.add(torso);

  // 6. Defensive Arms (Crossed over chest/groin in classic free-kick wall posture)
  const armMat = jerseyMat;
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.44, 10), armMat);
  leftArm.rotation.z = Math.PI / 4;
  leftArm.rotation.x = -Math.PI / 6;
  leftArm.position.set(-0.2, 0.98, 0.14);
  player.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.44, 10), armMat);
  rightArm.rotation.z = -Math.PI / 4;
  rightArm.rotation.x = -Math.PI / 6;
  rightArm.position.set(0.2, 0.98, 0.14);
  player.add(rightArm);

  // 7. Hands
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
  leftHand.position.set(-0.06, 0.86, 0.18);
  player.add(leftHand);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
  rightHand.position.set(0.06, 0.86, 0.18);
  player.add(rightHand);

  // 8. Head & Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10), skinMat);
  neck.position.set(0, 1.46, 0);
  player.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), skinMat);
  head.position.set(0, 1.60, 0);
  head.castShadow = true;
  player.add(head);

  // 9. Hair
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.set(0, 1.63, -0.01);
  player.add(hair);

  return player;
}

/** Procedural 3D Goalkeeper Model (Composite Group with gloves & diving posture) */
export function createGoalkeeper(kitColor = 0xeab308): THREE.Group {
  const gk = new THREE.Group();
  gk.name = 'Goalkeeper';

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe0ac69,
    roughness: 0.65,
  });

  // Bright keeper jersey
  const jerseyMat = new THREE.MeshStandardMaterial({
    color: kitColor,
    roughness: 0.45,
    metalness: 0.15,
  });

  const shortsMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
  });

  // Bright neon goalie gloves
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.3,
    metalness: 0.3,
  });

  const bootsMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
  });

  // Feet
  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.28), bootsMat);
  leftBoot.position.set(-0.25, 0.04, 0.05);
  gk.add(leftBoot);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.28), bootsMat);
  rightBoot.position.set(0.25, 0.04, 0.05);
  gk.add(rightBoot);

  // Legs in ready crouch stance
  const legMat = new THREE.MeshStandardMaterial({ color: kitColor, roughness: 0.6 });
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.5, 12), legMat);
  leftLeg.position.set(-0.25, 0.3, 0);
  leftLeg.rotation.z = -0.1;
  gk.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.5, 12), legMat);
  rightLeg.position.set(0.25, 0.3, 0);
  rightLeg.rotation.z = 0.1;
  gk.add(rightLeg);

  // Shorts
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.34, 14), shortsMat);
  shorts.position.set(0, 0.74, 0);
  gk.add(shorts);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.6, 0.28), jerseyMat);
  torso.position.set(0, 1.18, 0);
  torso.castShadow = true;
  gk.add(torso);

  // Outstretched ready arms (sub-groups for dynamic diving animation)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.name = 'LeftArmGroup';
  leftArmGroup.position.set(-0.3, 1.35, 0);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.46, 10), jerseyMat);
  leftArm.position.set(-0.16, -0.16, 0.12);
  leftArm.rotation.z = Math.PI / 3;
  leftArmGroup.add(leftArm);

  const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.08), gloveMat);
  leftGlove.position.set(-0.32, -0.28, 0.22);
  leftArmGroup.add(leftGlove);
  gk.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.name = 'RightArmGroup';
  rightArmGroup.position.set(0.3, 1.35, 0);

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.46, 10), jerseyMat);
  rightArm.position.set(0.16, -0.16, 0.12);
  rightArm.rotation.z = -Math.PI / 3;
  rightArmGroup.add(rightArm);

  const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.08), gloveMat);
  rightGlove.position.set(0.32, -0.28, 0.22);
  rightArmGroup.add(rightGlove);
  gk.add(rightArmGroup);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 14), skinMat);
  head.position.set(0, 1.64, 0.04);
  head.castShadow = true;
  gk.add(head);

  // Hair
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x292524 }));
  hair.position.set(0, 1.68, 0.03);
  gk.add(hair);

  return gk;
}

/** Procedural Target Ring (Vòng hồng tâm thưởng điểm góc chữ A) */
export function createTargetRing(radius = 0.42, points = 500): THREE.Group {
  const target = new THREE.Group();
  target.name = `TargetRing_${points}`;

  // Outer gold ring
  const outerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.8,
  });
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.04, 12, 32), outerMat);
  target.add(outerRing);

  // Inner red bullseye
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
  });
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.55, 0.035, 12, 28), innerMat);
  target.add(innerRing);

  // Center bullseye disc
  const centerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const centerDisc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.25, 24), centerMat);
  target.add(centerDisc);

  return target;
}

/** Procedural Stadium Atmosphere: Grandstands, Advertising LED Boards & Floodlight Towers */
export function createStadiumEnvironment(): THREE.Group {
  const stadium = new THREE.Group();
  stadium.name = 'StadiumEnvironment';

  // Pitch perimeter advertising LED boards
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0x0369a1,
    emissiveIntensity: 0.25,
  });

  const adBoardBack = new THREE.Mesh(new THREE.BoxGeometry(40, 1.1, 0.4), boardMat);
  adBoardBack.position.set(0, 0.55, -4.5);
  stadium.add(adBoardBack);

  const adBoardLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 45), boardMat);
  adBoardLeft.position.set(-22, 0.55, 15);
  stadium.add(adBoardLeft);

  const adBoardRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 45), boardMat);
  adBoardRight.position.set(22, 0.55, 15);
  stadium.add(adBoardRight);

  // Stadium Grandstands behind the goal
  const standMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
  });

  // Terraced seating steps
  for (let row = 0; row < 12; row++) {
    const stepDepth = 2.0;
    const stepHeight = 1.2;
    const stepWidth = 60;
    const seatRow = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), standMat);
    seatRow.position.set(0, row * stepHeight + stepHeight / 2, -6 - row * stepDepth);
    stadium.add(seatRow);

    // Crowd colored blocks on seats
    const crowdMat = new THREE.MeshBasicMaterial({
      color: row % 2 === 0 ? 0xd97706 : 0x2563eb,
    });
    const crowdRow = new THREE.Mesh(new THREE.BoxGeometry(stepWidth * 0.95, 0.6, 0.8), crowdMat);
    crowdRow.position.set(0, row * stepHeight + stepHeight + 0.3, -6 - row * stepDepth);
    stadium.add(crowdRow);
  }

  // 4 Massive Stadium Floodlight Towers with warm/cool lighting
  const towerPositions = [
    [-28, -8],
    [28, -8],
    [-28, 40],
    [28, 40],
  ];

  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.7,
    roughness: 0.3,
  });

  towerPositions.forEach(([tx, tz]) => {
    const tower = new THREE.Group();
    // Lattice mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 24, 8), towerMat);
    mast.position.set(0, 12, 0);
    tower.add(mast);

    // Floodlight rack panel
    const rack = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 0.6), towerMat);
    rack.position.set(0, 24, 0);
    rack.lookAt(0, 2, 10);
    tower.add(rack);

    // Bright light emitter panel
    const lightEmitter = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    lightEmitter.position.set(0, 24, 0.35);
    lightEmitter.lookAt(0, 2, 10);
    tower.add(lightEmitter);

    tower.position.set(tx, 0, tz);
    stadium.add(tower);
  });

  return stadium;
}
