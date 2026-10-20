/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { FreeKickEngine, CameraPreset } from './game/SoccerEngine';
import { ScoreHeader } from './components/HUD/ScoreHeader';
import { BottomControlDock } from './components/HUD/BottomControlDock';
import { LeaderboardModal } from './components/Modals/LeaderboardModal';
import { LevelSelectModal } from './components/Modals/LevelSelectModal';
import { DailyRewardModal } from './components/Modals/DailyRewardModal';
import { LockerRoomModal } from './components/Modals/LockerRoomModal';
import { GoalCelebrationOverlay } from './components/Modals/GoalCelebrationOverlay';
import { CHALLENGE_LEVELS, BALL_SKINS } from './game/levels';
import { ShotParameters, ChallengeLevel, ShotResult, UserProgress, BallSkin } from './types/game';
import { sound } from './game/audio';

const STORAGE_KEY = 'vua_da_phat_progress_v1';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FreeKickEngine | null>(null);

  // User Progress state with localStorage persistence
  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Storage read failed', e);
    }
    return {
      playerName: 'Sút_Phạt_Pro',
      coins: 300,
      totalScore: 0,
      currentStreak: 0,
      highestStreak: 0,
      totalGoals: 0,
      totalShots: 0,
      levelStars: { 1: 0 },
      unlockedLevels: [1],
      selectedBallId: 'classic',
      selectedJerseyColor: '#dc2626',
      lastDailyClaimTimestamp: 0,
      dailyStreakCount: 0,
      luckySpinAvailable: true,
      lastSpinTimestamp: 0,
    };
  });

  // Save progress changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('Storage write failed', e);
    }
  }, [progress]);

  // Current Level & Ball Skin
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const currentLevel = CHALLENGE_LEVELS.find((l) => l.id === currentLevelId) || CHALLENGE_LEVELS[0];
  const currentSkin = BALL_SKINS.find((s) => s.id === progress.selectedBallId) || BALL_SKINS[0];

  // Active Shot Parameters (Arrow, Power, Spin)
  const [shotParams, setShotParams] = useState<ShotParameters>({
    aimAngleX: 0,
    aimAngleY: 17,
    power: 70,
    spin: { x: 0.1, y: 0.4 }, // Default slight Beckham in-swinger
  });

  // App UI States
  const [isShooting, setIsShooting] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('striker');
  const [isMuted, setIsMuted] = useState(sound.isMuted);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isLevelsOpen, setIsLevelsOpen] = useState(false);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isLockerOpen, setIsLockerOpen] = useState(false);

  // Handle Shot Result from Engine
  const handleShotResult = useCallback((result: ShotResult) => {
    setIsShooting(false);
    setLastResult(result);

    setProgress((prev) => {
      const isGoal = result.isGoal;
      const newStreak = isGoal ? prev.currentStreak + 1 : 0;
      const newHighest = Math.max(prev.highestStreak, newStreak);
      const newGoals = prev.totalGoals + (isGoal ? 1 : 0);
      const newScore = prev.totalScore + result.scoreEarned;
      const newCoins = prev.coins + (isGoal ? Math.round(result.scoreEarned * 0.1) : 10);

      // Level stars calculation
      let starsEarned = prev.levelStars[currentLevel.id] || 0;
      if (result.scoreEarned >= currentLevel.threeStarScore) {
        starsEarned = Math.max(starsEarned, 3);
      } else if (result.scoreEarned >= currentLevel.requiredScoreToPass) {
        starsEarned = Math.max(starsEarned, 2);
      } else if (isGoal) {
        starsEarned = Math.max(starsEarned, 1);
      }

      // Check level unlock
      const unlocked = [...prev.unlockedLevels];
      if (starsEarned >= 1 && currentLevel.id < CHALLENGE_LEVELS.length) {
        const nextId = currentLevel.id + 1;
        if (!unlocked.includes(nextId)) {
          unlocked.push(nextId);
        }
      }

      return {
        ...prev,
        totalScore: newScore,
        coins: newCoins,
        currentStreak: newStreak,
        highestStreak: newHighest,
        totalGoals: newGoals,
        totalShots: prev.totalShots + 1,
        levelStars: {
          ...prev.levelStars,
          [currentLevel.id]: starsEarned,
        },
        unlockedLevels: unlocked,
      };
    });

    if (result.isGoal) {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
      });
    }
  }, [currentLevel]);

  // Initialize Free Kick Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new FreeKickEngine(canvasMountRef.current, {
      onShotResult: handleShotResult,
      onGoalScore: (res) => console.log('GOAL scored', res),
      onPostHit: () => console.log('POST hit'),
      onWallHit: () => console.log('WALL hit'),
      onKeeperSave: () => console.log('KEEPER save'),
      onTargetHit: (pts) => console.log('TARGET hit', pts),
    });

    engine.loadLevel(currentLevel, currentSkin);
    engine.updateAimGuide(shotParams);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update aim guide whenever shot parameters change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateAimGuide(shotParams);
    }
  }, [shotParams]);

  // Update level or skin when selected
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.loadLevel(currentLevel, currentSkin);
      engineRef.current.updateAimGuide(shotParams);
    }
  }, [currentLevel, currentSkin]);

  // Shoot Action
  const handleShoot = () => {
    if (isShooting || !engineRef.current) return;
    setIsShooting(true);
    setLastResult(null);
    engineRef.current.shoot(shotParams);
  };

  // Reset ball position
  const handleResetPosition = () => {
    setLastResult(null);
    setIsShooting(false);
    if (engineRef.current) {
      engineRef.current.resetBallPosition();
      engineRef.current.updateAimGuide(shotParams);
    }
  };

  // Replay
  const handleReplay = () => {
    if (engineRef.current) {
      engineRef.current.replayLastShot();
    }
  };

  // Camera change
  const handleCameraChange = (preset: CameraPreset) => {
    setCameraPreset(preset);
    if (engineRef.current) {
      engineRef.current.setCameraPreset(preset);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Advance level
  const handleNextLevel = () => {
    setLastResult(null);
    const nextId = currentLevel.id + 1;
    if (nextId <= CHALLENGE_LEVELS.length) {
      setCurrentLevelId(nextId);
      handleResetPosition();
    }
  };

  // Daily Reward Claim
  const handleClaimDailyDay = (day: number) => {
    setProgress((prev) => {
      const reward = prev.dailyStreakCount + 1;
      let newCoins = prev.coins;
      let newBall = prev.selectedBallId;

      if (day === 1) newCoins += 250;
      else if (day === 2) newBall = 'inferno';
      else if (day === 3) newCoins += 500;
      else if (day === 4) newBall = 'cyber';
      else if (day === 5) newCoins += 800;
      else if (day === 6) newCoins += 1200;
      else if (day === 7) newBall = 'gold';

      return {
        ...prev,
        coins: newCoins,
        selectedBallId: newBall,
        dailyStreakCount: reward,
        lastDailyClaimTimestamp: Date.now(),
      };
    });
  };

  // Spin Prize Award
  const handleSpinPrizeAwarded = (prize: { label: string; type: string; value: string | number }) => {
    setProgress((prev) => {
      let coins = prev.coins;
      let ballId = prev.selectedBallId;
      if (prize.type === 'coins' && typeof prize.value === 'number') {
        coins += prize.value;
      } else if (prize.type === 'ball' && typeof prize.value === 'string') {
        ballId = prize.value;
      }
      return {
        ...prev,
        coins,
        selectedBallId: ballId,
        luckySpinAvailable: false,
        lastSpinTimestamp: Date.now(),
      };
    });
  };

  const canAdvance =
    lastResult?.isGoal === true &&
    currentLevel.id < CHALLENGE_LEVELS.length &&
    progress.unlockedLevels.includes(currentLevel.id + 1);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Three.js Isolated Canvas Ref Container (Directive 4: useRef mount) */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Top HUD Header */}
      <ScoreHeader
        level={currentLevel}
        progress={progress}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenLevels={() => setIsLevelsOpen(true)}
        onOpenDaily={() => setIsDailyOpen(true)}
        onOpenLocker={() => setIsLockerOpen(true)}
        onResetPosition={handleResetPosition}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Unified Bottom Control Dock (Directive 5: Collapsible bottom dock) */}
      <BottomControlDock
        shotParams={shotParams}
        onUpdateParams={setShotParams}
        onShoot={handleShoot}
        onReplay={handleReplay}
        onCameraChange={handleCameraChange}
        currentCamera={cameraPreset}
        isShooting={isShooting}
      />

      {/* Shot Result / Goal Celebration Overlay */}
      {lastResult && (
        <GoalCelebrationOverlay
          result={lastResult}
          level={currentLevel}
          onNextKick={handleResetPosition}
          onReplay={handleReplay}
          onNextLevel={handleNextLevel}
          canAdvanceLevel={canAdvance}
        />
      )}

      {/* Online Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserScore={progress.totalScore}
        currentUserLevel={currentLevel.id}
        currentStreak={progress.currentStreak}
        playerName={progress.playerName}
        onUpdatePlayerName={(name) => setProgress((p) => ({ ...p, playerName: name }))}
      />

      {/* Challenge Levels Modal */}
      <LevelSelectModal
        isOpen={isLevelsOpen}
        onClose={() => setIsLevelsOpen(false)}
        currentLevelId={currentLevelId}
        progress={progress}
        onSelectLevel={(lvl) => {
          setCurrentLevelId(lvl.id);
          handleResetPosition();
        }}
      />

      {/* Daily Rewards & Lucky Spin Modal */}
      <DailyRewardModal
        isOpen={isDailyOpen}
        onClose={() => setIsDailyOpen(false)}
        progress={progress}
        onClaimDailyDay={handleClaimDailyDay}
        onSpinPrizeAwarded={handleSpinPrizeAwarded}
      />

      {/* Locker Room (Balls / Customization) Modal */}
      <LockerRoomModal
        isOpen={isLockerOpen}
        onClose={() => setIsLockerOpen(false)}
        progress={progress}
        onSelectBallSkin={(skinId) => setProgress((p) => ({ ...p, selectedBallId: skinId }))}
      />
    </div>
  );
}
