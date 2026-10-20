import React from 'react';
import { X, Star, Lock, Wind, Users, Shield, Play } from 'lucide-react';
import { ChallengeLevel, UserProgress } from '../../types/game';
import { CHALLENGE_LEVELS } from '../../game/levels';
import { sound } from '../../game/audio';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevelId: number;
  progress: UserProgress;
  onSelectLevel: (level: ChallengeLevel) => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  currentLevelId,
  progress,
  onSelectLevel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wider text-white uppercase leading-none">
              Thử Thách Cấp Độ Khó Tăng Dần
            </h2>
            <p className="text-xs text-slate-400">Vượt qua các hàng rào thép và thủ môn đẳng cấp thế giới</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Levels Grid */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {CHALLENGE_LEVELS.map((lvl) => {
            const isUnlocked = progress.unlockedLevels.includes(lvl.id);
            const isSelected = lvl.id === currentLevelId;
            const stars = progress.levelStars[lvl.id] || 0;

            return (
              <div
                key={lvl.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between transition-all relative ${
                  !isUnlocked
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : isSelected
                    ? 'bg-slate-800/90 border-amber-500/80 ring-2 ring-amber-500/30 shadow-xl'
                    : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                }`}
              >
                {/* Top Badge: Level ID & Stars */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-lg font-bold text-amber-400">
                      CẤP {lvl.id}
                    </span>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            starIdx <= stars
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Level Name & Subtitle */}
                  <h3 className="font-bold text-sm text-white leading-tight mb-1">{lvl.name.split(':')[1]?.trim() || lvl.name}</h3>
                  <p className="text-xs text-slate-400 mb-3">{lvl.subtitle}</p>

                  {/* Specs Pill List */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between bg-slate-900/60 rounded-lg px-2.5 py-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        🎯 Cự ly
                      </span>
                      <strong className="text-amber-300">{lvl.distance} mét</strong>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900/60 rounded-lg px-2.5 py-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-sky-400" /> Hàng rào
                      </span>
                      <strong>{lvl.wallCount > 0 ? `${lvl.wallCount} người nhảy` : 'Trống'}</strong>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900/60 rounded-lg px-2.5 py-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" /> Thủ môn
                      </span>
                      <span className="uppercase text-[10px] font-bold text-emerald-400">
                        {lvl.keeperSkill}
                      </span>
                    </div>

                    {lvl.windSpeed > 0 && (
                      <div className="flex items-center justify-between bg-slate-900/60 rounded-lg px-2.5 py-1">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Wind className="w-3 h-3 text-cyan-400" /> Sức gió
                        </span>
                        <strong className="text-cyan-300">{lvl.windSpeed} m/s</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        sound.playCoin();
                        onSelectLevel(lvl);
                        onClose();
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isSelected ? 'Đang Chơi' : 'Chọn Cấp Này'}</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl text-xs font-medium text-slate-500 bg-slate-900/80 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cần vượt Cấp {lvl.id - 1}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Level Tips Banner */}
        <div className="px-5 py-3 border-t border-slate-800 text-xs text-amber-300 bg-amber-500/10 flex items-center gap-2">
          <span>💡</span>
          <span>Mẹo sút: Càng lên cấp cao, gió và hàng rào càng khép góc, hãy dùng độ xoáy Magnus để uốn cong quỹ đạo bóng!</span>
        </div>
      </div>
    </div>
  );
};
