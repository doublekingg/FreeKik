/**
 * Soccer Physics Engine with Magnus Aerodynamic Force, Wind, Wall & Goalkeeper AI
 */

import { ShotParameters, Vector3D, ChallengeLevel, ShotResult } from '../types/game';

export interface BallPhysicsState {
  pos: Vector3D;
  vel: Vector3D;
  spin: Vector3D; // rad/s
  radius: number;
  mass: number;
  isGrounded: boolean;
  active: boolean;
}

export class SoccerPhysics {
  // Physical constants
  private static readonly GRAVITY = 9.81;
  private static readonly AIR_DENSITY = 1.225;
  private static readonly BALL_RADIUS = 0.11; // Size 5 football
  private static readonly BALL_MASS = 0.43;   // kg
  private static readonly DRAG_COEFF = 0.26;
  private static readonly MAGNUS_COEFF = 0.00035;

  // Goal dimensions (FIFA regulation)
  public static readonly GOAL_WIDTH = 7.32;
  public static readonly GOAL_HEIGHT = 2.44;
  public static readonly POST_RADIUS = 0.08;

  /**
   * Computes the initial ball velocity and spin vectors from player input
   */
  public static calculateInitialState(
    ballStart: Vector3D,
    params: ShotParameters
  ): { vel: Vector3D; spin: Vector3D } {
    // Power (0 to 100%) maps to speed ~18 m/s (65 km/h) up to 34 m/s (122 km/h)
    const speed = 18 + (params.power / 100) * 16.5;

    // Convert aim angles to radians
    // aimAngleX: horizontal heading (-25° to +25°)
    // aimAngleY: elevation angle (9° to 35°)
    const radX = (params.aimAngleX * Math.PI) / 180;
    const radY = (params.aimAngleY * Math.PI) / 180;

    // Velocity towards goal (Goal is at Z = 0, Ball starts at positive Z)
    const vY = speed * Math.sin(radY);
    const horizSpeed = speed * Math.cos(radY);
    const vX = horizSpeed * Math.sin(radX);
    const vZ = -horizSpeed * Math.cos(radX); // moving towards -Z

    // Spin:
    // params.spin.y: sidespin / curl (-1 to 1). negative = curve left, positive = curve right
    // params.spin.x: topspin / dip (-1 to 1). positive = topspin dip, negative = backspin float
    const maxSpin = 55; // rad/s (~525 RPM)
    const spinY = params.spin.y * maxSpin;
    const spinX = params.spin.x * maxSpin;
    const spinZ = 0;

    return {
      vel: { x: vX, y: vY, z: vZ },
      spin: { x: spinX, y: spinY, z: spinZ },
    };
  }

  /**
   * Pre-calculates trajectory points for shot prediction guide
   */
  public static predictTrajectory(
    ballStart: Vector3D,
    params: ShotParameters,
    wind: { speed: number; direction: number },
    maxSteps = 60,
    dt = 0.025
  ): Vector3D[] {
    const { vel, spin } = this.calculateInitialState(ballStart, params);
    const points: Vector3D[] = [{ ...ballStart }];

    let pos = { ...ballStart };
    let v = { ...vel };

    const windRad = (wind.direction * Math.PI) / 180;
    const windVx = wind.speed * Math.sin(windRad);
    const windVz = -wind.speed * Math.cos(windRad);

    for (let i = 0; i < maxSteps; i++) {
      // Wind relative speed
      const vRelX = v.x - windVx;
      const vRelY = v.y;
      const vRelZ = v.z - windVz;
      const vMag = Math.sqrt(vRelX * vRelX + vRelY * vRelY + vRelZ * vRelZ);

      // Drag Force
      const dragMag = 0.5 * this.AIR_DENSITY * (Math.PI * this.BALL_RADIUS * this.BALL_RADIUS) * this.DRAG_COEFF * vMag * vMag;
      const fDragX = -dragMag * (vRelX / vMag);
      const fDragY = -dragMag * (vRelY / vMag);
      const fDragZ = -dragMag * (vRelZ / vMag);

      // Magnus Force: F = Cm * (spin x v)
      // (spinX, spinY, spinZ) x (vX, vY, vZ)
      const fMagX = this.MAGNUS_COEFF * (spin.y * v.z - spin.z * v.y);
      const fMagY = this.MAGNUS_COEFF * (spin.z * v.x - spin.x * v.z);
      const fMagZ = this.MAGNUS_COEFF * (spin.x * v.y - spin.y * v.x);

      // Accelerations
      const aX = (fDragX + fMagX) / this.BALL_MASS;
      const aY = (fDragY + fMagY) / this.BALL_MASS - this.GRAVITY;
      const aZ = (fDragZ + fMagZ) / this.BALL_MASS;

      v.x += aX * dt;
      v.y += aY * dt;
      v.z += aZ * dt;

      pos.x += v.x * dt;
      pos.y += v.y * dt;
      pos.z += v.z * dt;

      points.push({ ...pos });

      if (pos.z <= 0 || pos.y <= this.BALL_RADIUS) {
        break;
      }
    }

    return points;
  }

