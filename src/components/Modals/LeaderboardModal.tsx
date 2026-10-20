import React, { useState, useEffect } from 'react';
import { X, Trophy, Medal, User, Flame, Send, Check } from 'lucide-react';
import { LeaderboardEntry } from '../../types/game';
import { sound } from '../../game/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserScore: number;
  currentUserLevel: number;
  currentStreak: number;
  playerName: string;
  onUpdatePlayerName: (newName: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserScore,
  currentUserLevel,
  currentStreak,
  playerName,
  onUpdatePlayerName,
}) => {
  const [filter, setFilter] = useState<'all' | 'daily'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customName, setCustomName] = useState(playerName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, filter]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard) {
          setEntries(data.leaderboard);
        }
      }
    } catch (err) {
      console.warn('Using local leaderboard fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setIsSubmitting(true);
    onUpdatePlayerName(customName.trim());

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: customName.trim(),
          score: currentUserScore,
          level: currentUserLevel,
          streak: currentStreak,
          accuracy: 88,
          curveStyle: 'Vòng Cung Chuối',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedSuccess(true);
        sound.playCoin();
        if (data.leaderboard) {
          setEntries(data.leaderboard);
        }
        setTimeout(() => setSubmittedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Submit score failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wider text-white uppercase leading-none">
                Bảng Xếp Hạng Trực Tuyến
              </h2>
              <p className="text-xs text-slate-400">So tài cao thủ sút phạt hàng rào toàn cầu</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Toàn Cầu (All-Time)
            </button>
            <button
              onClick={() => setFilter('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'daily'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Hôm Nay (Daily)
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Điểm hiện tại: <strong className="text-amber-400">{currentUserScore.toLocaleString()}</strong>
          </span>
        </div>

        {/* Submitting Profile / Nickname Bar */}
        <form onSubmit={handleSubmitScore} className="px-5 py-2.5 bg-slate-800/40 border-b border-slate-800 flex items-center gap-2">
          <User className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            maxLength={18}
            placeholder="Nhập tên của bạn..."
            className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 flex-1 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              submittedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950'
            }`}
          >
            {submittedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã ghi danh!</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Ghi danh</span>
              </>
            )}
          </button>
        </form>

        {/* Leaderboard Table List */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-5 space-y-2">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Đang tải bảng xếp hạng trực tuyến...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Chưa có dữ liệu bảng xếp hạng hôm nay. Hãy là người đầu tiên ghi điểm!
            </div>
          ) : (
            entries.map((entry, index) => {
              const rank = entry.rank || index + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;
              const isCurrent =
                entry.isCurrentUser || entry.playerName.toLowerCase() === playerName.toLowerCase();

              return (
                <div
                  key={entry.id || index}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isTop1
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30'
                          : isTop2
                          ? 'bg-slate-300 text-slate-950'
                          : isTop3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : rank}
                    </div>

                    {/* Player Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isCurrent ? 'text-amber-400' : 'text-white'}`}>
                          {entry.playerName}
                        </span>
                        {entry.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {entry.badge}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                            BẠN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span>Cấp {entry.level}</span>
                        <span>•</span>
                        <span>Độ chuẩn: {entry.accuracy}%</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-rose-400 font-semibold">
                          <Flame className="w-3 h-3" /> {entry.streak} trận
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="font-display text-xl sm:text-2xl font-bold text-amber-400 block leading-none">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">{entry.curveStyle}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 text-center text-xs text-slate-400 bg-slate-950/40">
          Ghi càng nhiều bàn thắng siêu phẩm góc chữ A và duy trì chuỗi thắng để thăng hạng!
        </div>
      </div>
    </div>
  );
};
