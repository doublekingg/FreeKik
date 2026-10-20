import React from 'react';
import { X, Award, Check, Lock, Sparkles } from 'lucide-react';
import { BallSkin, UserProgress } from '../../types/game';
import { BALL_SKINS } from '../../game/levels';
import { sound } from '../../game/audio';

interface LockerRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress;
  onSelectBallSkin: (skinId: string) => void;
}

export const LockerRoomModal: React.FC<LockerRoomModalProps> = ({
  isOpen,
  onClose,
  progress,
  onSelectBallSkin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wider text-white uppercase leading-none">
                Phòng Thay Đồ & Bộ Sưu Tập Bóng
              </h2>
              <p className="text-xs text-slate-400">Tùy chỉnh quả bóng thi đấu với các hiệu ứng vệt sáng đặc biệt</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balls Grid */}
        <div className="overflow-y-auto flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {BALL_SKINS.map((skin) => {
            const isSelected = skin.id === progress.selectedBallId;
            // A skin is unlocked if it's default unlocked, or user completed daily reward / stars
            const isUnlocked =
              skin.unlocked ||
              (skin.unlockedByDaily && progress.dailyStreakCount >= skin.unlockedByDaily) ||
              (skin.requiredStars &&
                Object.values(progress.levelStars).reduce((a, b) => a + b, 0) >= skin.requiredStars);

            return (
              <div
                key={skin.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30 shadow-xl'
                    : isUnlocked
                    ? 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800/80'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ball Preview Circle */}
                  <div
                    className="w-14 h-14 rounded-full border-2 border-white/40 shadow-lg flex items-center justify-center shrink-0 text-2xl relative overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${skin.primaryColor}, ${skin.secondaryColor})`,
                    }}
                  >
                    {skin.pattern === 'gold' && '🏆'}
                    {skin.pattern === 'inferno' && '🔥'}
                    {skin.pattern === 'cyber' && '⚡'}
                    {skin.pattern === 'stars' && '⭐'}
                    {skin.pattern === 'classic' && '⚽'}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{skin.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-400 text-slate-950 font-bold rounded">
                          ĐANG CHỌN
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{skin.description}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50">
                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        sound.playCoin();
                        onSelectBallSkin(skin.id);
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Đang Sử Dụng' : 'Trang Bị Bóng Này'}</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl text-xs text-slate-500 bg-slate-900/80 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {skin.unlockedByDaily
                          ? `Điểm danh Ngày ${skin.unlockedByDaily}`
                          : `Đạt ${skin.requiredStars} sao thử thách`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 text-center text-xs text-slate-400 bg-slate-950/40">
          Quả bóng có vệt quỹ đạo tương ứng khi bay qua hàng rào cầu thủ.
        </div>
      </div>
    </div>
  );
};
