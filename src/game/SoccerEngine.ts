/**
 * Free Kick Master 3D - Three.js WebGL Engine
 * Implements realistic PBR rendering, dynamic ball flight, wall jump kinematics,
 * goalkeeper AI dive, aim trajectory guide, and slow-motion replay camera.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createGrassTexture,
  createBallTexture,
  createRegulationGoal,
  createWallDefender,
  createGoalkeeper,
  createTargetRing,
  createStadiumEnvironment,
} from './proceduralModels';
import { SoccerPhysics } from './physics';
import { ShotParameters, ChallengeLevel, ShotResult, BallSkin, Vector3D } from '../types/game';
import { sound } from './audio';

export type CameraPreset = 'striker' | 'broadcast' | 'goal' | 'orbit';

export interface EngineCallbacks {
  onShotResult: (result: ShotResult) => void;
  onGoalScore: (result: ShotResult) => void;
  onPostHit: () => void;
  onWallHit: () => void;
  onKeeperSave: () => void;
  onTargetHit: (points: number) => void;
}

export class FreeKickEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  // Scene Objects
  private ballMesh!: THREE.Mesh;
  private ballShadowMesh!: THREE.Mesh;
  private goalGroup!: THREE.Group;
  private wallGroup: THREE.Group = new THREE.Group();
  private goalkeeperMesh!: THREE.Group;
  private targetRingsGroup: THREE.Group = new THREE.Group();
  private aimArrowGroup: THREE.Group = new THREE.Group();
  private trajectoryLine!: THREE.Line;
  private ballTrailLine!: THREE.Line;
  private ballTrailPoints: THREE.Vector3[] = [];

  // State
  private currentLevel!: ChallengeLevel;
  private currentSkin!: BallSkin;
  private callbacks: EngineCallbacks;
  private ballStartPos: THREE.Vector3 = new THREE.Vector3(0, 0.11, 22);
  private ballPhysics = {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    active: false,
    grounded: true,
  };

  private wind = { speed: 0, direction: 0 };
  private isShooting = false;
  private cameraPreset: CameraPreset = 'striker';
  private targetCameraPos = new THREE.Vector3();
  private targetCameraLookAt = new THREE.Vector3();

  // Wall jump animation
  private wallJumpOffset = 0;
  private wallJumpVelocity = 0;
  private isWallJumping = false;

  // Goalkeeper dive animation
  private keeperDiveOffset = new THREE.Vector3();
  private targetKeeperDive = new THREE.Vector3();
  private isKeeperDiving = false;

  // Replay record
  private replayFrames: { ballPos: THREE.Vector3; ballRot: THREE.Euler; time: number }[] = [];
  private isReplaying = false;
  private replayFrameIdx = 0;

  // Reusable vectors (Zero GC in loop)
  private _vec3A = new THREE.Vector3();
  private _vec3B = new THREE.Vector3();
  private _clock = new THREE.Clock();

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1128); // Stadium night sky
    this.scene.fog = new THREE.Fog(0x0a1128, 28, 75);

    // 2. Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 120);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Room Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting Rig
    this.setupLighting();

    // 6. Pitch & Stadium
    this.setupPitchAndStadium();

    // 7. Aim Guidance & Ball Trail
    this.setupGuidanceLines();

    // 8. Handle Resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    // 9. Start Loop
    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private setupLighting() {
    // Cool ambient hemisphere
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x166534, 0.7);
    this.scene.add(hemiLight);

    // Warm Key Floodlight with soft shadows
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(12, 26, 28);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 65;
    const shadowSize = 20;
    keyLight.shadow.camera.left = -shadowSize;
    keyLight.shadow.camera.right = shadowSize;
    keyLight.shadow.camera.top = shadowSize;
    keyLight.shadow.camera.bottom = -shadowSize;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Stadium Rim / Back Light
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    rimLight.position.set(-16, 22, -15);
    this.scene.add(rimLight);
  }

  private setupPitchAndStadium() {
    // Pitch Plane
    const grassTex = createGrassTexture();
    const pitchMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const pitchGeo = new THREE.PlaneGeometry(55, 75);
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0, 18);
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Penalty Box & Pitch White Lines
    this.drawPitchMarkings();

    // Goal
    this.goalGroup = createRegulationGoal();
    this.scene.add(this.goalGroup);

    // Stadium Surroundings
    const stadium = createStadiumEnvironment();
    this.scene.add(stadium);

    // Wall & Target Groups
    this.scene.add(this.wallGroup);
    this.scene.add(this.targetRingsGroup);
  }

  private drawPitchMarkings() {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    lineMat.polygonOffset = true;
    lineMat.polygonOffsetFactor = -1;
    lineMat.polygonOffsetUnits = -1;

    // Goal Line
    const goalLine = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.12), lineMat);
    goalLine.rotation.x = -Math.PI / 2;
    goalLine.position.set(0, 0.01, 0);
    this.scene.add(goalLine);

    // Penalty Area Box (40.32m wide, 16.5m deep)
    const boxW = 32;
    const boxD = 16.5;

    // Penalty Box Lines
    const backLine = new THREE.Mesh(new THREE.PlaneGeometry(boxW, 0.12), lineMat);
    backLine.rotation.x = -Math.PI / 2;
    backLine.position.set(0, 0.01, boxD);
    this.scene.add(backLine);

    const leftBoxLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, boxD), lineMat);
    leftBoxLine.rotation.x = -Math.PI / 2;
    leftBoxLine.position.set(-boxW / 2, 0.01, boxD / 2);
    this.scene.add(leftBoxLine);

    const rightBoxLine = leftBoxLine.clone();
    rightBoxLine.position.set(boxW / 2, 0.01, boxD / 2);
    this.scene.add(rightBoxLine);

    // Penalty Spot (11m)
    const penSpot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), lineMat);
    penSpot.rotation.x = -Math.PI / 2;
    penSpot.position.set(0, 0.015, 11);
    this.scene.add(penSpot);

    // Penalty Arc (D-box arc at 11m + 9.15m)
    const arcGeo = new THREE.RingGeometry(9.10, 9.22, 32, 1, Math.PI * 0.28, Math.PI * 0.44);
    const arc = new THREE.Mesh(arcGeo, lineMat);
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(0, 0.015, 11);
    this.scene.add(arc);
  }

  private setupGuidanceLines() {
    // 1. Aim Arrow in 3D
    const arrowShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      })
    );
    arrowShaft.rotation.x = Math.PI / 2;
    arrowShaft.position.set(0, 0.15, -1.1);

    const arrowHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.4, 12),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      })
    );
    arrowHead.rotation.x = -Math.PI / 2;
    arrowHead.position.set(0, 0.15, -2.3);

    this.aimArrowGroup.add(arrowShaft);
    this.aimArrowGroup.add(arrowHead);
    this.scene.add(this.aimArrowGroup);

    // 2. Trajectory Prediction Line
    const trajGeo = new THREE.BufferGeometry();
    const trajMat = new THREE.LineDashedMaterial({
      color: 0xfacc15,
      dashSize: 0.35,
      gapSize: 0.2,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });
    this.trajectoryLine = new THREE.Line(trajGeo, trajMat);
    this.trajectoryLine.frustumCulled = false;
    this.scene.add(this.trajectoryLine);

    // 3. Dynamic Ball Trail
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 4,
      transparent: true,
      opacity: 0.9,
    });
    this.ballTrailLine = new THREE.Line(trailGeo, trailMat);
    this.ballTrailLine.frustumCulled = false;
    this.scene.add(this.ballTrailLine);
  }

  /**
   * Initializes or updates the level setup (ball position, wall defenders, keeper, targets)
   */
  public loadLevel(level: ChallengeLevel, skin: BallSkin) {
    this.currentLevel = level;
    this.currentSkin = skin;
    this.wind = { speed: level.windSpeed, direction: level.windDirection };

    // Set ball starting position
    this.ballStartPos.set(level.angleOffset, 0.11, level.distance);
    this.resetBallPosition();

    // Build or update ball mesh
    this.buildBallMesh(skin);

    // Build Wall Defenders
    this.buildWall(level);

    // Build Goalkeeper
    this.buildGoalkeeper(level);

    // Build Targets
    this.buildTargets(level);

    // Set camera
    this.updateCameraForStriker();
  }

  private buildBallMesh(skin: BallSkin) {
    if (this.ballMesh) {
      this.scene.remove(this.ballMesh);
      if (this.ballMesh.geometry) this.ballMesh.geometry.dispose();
      if (this.ballMesh.material) (this.ballMesh.material as THREE.Material).dispose();
    }
    if (this.ballShadowMesh) {
      this.scene.remove(this.ballShadowMesh);
    }

    const ballTex = createBallTexture(skin);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.28,
      metalness: skin.pattern === 'gold' ? 0.75 : 0.12,
    });

    const ballGeo = new THREE.SphereGeometry(SoccerPhysics.POST_RADIUS + 0.03, 32, 24);
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = true;
    this.ballMesh.position.copy(this.ballStartPos);
    this.scene.add(this.ballMesh);

    // Ball Contact Shadow
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
    });
    const shadowGeo = new THREE.CircleGeometry(0.18, 16);
    this.ballShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.ballShadowMesh.rotation.x = -Math.PI / 2;
    this.ballShadowMesh.position.set(this.ballStartPos.x, 0.015, this.ballStartPos.z);
    this.scene.add(this.ballShadowMesh);
  }

  private buildWall(level: ChallengeLevel) {
    // Clear old wall
    while (this.wallGroup.children.length > 0) {
      const child = this.wallGroup.children[0];
      this.wallGroup.remove(child);
    }

    if (level.wallCount === 0) return;

    // Wall distance: 9.15m from the ball
    const wallZ = this.ballStartPos.z - 9.15;
    // Align wall to block direct line of sight between ball and center of goal
    const wallCenterX = this.ballStartPos.x * 0.52;
    const spacing = 0.54;
    const halfWidth = ((level.wallCount - 1) * spacing) / 2;

    for (let i = 0; i < level.wallCount; i++) {
      const defender = createWallDefender(0xdc2626, (i + 4).toString());
      const defX = wallCenterX - halfWidth + i * spacing;
      defender.position.set(defX, 0, wallZ);
      defender.lookAt(this.ballStartPos.x, 0, this.ballStartPos.z);
      this.wallGroup.add(defender);
    }
  }

  private buildGoalkeeper(level: ChallengeLevel) {
    if (this.goalkeeperMesh) {
      this.scene.remove(this.goalkeeperMesh);
    }

    this.goalkeeperMesh = createGoalkeeper(0xeab308);
    // Keeper stands slightly in front of goal line
    const startX = level.angleOffset * 0.15;
    this.goalkeeperMesh.position.set(startX, 0, 0.5);
    this.goalkeeperMesh.lookAt(this.ballStartPos.x, 0, this.ballStartPos.z);
    this.scene.add(this.goalkeeperMesh);
  }

  private buildTargets(level: ChallengeLevel) {
    while (this.targetRingsGroup.children.length > 0) {
      const c = this.targetRingsGroup.children[0];
      this.targetRingsGroup.remove(c);
    }

    if (level.hasTargetBins && level.targetBinPositions) {
      level.targetBinPositions.forEach((tp) => {
        const ring = createTargetRing(tp.radius, tp.points);
        ring.position.set(tp.x, tp.y, 0.05);
        this.targetRingsGroup.add(ring);
      });
    }
  }

  public updateAimGuide(params: ShotParameters) {
    if (this.isShooting) return;

    // Update 3D Aim Arrow orientation
    this.aimArrowGroup.position.copy(this.ballStartPos);
    this.aimArrowGroup.rotation.y = (-params.aimAngleX * Math.PI) / 180;
    this.aimArrowGroup.rotation.x = (params.aimAngleY * Math.PI) / 180;

    // Calculate predicted arc
    const points = SoccerPhysics.predictTrajectory(
      { x: this.ballStartPos.x, y: this.ballStartPos.y, z: this.ballStartPos.z },
      params,
      this.wind,
      45,
      0.03
    );

    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });

    this.trajectoryLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trajectoryLine.geometry.attributes.position.needsUpdate = true;
    this.trajectoryLine.computeLineDistances();
    this.trajectoryLine.visible = true;
    this.aimArrowGroup.visible = true;
  }

  /**
   * Fires the free kick with physics simulation, wall jump, keeper dive, and sound
   */
  public shoot(params: ShotParameters) {
    if (this.isShooting || this.isReplaying) return;

    this.isShooting = true;
    this.trajectoryLine.visible = false;
    this.aimArrowGroup.visible = false;
    this.ballTrailPoints = [];

    // Evaluate exact result
    const keeperX = this.goalkeeperMesh ? this.goalkeeperMesh.position.x : 0;
    const result = SoccerPhysics.evaluateShot(
      { x: this.ballStartPos.x, y: this.ballStartPos.y, z: this.ballStartPos.z },
      params,
      this.currentLevel,
      keeperX
    );

    // Initial physics
    const { vel, spin } = SoccerPhysics.calculateInitialState(
      { x: this.ballStartPos.x, y: this.ballStartPos.y, z: this.ballStartPos.z },
      params
    );

    this.ballPhysics.pos.copy(this.ballStartPos);
    this.ballPhysics.vel.set(vel.x, vel.y, vel.z);
    this.ballPhysics.spin.set(spin.x, spin.y, spin.z);
    this.ballPhysics.active = true;
    this.ballPhysics.grounded = false;

    // Audio Kick
    sound.playKick(params.power / 100);
    if (Math.abs(params.spin.y) > 0.35) {
      setTimeout(() => sound.playWhoosh(), 120);
    }

    // Wall Jump
    if (this.currentLevel.wallCount > 0) {
      setTimeout(() => {
        this.isWallJumping = true;
        this.wallJumpVelocity = 3.6;
      }, 140);
    }

    // Goalkeeper Dive
    if (this.goalkeeperMesh) {
      // Find final landing X of ball at goal plane
      const finalPt = result.trajectoryPoints.find((p) => p.z <= 0.8) || result.trajectoryPoints[result.trajectoryPoints.length - 1];
      const targetGkX = THREE.MathUtils.clamp(finalPt.x, -3.4, 3.4);
      const targetGkY = THREE.MathUtils.clamp(finalPt.y, 0.4, 2.2);

      const reactionTime = {
        rookie: 360,
        amateur: 280,
        pro: 220,
        world_class: 160,
        legend: 100,
      }[this.currentLevel.keeperSkill];

      setTimeout(() => {
        this.isKeeperDiving = true;
        this.targetKeeperDive.set(targetGkX, targetGkY, 0.4);
      }, reactionTime);
    }

    // Record replay frames
    this.replayFrames = [];

    // Trigger end callback when shot completes
    const flightDuration = Math.min(2.0, (this.currentLevel.distance / (18 + (params.power / 100) * 16.5)) * 1000 + 400);

    setTimeout(() => {
      this.handleShotFinished(result);
    }, flightDuration);
  }

  private handleShotFinished(result: ShotResult) {
    if (result.isGoal) {
      sound.playGoalCheer();
      sound.playNetSwish();
      this.callbacks.onGoalScore(result);
    } else if (result.isPost) {
      sound.playPostHit();
      sound.playMissGasp();
      this.callbacks.onPostHit();
    } else if (result.isSaved) {
      sound.playSave();
      sound.playMissGasp();
      this.callbacks.onKeeperSave();
    } else if (result.isWallHit) {
      sound.playSave();
      this.callbacks.onWallHit();
    } else {
      sound.playMissGasp();
    }

    if (result.isTargetHit) {
      sound.playTargetHit();
      this.callbacks.onTargetHit(result.targetHitPoints);
    }

    this.callbacks.onShotResult(result);
  }

  public resetBallPosition() {
    this.isShooting = false;
    this.isReplaying = false;
    this.ballPhysics.active = false;
    this.ballPhysics.pos.copy(this.ballStartPos);
    this.ballPhysics.vel.set(0, 0, 0);

    if (this.ballMesh) {
      this.ballMesh.position.copy(this.ballStartPos);
      this.ballMesh.rotation.set(0, 0, 0);
    }
    if (this.ballShadowMesh) {
      this.ballShadowMesh.position.set(this.ballStartPos.x, 0.015, this.ballStartPos.z);
      this.ballShadowMesh.scale.set(1, 1, 1);
    }

    // Reset wall
    this.wallJumpOffset = 0;
    this.wallJumpVelocity = 0;
    this.isWallJumping = false;
    this.wallGroup.position.y = 0;

    // Reset keeper
    this.isKeeperDiving = false;
    if (this.goalkeeperMesh) {
      this.goalkeeperMesh.position.set(this.currentLevel ? this.currentLevel.angleOffset * 0.15 : 0, 0, 0.5);
      this.goalkeeperMesh.rotation.set(0, 0, 0);
      const leftArm = this.goalkeeperMesh.getObjectByName('LeftArmGroup');
      const rightArm = this.goalkeeperMesh.getObjectByName('RightArmGroup');
      if (leftArm) leftArm.rotation.set(0, 0, 0);
      if (rightArm) rightArm.rotation.set(0, 0, 0);
    }

    // Clear trail
    this.ballTrailPoints = [];
    this.ballTrailLine.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));

    this.updateCameraForStriker();
  }

  public replayLastShot() {
    if (this.replayFrames.length === 0 || this.isReplaying) return;
    this.isReplaying = true;
    this.replayFrameIdx = 0;
    this.ballTrailPoints = [];
  }

  public setCameraPreset(preset: CameraPreset) {
    this.cameraPreset = preset;
    if (preset === 'striker') {
      this.updateCameraForStriker();
    } else if (preset === 'broadcast') {
      this.targetCameraPos.set(16, 12, this.ballStartPos.z * 0.5);
      this.targetCameraLookAt.set(0, 1.2, this.ballStartPos.z * 0.35);
    } else if (preset === 'goal') {
      this.targetCameraPos.set(0, 2.2, -3.2);
      this.targetCameraLookAt.set(this.ballStartPos.x, 0.5, this.ballStartPos.z);
    }
  }

  private updateCameraForStriker() {
    // Behind ball looking towards goal
    const camDistance = 3.6;
    const camHeight = 1.35;
    this.targetCameraPos.set(this.ballStartPos.x * 0.85, camHeight, this.ballStartPos.z + camDistance);
    this.targetCameraLookAt.set(this.ballStartPos.x * 0.2, 1.3, 0);
  }

  private animate() {
    if (this.isDestroyed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(this._clock.getDelta(), 0.05);

    // 1. Replay Playback Mode (Slow Motion)
    if (this.isReplaying) {
      if (this.replayFrameIdx < this.replayFrames.length) {
        const frame = this.replayFrames[this.replayFrameIdx];
        this.ballMesh.position.copy(frame.ballPos);
        this.ballMesh.rotation.copy(frame.ballRot);

        if (this.ballShadowMesh) {
          this.ballShadowMesh.position.set(frame.ballPos.x, 0.015, frame.ballPos.z);
          const shadowScale = Math.max(0.2, 1 - frame.ballPos.y * 0.25);
          this.ballShadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
        }

        // Camera follow in replay
        this.targetCameraPos.set(frame.ballPos.x * 0.4 + 4, 3.2, frame.ballPos.z + 4.5);
        this.targetCameraLookAt.copy(frame.ballPos);

        this.replayFrameIdx++;
      } else {
        this.isReplaying = false;
        this.resetBallPosition();
      }
    }
    // 2. Active Shot Physics Simulation
    else if (this.ballPhysics.active) {
      // Substep integration for high stability
      const substeps = 4;
      const subDt = dt / substeps;

      const windRad = (this.wind.direction * Math.PI) / 180;
      const windVx = this.wind.speed * Math.sin(windRad);
      const windVz = -this.wind.speed * Math.cos(windRad);

      for (let s = 0; s < substeps; s++) {
        const bp = this.ballPhysics;
        const vRelX = bp.vel.x - windVx;
        const vRelY = bp.vel.y;
        const vRelZ = bp.vel.z - windVz;
        const vMag = Math.sqrt(vRelX * vRelX + vRelY * vRelY + vRelZ * vRelZ);

        if (vMag > 0.01) {
          // Drag
          const drag = 0.5 * 1.225 * (Math.PI * 0.11 * 0.11) * 0.26 * vMag * vMag;
          const fdX = -drag * (vRelX / vMag);
          const fdY = -drag * (vRelY / vMag);
          const fdZ = -drag * (vRelZ / vMag);

          // Magnus: F = Cm * (spin x v)
          const fmX = 0.00035 * (bp.spin.y * bp.vel.z - bp.spin.z * bp.vel.y);
          const fmY = 0.00035 * (bp.spin.z * bp.vel.x - bp.spin.x * bp.vel.z);
          const fmZ = 0.00035 * (bp.spin.x * bp.vel.y - bp.spin.y * bp.vel.x);

          bp.vel.x += ((fdX + fmX) / 0.43) * subDt;
          bp.vel.y += (((fdY + fmY) / 0.43) - 9.81) * subDt;
          bp.vel.z += ((fdZ + fmZ) / 0.43) * subDt;
        }

        bp.pos.x += bp.vel.x * subDt;
        bp.pos.y += bp.vel.y * subDt;
        bp.pos.z += bp.vel.z * subDt;

        // Ground collision
        if (bp.pos.y <= 0.11) {
          bp.pos.y = 0.11;
          bp.vel.y = -bp.vel.y * 0.5;
          bp.vel.x *= 0.88;
          bp.vel.z *= 0.88;
        }

        // Net / Back fence slowing
        if (bp.pos.z < -0.2 && Math.abs(bp.pos.x) < 3.66 && bp.pos.y < 2.44) {
          bp.vel.multiplyScalar(0.92);
        }
      }

      // Update mesh position & visual rotation
      this.ballMesh.position.copy(this.ballPhysics.pos);
      this.ballMesh.rotation.x += this.ballPhysics.spin.x * dt * 0.2 + (this.ballPhysics.vel.z / 0.11) * dt;
      this.ballMesh.rotation.y += this.ballPhysics.spin.y * dt * 0.2;
      this.ballMesh.rotation.z += (this.ballPhysics.vel.x / 0.11) * dt;

      // Update ball shadow
      if (this.ballShadowMesh) {
        this.ballShadowMesh.position.set(this.ballPhysics.pos.x, 0.015, this.ballPhysics.pos.z);
        const shadowScale = Math.max(0.2, 1 - (this.ballPhysics.pos.y - 0.11) * 0.35);
        this.ballShadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
      }

      // Update Trail
      this.ballTrailPoints.push(this.ballPhysics.pos.clone());
      if (this.ballTrailPoints.length > 55) {
        this.ballTrailPoints.shift();
      }
      const trailPositions = new Float32Array(this.ballTrailPoints.length * 3);
      this.ballTrailPoints.forEach((p, i) => {
        trailPositions[i * 3] = p.x;
        trailPositions[i * 3 + 1] = p.y;
        trailPositions[i * 3 + 2] = p.z;
      });
      this.ballTrailLine.geometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      this.ballTrailLine.geometry.attributes.position.needsUpdate = true;

      // Dynamic Camera tracking ball
      if (this.cameraPreset === 'striker') {
        this.targetCameraLookAt.copy(this.ballPhysics.pos);
        this.targetCameraPos.x = THREE.MathUtils.damp(this.targetCameraPos.x, this.ballPhysics.pos.x * 0.5, 3.5, dt);
      }

      // Save frame for replay
      this.replayFrames.push({
        ballPos: this.ballPhysics.pos.clone(),
        ballRot: this.ballMesh.rotation.clone(),
        time: this._clock.getElapsedTime(),
      });
    }

    // 3. Wall Jump Kinematics
    if (this.isWallJumping) {
      this.wallJumpOffset += this.wallJumpVelocity * dt;
      this.wallJumpVelocity -= 9.81 * dt;
      if (this.wallJumpOffset <= 0) {
        this.wallJumpOffset = 0;
        this.isWallJumping = false;
      }
      this.wallGroup.position.y = this.wallJumpOffset;
    }

    // 4. Goalkeeper Dive Kinematics
    if (this.isKeeperDiving && this.goalkeeperMesh) {
      this.goalkeeperMesh.position.x = THREE.MathUtils.damp(
        this.goalkeeperMesh.position.x,
        this.targetKeeperDive.x,
        6.5,
        dt
      );
      this.goalkeeperMesh.position.y = THREE.MathUtils.damp(
        this.goalkeeperMesh.position.y,
        this.targetKeeperDive.y * 0.6,
        5.0,
        dt
      );

      // Body tilt toward dive direction
      const diveSign = Math.sign(this.targetKeeperDive.x - this.goalkeeperMesh.position.x);
      const targetRoll = -diveSign * 0.75;
      this.goalkeeperMesh.rotation.z = THREE.MathUtils.damp(this.goalkeeperMesh.rotation.z, targetRoll, 7.0, dt);

      // Arm reach extension
      const leftArm = this.goalkeeperMesh.getObjectByName('LeftArmGroup');
      const rightArm = this.goalkeeperMesh.getObjectByName('RightArmGroup');
      if (leftArm && rightArm) {
        leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, diveSign < 0 ? -1.8 : 0.4, 8.0, dt);
        rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, diveSign > 0 ? 1.8 : -0.4, 8.0, dt);
      }
    }

    // 5. Moving Targets (Level 6+)
    if (this.currentLevel?.targetIsMoving && this.targetRingsGroup.children.length > 0) {
      const time = this._clock.getElapsedTime();
      this.targetRingsGroup.children.forEach((child, i) => {
        child.position.y = 2.1 + Math.sin(time * 2.5 + i) * 0.28;
      });
    }

    // 6. Camera Smooth Damping (Mandatory per Three.js Skill)
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.targetCameraPos.x, 4.0, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.targetCameraPos.y, 4.0, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.targetCameraPos.z, 4.0, dt);

    this.camera.lookAt(this.targetCameraLookAt);

    // 7. Render
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize() {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);

    // Dispose
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
