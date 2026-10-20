import React from 'react';
import { Volume2, VolumeX, Trophy, Calendar, Award, Compass, RefreshCw } from 'lucide-react';
import { ChallengeLevel, UserProgress } from '../../types/game';
import { sound } from '../../game/audio';

interface ScoreHeaderProps {
  level: ChallengeLevel;
  progress: UserProgress;
  onOpenLeaderboard: () => void;
  onOpenLevels: () => void;
  onOpenDaily: () => void;
  onOpenLocker: () => void;
  onResetPosition: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ScoreHeader: React.FC<ScoreHeaderProps> = ({
  level,
  progress,
  onOpenLeaderboard,
  onOpenLevels,
  onOpenDaily,
  onOpenLocker,
  onResetPosition,
  isMuted,
  onToggleMute,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 md:p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: App Title & Current Level badge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-xl backdrop-blur-md flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-black text-slate-950 text-xl font-display shadow-md">
              ⚽
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl tracking-wider font-bold text-white uppercase leading-none">
                  Vua Đá Phạt 3D
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {level.name.split(':')[0]}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Khoảng cách: <span className="text-amber-400 font-bold">{level.distance}m</span> | Rào: <span className="text-sky-400 font-bold">{level.wallCount} người</span>
              </p>
            </div>
          </div>

          {/* Quick Level Selector Button */}
          <button
            onClick={onOpenLevels}
            className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-white rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
            title="Đổi cấp độ thử thách"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Cấp độ</span>
          </button>
        </div>

        {/* Center: Score, Streak, & Wind Widget */}
        <div className="flex items-center gap-2 sm:gap-4 pointer-events-auto">
          {/* Total Score & Streak */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-1.5 shadow-xl flex items-center gap-4">
            <div className="text-center">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Điểm số</span>
              <span className="font-display text-2xl font-bold text-amber-400 leading-none">
                {progress.totalScore.toLocaleString()}
              </span>
            </div>

            <div className="w-[1px] h-7 bg-slate-700" />

            <div className="text-center">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Chuỗi</span>
              <div className="flex items-center justify-center gap-1">
                <span className="font-display text-2xl font-bold text-rose-400 leading-none">
                  🔥 {progress.currentStreak}
                </span>
                {progress.currentStreak >= 3 && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500 text-white font-bold">
                    x{progress.currentStreak >= 5 ? '3' : '2'}
                  </span>
                )}
              </div>
            </div>

            <div className="w-[1px] h-7 bg-slate-700" />

            {/* Wind widget */}
            <div className="text-center">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Gió</span>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-sky-300">
                <span>{level.windSpeed > 0 ? `${level.windSpeed}m/s` : 'Lặng gió'}</span>
                {level.windSpeed > 0 && (
                  <span
                    className="inline-block transform font-black text-amber-400"
                    style={{ transform: `rotate(${level.windDirection}deg)` }}
                    title={`Hướng gió: ${level.windDirection}°`}
                  >
                    ↑
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Modals Navigation & Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Reset position button */}
          <button
            onClick={onResetPosition}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            title="Đặt lại bóng"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Leaderboard button */}
          <button
            onClick={onOpenLeaderboard}
            className="bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-400 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">BXH Online</span>
          </button>

          {/* Daily Reward & Lucky Spin button with notification dot */}
          <button
            onClick={onOpenDaily}
            className="relative bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Quà Ngày</span>
            {progress.luckySpinAvailable && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-slate-900" />
            )}
          </button>

          {/* Locker Room (Balls / Skins) */}
          <button
            onClick={onOpenLocker}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
          >
            <Award className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Phòng Đồ</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
