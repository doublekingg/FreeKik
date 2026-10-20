/**
 * Game Types & Interfaces for Free Kick Master 3D (Vua Đá Phạt 3D)
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SpinVector {
  x: number; // Topspin (-1 to 1: positive dips down, negative lofts up)
  y: number; // Sidespin / Curl (-1 to 1: positive curves right, negative curves left)
}

export interface ShotParameters {
  aimAngleX: number; // Horizontal angle in degrees (-30 to +30)
  aimAngleY: number; // Elevation angle in degrees (8 to 35)
  power: number;     // 0 to 100% (translates to initial speed ~18 to 34 m/s)
  spin: SpinVector;  // Curl and dip parameters
}

export interface BallSkin {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: 'classic' | 'inferno' | 'gold' | 'cyber' | 'stars';
  unlocked: boolean;
  requiredStars?: number;
  unlockedByDaily?: number; // Day number in daily reward
}

export interface ChallengeLevel {
  id: number;
  name: string;
  subtitle: string;
  distance: number; // in meters (e.g. 18 to 32)
  angleOffset: number; // Lateral offset from center in meters
  wallCount: number; // 0 to 5 defenders
  wallJumpHeight: number; // Jumping power of wall
  keeperSkill: 'rookie' | 'amateur' | 'pro' | 'world_class' | 'legend';
  windSpeed: number; // m/s
  windDirection: number; // Angle in degrees
  hasTargetBins: boolean; // Gold target rings in top corners
  targetBinPositions?: { x: number; y: number; z: number; radius: number; points: number }[];
  targetIsMoving?: boolean;
  requiredScoreToPass: number;
  threeStarScore: number;
  tips: string;
}

export interface ShotResult {
  isGoal: boolean;
  isPost: boolean;
  isSaved: boolean;
  isWallHit: boolean;
  isTargetHit: boolean;
  targetHitPoints: number;
  speedKmh: number;
  curveRating: number;
  distanceMeters: number;
  topCornerBonus: boolean;
  scoreEarned: number;
  trajectoryPoints: Vector3D[];
  message: string;
}

export interface LeaderboardEntry {
  id: string;
  rank?: number;
  playerName: string;
  score: number;
  level: number;
  accuracy: number; // percentage
  streak: number;
  curveStyle: string;
  date: string;
  avatarSeed: string;
  badge?: string;
  isCurrentUser?: boolean;
}

export interface DailyRewardDay {
  day: number;
  rewardType: 'coins' | 'ball' | 'jersey' | 'spin';
  amount?: number;
  ballId?: string;
  title: string;
  claimed: boolean;
}

export interface UserProgress {
  playerName: string;
  coins: number;
  totalScore: number;
  currentStreak: number;
  highestStreak: number;
  totalGoals: number;
  totalShots: number;
  levelStars: Record<number, number>; // levelId -> 1, 2, or 3 stars
  unlockedLevels: number[];
  selectedBallId: string;
  selectedJerseyColor: string;
  lastDailyClaimTimestamp: number;
  dailyStreakCount: number;
  luckySpinAvailable: boolean;
  lastSpinTimestamp: number;
}
