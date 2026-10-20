import React, { useState } from 'react';
import { X, Calendar, Gift, Sparkles, Check, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProgress } from '../../types/game';
import { DAILY_REWARDS } from '../../game/levels';
import { sound } from '../../game/audio';

interface DailyRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress;
  onClaimDailyDay: (day: number) => void;
  onSpinPrizeAwarded: (prize: { label: string; type: string; value: string | number }) => void;
}

const SPIN_PRIZES = [
  { label: '100 Xu', type: 'coins', value: 100, color: '#3b82f6', text: '#fff' },
  { label: '250 Xu', type: 'coins', value: 250, color: '#10b981', text: '#fff' },
  { label: '500 Xu', type: 'coins', value: 500, color: '#f59e0b', text: '#000' },
  { label: 'Bóng Inferno', type: 'ball', value: 'inferno', color: '#ef4444', text: '#fff' },
  { label: '1000 Xu', type: 'coins', value: 1000, color: '#8b5cf6', text: '#fff' },
  { label: 'X2 Điểm Trận Kế', type: 'buff', value: 'x2_multiplier', color: '#ec4899', text: '#fff' },
];

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  isOpen,
  onClose,
  progress,
  onClaimDailyDay,
  onSpinPrizeAwarded,
}) => {
  const [activeTab, setActiveTab] = useState<'streak' | 'wheel'>('streak');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStreakDay = Math.min(7, (progress.dailyStreakCount % 7) + 1);
  const canClaimToday = Date.now() - progress.lastDailyClaimTimestamp > 20 * 60 * 60 * 1000 || progress.lastDailyClaimTimestamp === 0;

  // Spin Wheel function
  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonPrize(null);

    // Pick random prize
    const prizeIndex = Math.floor(Math.random() * SPIN_PRIZES.length);
    const targetPrize = SPIN_PRIZES[prizeIndex];

    // Compute rotation angle (3 to 5 full spins + slice angle)
    const sliceAngle = 360 / SPIN_PRIZES.length;
    // Align sector to pointer at the top (angle 0)
    const prizeAngle = 360 - (prizeIndex * sliceAngle + sliceAngle / 2);
    const fullSpins = 360 * 5;
    const finalAngle = wheelRotation + fullSpins + (prizeAngle - (wheelRotation % 360));

    setWheelRotation(finalAngle);

    // Sound effect
    sound.playWhoosh();

    setTimeout(() => {
      setIsSpinning(false);
      setWonPrize(targetPrize.label);
      sound.playCoin();
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.6 },
      });
      onSpinPrizeAwarded(targetPrize);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wider text-white uppercase leading-none">
                Phần Thưởng Hàng Ngày
              </h2>
              <p className="text-xs text-slate-400">Điểm danh 7 ngày & Vòng quay may mắn nhận xu, bóng độc quyền</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('streak')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'streak'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Điểm Danh 7 Ngày</span>
          </button>

          <button
            onClick={() => setActiveTab('wheel')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'wheel'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vòng Quay May Mắn</span>
          </button>

          <div className="ml-auto flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{progress.coins.toLocaleString()} Xu</span>
          </div>
        </div>

        {/* Content Tab 1: 7-Day Streak */}
        {activeTab === 'streak' && (
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Chuỗi điểm danh hiện tại</span>
                <p className="font-display text-xl font-bold text-emerald-400 leading-none">
                  {progress.dailyStreakCount} NGÀY LIÊN TIẾP
                </p>
              </div>
              {canClaimToday ? (
                <button
                  onClick={() => {
                    sound.playCoin();
                    confetti({ particleCount: 50, spread: 60 });
                    onClaimDailyDay(currentStreakDay);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Nhận Quà Ngày {currentStreakDay}</span>
                </button>
              ) : (
                <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  Đã nhận quà hôm nay ✓
                </div>
              )}
            </div>

            {/* 7 Days Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAILY_REWARDS.map((item) => {
                const isClaimed = item.day < currentStreakDay || (item.day === currentStreakDay && !canClaimToday);
                const isCurrent = item.day === currentStreakDay && canClaimToday;

                return (
                  <div
                    key={item.day}
                    className={`rounded-xl border p-3 flex flex-col justify-between text-center transition-all ${
                      item.day === 7 ? 'col-span-2 sm:col-span-2' : ''
                    } ${
                      isCurrent
                        ? 'bg-emerald-500/20 border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-lg'
                        : isClaimed
                        ? 'bg-slate-800/30 border-slate-800 opacity-60'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1">
                        <span>Ngày {item.day}</span>
                        {isClaimed && <span className="text-emerald-400 font-bold">✓ Đã nhận</span>}
                      </div>

                      <div className="py-2 text-2xl">
                        {item.rewardType === 'ball' ? (item.day === 7 ? '🏆' : '⚽') : '💰'}
                      </div>

                      <p className="font-bold text-xs text-white leading-tight">{item.title}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-700/40 text-[10px] text-slate-400">
                      {item.rewardType === 'ball' ? 'Mở khóa bóng' : `+${item.amount} xu`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Tab 2: Lucky Spin Wheel */}
        {activeTab === 'wheel' && (
          <div className="overflow-y-auto flex-1 p-5 flex flex-col items-center justify-center">
            {/* Pointer Pin at top */}
            <div className="relative mb-2 z-10">
              <div className="w-0 h-0 border-x-8 border-x-transparent border-t-[16px] border-t-amber-400 drop-shadow-md" />
            </div>

            {/* Spinning Wheel */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              <div
                className="w-full h-full rounded-full border-4 border-slate-700 shadow-2xl relative overflow-hidden transition-transform duration-[4000ms] ease-[cubic-bezier(0.15,0.9,0.25,1)]"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                {/* SVG Segments */}
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {SPIN_PRIZES.map((prize, idx) => {
                    const total = SPIN_PRIZES.length;
                    const angle = 360 / total;
                    const startAngle = idx * angle;
                    const endAngle = (idx + 1) * angle;

                    const rad1 = ((startAngle - 90) * Math.PI) / 180;
                    const rad2 = ((endAngle - 90) * Math.PI) / 180;

                    const x1 = 50 + 50 * Math.cos(rad1);
                    const y1 = 50 + 50 * Math.sin(rad1);
                    const x2 = 50 + 50 * Math.cos(rad2);
                    const y2 = 50 + 50 * Math.sin(rad2);

                    const midRad = (((startAngle + endAngle) / 2 - 90) * Math.PI) / 180;
                    const textX = 50 + 32 * Math.cos(midRad);
                    const textY = 50 + 32 * Math.sin(midRad);

                    return (
                      <g key={idx}>
                        <path
                          d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                          fill={prize.color}
                          stroke="#0f172a"
                          strokeWidth="1"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill={prize.text}
                          fontSize="4"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${((startAngle + endAngle) / 2) + 90}, ${textX}, ${textY})`}
                        >
                          {prize.label}
                        </text>
                      </g>
                    );
                  })}
                  {/* Wheel Hub Center */}
                  <circle cx="50" cy="50" r="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Spin Result Banner */}
            {wonPrize && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm animate-bounce">
                🎉 Chúc mừng! Bạn trúng: {wonPrize}!
              </div>
            )}

            {/* Spin Action Button */}
            <div className="mt-4">
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className={`px-8 py-3 rounded-2xl font-display text-xl font-bold tracking-wider uppercase transition-all shadow-xl active:scale-95 cursor-pointer flex items-center gap-2 ${
                  isSpinning
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30'
                }`}
              >
                <Sparkles className="w-5 h-5 fill-current" />
                <span>{isSpinning ? 'Đang quay...' : 'QUAY NGAY (Miễn phí)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