  /**
   * Evaluates shot outcome against wall defenders, goalkeeper, goal posts, net & targets
   */
  public static evaluateShot(
    ballStart: Vector3D,
    params: ShotParameters,
    level: ChallengeLevel,
    keeperOffset = 0
  ): ShotResult {
    const { vel, spin } = this.calculateInitialState(ballStart, params);
    const speedKmh = Math.round(Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) * 3.6);

    const trajectory: Vector3D[] = [{ ...ballStart }];
    let pos = { ...ballStart };
    let v = { ...vel };

    const dt = 0.005; // 200Hz integration for accurate collision
    const totalSimTime = 2.4;
    const steps = Math.floor(totalSimTime / dt);

    const windRad = (level.windDirection * Math.PI) / 180;
    const windVx = level.windSpeed * Math.sin(windRad);
    const windVz = -level.windSpeed * Math.cos(windRad);

    // Wall setup: positioned 9.15m from the ball towards goal
    const wallZ = ballStart.z - 9.15;
    const wallCenterX = ballStart.x * 0.55;
    const wallSpacing = 0.52;
    const wallHalfWidth = (level.wallCount * wallSpacing) / 2;
    const wallMinX = wallCenterX - wallHalfWidth;
    const wallMaxX = wallCenterX + wallHalfWidth;
    const defenderBaseHeight = 1.82;
    const wallHeight = defenderBaseHeight + level.wallJumpHeight;

    // Goalkeeper positioning & AI parameters
    // Keeper starts at center of goal or slightly offset
    let keeperX = keeperOffset;
    const keeperSkillReaction = {
      rookie: { reactionTime: 0.38, diveSpeed: 4.5, reach: 1.1 },
      amateur: { reactionTime: 0.32, diveSpeed: 5.5, reach: 1.3 },
      pro: { reactionTime: 0.24, diveSpeed: 7.2, reach: 1.55 },
      world_class: { reactionTime: 0.18, diveSpeed: 9.0, reach: 1.8 },
      legend: { reactionTime: 0.12, diveSpeed: 11.0, reach: 2.0 },
    }[level.keeperSkill];

    let isWallHit = false;
    let isSaved = false;
    let isGoal = false;
    let isPost = false;
    let isTargetHit = false;
    let targetHitPoints = 0;
    let topCornerBonus = false;
    let message = 'Sút hỏng!';

