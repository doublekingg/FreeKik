import React from 'react';
import { Play, RotateCcw, ArrowRight, Award, Flame, Target } from 'lucide-react';
import { ShotResult, ChallengeLevel } from '../../types/game';

interface GoalCelebrationOverlayProps {
  result: ShotResult;
  level: ChallengeLevel;
  onNextKick: () => void;
  onReplay: () => void;
  onNextLevel?: () => void;
  canAdvanceLevel: boolean;
}

export const GoalCelebrationOverlay: React.FC<GoalCelebrationOverlayProps> = ({
  result,
  level,
  onNextKick,
  onReplay,
  onNextLevel,
  canAdvanceLevel,
}) => {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl backdrop-blur-md pointer-events-auto">
        {/* Main Badge / Icon */}
        <div className="mb-2">
          {result.isGoal ? (
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/30">
              <span className="text-3xl">⚽</span>
            </div>
          ) : result.isPost ? (
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <span className="text-3xl">🥅</span>
            </div>
          ) : result.isSaved ? (
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <span className="text-3xl">🧤</span>
            </div>
          ) : (
            <div className="inline-flex p-3 rounded-2xl bg-slate-800 text-slate-300">
              <span className="text-3xl">💨</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-wider uppercase leading-none mb-1">
          {result.isGoal ? (
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              {result.topCornerBonus ? 'GÓC CHỮ A ĐỈNH CAO!' : 'VÀOOOOOOOO!'}
            </span>
          ) : (
            <span className="text-slate-200">{result.message}</span>
          )}
        </h2>

        {result.isGoal && (
          <p className="text-xs text-amber-300 font-semibold mb-4">
            {result.topCornerBonus ? 'Cú sút hoàn hảo cắm thẳng góc chết khung thành!' : 'Bóng lách qua hàng rào tung lưới đối phương!'}
          </p>
        )}

        {/* Score & Shot Stats Card */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 my-4 space-y-2 text-xs">
          {result.scoreEarned > 0 && (
            <div className="flex items-center justify-between py-1 border-b border-slate-700/60">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Award className="w-4 h-4 text-amber-400" /> Điểm ghi được
              </span>
              <span className="font-display text-2xl font-bold text-amber-400">
                +{result.scoreEarned.toLocaleString()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-left pt-1">
            <div className="bg-slate-900/60 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Cự ly sút</span>
              <strong className="text-sm text-white font-mono">{result.distanceMeters} mét</strong>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Tốc độ bóng</span>
              <strong className="text-sm text-emerald-400 font-mono">{result.speedKmh} km/h</strong>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Độ cuộn xoáy</span>
              <strong className="text-sm text-sky-400 font-mono">{result.curveRating}% Magnus</strong>
            </div>

            <div className="bg-slate-900/60 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Thử thách</span>
              <strong className="text-sm text-amber-300 font-mono">Cấp {level.id}</strong>
            </div>
          </div>

          {result.isTargetHit && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-yellow-300 bg-yellow-500/10 py-1.5 rounded-lg border border-yellow-500/20 font-bold">
              <Target className="w-4 h-4 text-yellow-400" />
              <span>Trúng hồng tâm góc chết: +{result.targetHitPoints} điểm!</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-5">
          <div className="flex gap-2">
            {/* Replay Slow-Mo Button */}
            <button
              onClick={onReplay}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-sky-400" />
              <span>Quay Chậm</span>
            </button>

            {/* Next Kick Button */}
            <button
              onClick={onNextKick}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display text-lg font-bold tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>SÚT TIẾP</span>
            </button>
          </div>

          {/* Advance to next level if unlocked */}
          {canAdvanceLevel && onNextLevel && (
            <button
              onClick={onNextLevel}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>VƯỢT CẤP! THỬ THÁCH CẤP {level.id + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