    // Simulate flight
    for (let step = 0; step < steps; step++) {
      const t = step * dt;

      // Forces
      const vRelX = v.x - windVx;
      const vRelY = v.y;
      const vRelZ = v.z - windVz;
      const vMag = Math.sqrt(vRelX * vRelX + vRelY * vRelY + vRelZ * vRelZ);

      const dragMag = 0.5 * this.AIR_DENSITY * (Math.PI * this.BALL_RADIUS * this.BALL_RADIUS) * this.DRAG_COEFF * vMag * vMag;
      const fDragX = -dragMag * (vRelX / vMag);
      const fDragY = -dragMag * (vRelY / vMag);
      const fDragZ = -dragMag * (vRelZ / vMag);

      const fMagX = this.MAGNUS_COEFF * (spin.y * v.z - spin.z * v.y);
      const fMagY = this.MAGNUS_COEFF * (spin.z * v.x - spin.x * v.z);
      const fMagZ = this.MAGNUS_COEFF * (spin.x * v.y - spin.y * v.x);

      const aX = (fDragX + fMagX) / this.BALL_MASS;
      const aY = (fDragY + fMagY) / this.BALL_MASS - this.GRAVITY;
      const aZ = (fDragZ + fMagZ) / this.BALL_MASS;

      v.x += aX * dt;
      v.y += aY * dt;
      v.z += aZ * dt;

      pos.x += v.x * dt;
      pos.y += v.y * dt;
      pos.z += v.z * dt;

      // Sample every 4 steps for trajectory output
      if (step % 4 === 0) {
        trajectory.push({ ...pos });
      }

      // 1. Wall collision check (when crossing the wall plane Z)
      if (
        level.wallCount > 0 &&
        Math.abs(pos.z - wallZ) < 0.35 &&
        pos.x >= wallMinX &&
        pos.x <= wallMaxX &&
        pos.y <= wallHeight &&
        pos.y >= 0.1
      ) {
        isWallHit = true;
        message = 'Trúng hàng rào cản phá!';
        // Deflect ball
        v.z = -v.z * 0.3;
        v.x += (Math.random() - 0.5) * 6;
        v.y = Math.abs(v.y) * 0.4;
        break;
      }

      // Ground bounce
      if (pos.y <= this.BALL_RADIUS) {
        pos.y = this.BALL_RADIUS;
        v.y = -v.y * 0.55; // dampening
        v.x *= 0.85;
        v.z *= 0.85;
        if (Math.abs(v.y) < 0.5 && pos.z > 0) {
          // Ball rolling before goal
          message = 'Bóng chạm đất quá sớm!';
        }
      }

      // Goalkeeper movement simulation
      if (t >= keeperSkillReaction.reactionTime && pos.z < 14) {
        // Keeper tracks ball arrival X
        const dx = pos.x - keeperX;
        const moveDist = Math.sign(dx) * Math.min(Math.abs(dx), keeperSkillReaction.diveSpeed * dt);
        keeperX += moveDist;
      }

      // 2. Goal Line Crossing (z <= 0)
      if (pos.z <= 0) {
        const goalHalfW = this.GOAL_WIDTH / 2;
        const goalH = this.GOAL_HEIGHT;

        // Check Target Bins
        if (level.hasTargetBins && level.targetBinPositions) {
          for (const target of level.targetBinPositions) {
            const dist = Math.hypot(pos.x - target.x, pos.y - target.y);
            if (dist <= target.radius + this.BALL_RADIUS) {
              isTargetHit = true;
              targetHitPoints = target.points;
              break;
            }
          }
        }

        // Check Post Hit
        const leftPostDist = Math.hypot(pos.x - (-goalHalfW), pos.y - (pos.y < goalH ? pos.y : goalH));
        const rightPostDist = Math.hypot(pos.x - goalHalfW, pos.y - (pos.y < goalH ? pos.y : goalH));
        const crossbarDist = Math.abs(pos.y - goalH);

        const hitLeftPost = Math.abs(pos.x - (-goalHalfW)) < this.POST_RADIUS + this.BALL_RADIUS && pos.y <= goalH + 0.1;
        const hitRightPost = Math.abs(pos.x - goalHalfW) < this.POST_RADIUS + this.BALL_RADIUS && pos.y <= goalH + 0.1;
        const hitCrossbar = crossbarDist < this.POST_RADIUS + this.BALL_RADIUS && Math.abs(pos.x) <= goalHalfW;

        if (hitLeftPost || hitRightPost || hitCrossbar) {
          isPost = true;
          message = 'Bóng đập xà / cột dọc nảy ra!';
          break;
        }

        // Check if inside Goal Mouth
        if (Math.abs(pos.x) < goalHalfW - this.POST_RADIUS && pos.y > 0.08 && pos.y < goalH - this.POST_RADIUS) {
          // Check Goalkeeper Save
          const distToKeeper = Math.hypot(pos.x - keeperX, pos.y - 1.2);
          if (distToKeeper <= keeperSkillReaction.reach) {
            isSaved = true;
            message = 'Thủ môn bay người xuất thần cản phá!';
            break;
          }

          // It's a GOAL!
          isGoal = true;
          // Check top corners ("Góc chữ A")
          if ((Math.abs(pos.x) > goalHalfW - 1.1) && pos.y > goalH - 0.7) {
            topCornerBonus = true;
            message = 'SIÊU PHẨM GÓC CHỮ A! (Top Bins)';
          } else {
            message = 'VÀOOOOO! Bàn thắng tuyệt đẹp!';
          }
          break;
        } else {
          // Missed goal
          if (pos.y >= goalH) {
            message = 'Bóng bay vọt xà ngang!';
          } else {
            message = 'Bóng chệch cột dọc trong gang tấc!';
          }
          break;
        }
      }
    }

    // Score Calculation
    let scoreEarned = 0;
    const curveRating = Math.round((Math.abs(params.spin.y) + Math.abs(params.spin.x)) * 50);

    if (isGoal) {
      const basePoints = 500;
      const distanceBonus = Math.round((level.distance - 16) * 35);
      const curveBonus = curveRating * 4;
      const speedBonus = Math.round(speedKmh * 3);
      const cornerBonus = topCornerBonus ? 450 : 0;

      scoreEarned = basePoints + distanceBonus + curveBonus + speedBonus + cornerBonus + targetHitPoints;
    } else if (isTargetHit) {
      scoreEarned = targetHitPoints;
    }

    return {
      isGoal,
      isPost,
      isSaved,
      isWallHit,
      isTargetHit,
      targetHitPoints,
      speedKmh,
      curveRating,
      distanceMeters: level.distance,
      topCornerBonus,
      scoreEarned,
      trajectoryPoints: trajectory,
      message,
    };
  }
}
