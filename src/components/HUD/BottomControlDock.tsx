import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Zap,
  RotateCw,
  Video,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ShotParameters, SpinVector } from '../../types/game';
import { CameraPreset } from '../../game/SoccerEngine';
import { sound } from '../../game/audio';

interface BottomControlDockProps {
  shotParams: ShotParameters;
  onUpdateParams: (newParams: ShotParameters) => void;
  onShoot: () => void;
  onReplay: () => void;
  onCameraChange: (preset: CameraPreset) => void;
  currentCamera: CameraPreset;
  isShooting: boolean;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  shotParams,
  onUpdateParams,
  onShoot,
  onReplay,
  onCameraChange,
  currentCamera,
  isShooting,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'aim_power' | 'spin' | 'camera'>('aim_power');
  const [isCharging, setIsCharging] = useState(false);
  const chargeIntervalRef = useRef<number | null>(null);

  // Keyboard shortcut: Spacebar to shoot, H to toggle dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' && !isShooting) {
        e.preventDefault();
        onShoot();
      } else if (e.code === 'KeyH') {
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShooting, onShoot]);

  // Press & Hold charging power mechanism
  const startCharging = () => {
    if (isShooting) return;
    setIsCharging(true);
    let currentPower = 10;
    let direction = 1;

    chargeIntervalRef.current = window.setInterval(() => {
      currentPower += direction * 3.5;
      if (currentPower >= 100) {
        currentPower = 100;
        direction = -1;
      } else if (currentPower <= 10) {
        currentPower = 10;
        direction = 1;
      }
      onUpdateParams({ ...shotParams, power: Math.round(currentPower) });
    }, 28);
  };

  const stopCharging = () => {
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    setIsCharging(false);
    onShoot();
  };

  // Spin Pad Touch/Drag interaction
  const spinPadRef = useRef<HTMLDivElement>(null);

  const handleSpinInteraction = (clientX: number, clientY: number) => {
    if (!spinPadRef.current) return;
    const rect = spinPadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2 - 6;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    // Normalized coordinates (-1 to 1)
    // dx < 0 (left hit) -> clockwise spin -> curve right (positive spin.y)
    // dx > 0 (right hit) -> counter-clockwise spin -> curve left (negative spin.y)
    const normX = dx / maxRadius;
    const normY = dy / maxRadius;

    // spin.y: negative = curve left, positive = curve right
    const spinY = -normX;
    // spin.x: negative = loft/backspin, positive = topspin dip
    const spinX = -normY;

    onUpdateParams({
      ...shotParams,
      spin: {
        x: parseFloat(spinX.toFixed(2)),
        y: parseFloat(spinY.toFixed(2)),
      },
    });
  };

  // Spin presets
  const applySpinPreset = (preset: 'beckham' | 'carlos' | 'knuckle' | 'straight') => {
    let spin: SpinVector;
    if (preset === 'beckham') {
      // High left curve
      spin = { x: 0.15, y: 0.85 };
    } else if (preset === 'carlos') {
      // Extreme outside curve
      spin = { x: 0.25, y: -0.95 };
    } else if (preset === 'knuckle') {
      // Topspin dip
      spin = { x: 0.9, y: 0.05 };
    } else {
      // Straight shot
      spin = { x: 0, y: 0 };
    }
    onUpdateParams({ ...shotParams, spin });
  };

  // Convert spin values to crosshair position on the 2D ball
  const padSize = 130;
  const crosshairX = padSize / 2 - shotParams.spin.y * (padSize / 2 - 12);
  const crosshairY = padSize / 2 - shotParams.spin.x * (padSize / 2 - 12);

  return (
    <div
      className={`fixed bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-[940px] px-3 transition-transform duration-300 ease-out ${
        isCollapsed ? 'translate-y-[calc(100%-42px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse/Expand Tab Button pinned to top edge */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 border-b-0 rounded-t-xl px-5 py-1.5 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer backdrop-blur-md"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Hiện Bảng Điều Khiển (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Ẩn Bảng Điều Khiển (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 md:p-4 text-white">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('aim_power')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'aim_power'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Góc & Lực Sút</span>
            </button>

            <button
              onClick={() => setActiveTab('spin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'spin'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Độ Xoáy Magnus</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'camera'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Góc Máy Quay</span>
            </button>
          </div>

          {/* Quick Replay button */}
          <button
            onClick={onReplay}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
            title="Xem lại pha quay chậm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Quay chậm</span>
          </button>
        </div>

        {/* Tab 1: Aim & Power */}
        {activeTab === 'aim_power' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-center">
            {/* Horizontal Aim */}
            <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-400 font-medium">Hướng sút (Trái / Phải)</span>
                <span className="font-mono font-bold text-amber-400">
                  {shotParams.aimAngleX > 0 ? `+${shotParams.aimAngleX}° Phải` : shotParams.aimAngleX < 0 ? `${shotParams.aimAngleX}° Trái` : '0° Thẳng'}
                </span>
              </div>
              <input
                type="range"
                min="-25"
                max="25"
                step="0.5"
                value={shotParams.aimAngleX}
                onChange={(e) =>
                  onUpdateParams({ ...shotParams, aimAngleX: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>◀ Cột trái</span>
                <span>Chính giữa</span>
                <span>Cột phải ▶</span>
              </div>
            </div>

            {/* Elevation Angle */}
            <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-400 font-medium">Góc nâng (Độ bổng)</span>
                <span className="font-mono font-bold text-sky-400">{shotParams.aimAngleY}°</span>
              </div>
              <input
                type="range"
                min="9"
                max="32"
                step="0.5"
                value={shotParams.aimAngleY}
                onChange={(e) =>
                  onUpdateParams({ ...shotParams, aimAngleY: parseFloat(e.target.value) })
                }
                className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Sút chìm (10°)</span>
                <span>Qua rào (18°)</span>
                <span>Bổng cao (30°)</span>
              </div>
            </div>

            {/* Power Slider */}
            <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-rose-400" /> Lực sút
                </span>
                <span className="font-mono font-bold text-rose-400">{shotParams.power}%</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={shotParams.power}
                  onChange={(e) =>
                    onUpdateParams({ ...shotParams, power: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Nhẹ nhàng</span>
                <span className="text-emerald-400 font-semibold">Tối ưu (75%)</span>
                <span>Hết lực</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Spin & Curve (Magnus effect) */}
        {activeTab === 'spin' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Interactive 2D Spin Ball Pad */}
            <div className="flex items-center gap-4">
              <div
                ref={spinPadRef}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleSpinInteraction(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (e.buttons > 0) handleSpinInteraction(e.clientX, e.clientY);
                }}
                style={{ width: padSize, height: padSize }}
                className="relative rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border-2 border-sky-400/60 shadow-inner cursor-crosshair flex items-center justify-center shrink-0"
                title="Chạm vào bóng để chọn điểm tiếp xúc chân (tạo độ xoáy)"
              >
                {/* Visual guidelines */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-slate-600/60 -translate-y-1/2" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-600/60 -translate-x-1/2" />
                <div className="absolute inset-3 rounded-full border border-dashed border-slate-600/40" />

                {/* Soccer seams pattern simulation */}
                <div className="w-8 h-8 rounded-full border border-slate-500/40" />

                {/* Strike Point Crosshair Dot */}
                <div
                  className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 border-2 border-white shadow-lg pointer-events-none transition-transform"
                  style={{ left: crosshairX, top: crosshairY }}
                />
              </div>

              {/* Explanatory labels */}
              <div className="text-xs space-y-1">
                <p className="font-bold text-sky-300">Điểm tiếp xúc bóng:</p>
                <p className="text-slate-400 text-[11px]">
                  • Chạm bên trái → Bóng cuộn xoáy sang phải.
                </p>
                <p className="text-slate-400 text-[11px]">
                  • Chạm bên phải → Cú Trivela xoáy sang trái.
                </p>
                <p className="text-slate-400 text-[11px]">
                  • Chạm đỉnh bóng → Topspin chúi xuống nhanh.
                </p>
                <div className="pt-1 flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-amber-400">
                    Xoáy ngang: {Math.round(shotParams.spin.y * 100)}%
                  </span>
                  <span className="text-emerald-400">
                    Xoáy dọc: {Math.round(shotParams.spin.x * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Spin Presets */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <button
                onClick={() => applySpinPreset('beckham')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-300 transition-all text-left"
              >
                🍌 Vòng Cung Beckham
                <span className="block text-[10px] text-slate-400 font-normal">Xoáy cuộn lòng trong</span>
              </button>

              <button
                onClick={() => applySpinPreset('carlos')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-rose-300 transition-all text-left"
              >
                ⚡ Trivela Roberto Carlos
                <span className="block text-[10px] text-slate-400 font-normal">Xoáy mu bàn chân má ngoài</span>
              </button>

              <button
                onClick={() => applySpinPreset('knuckle')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-emerald-300 transition-all text-left"
              >
                🍃 Lá Bàng Rơi Juninho
                <span className="block text-[10px] text-slate-400 font-normal">Topspin chúi hiểm</span>
              </button>

              <button
                onClick={() => applySpinPreset('straight')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all text-left"
              >
                🎯 Cú Nã Đại Bác Thẳng
                <span className="block text-[10px] text-slate-400 font-normal">Không xoáy, lực tối đa</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Camera Presets */}
        {activeTab === 'camera' && (
          <div className="flex flex-wrap items-center justify-center gap-3 py-1">
            <button
              onClick={() => onCameraChange('striker')}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                currentCamera === 'striker'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span>🎯 Góc Sút Cầu Thủ (Sau bóng)</span>
            </button>

            <button
              onClick={() => onCameraChange('broadcast')}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                currentCamera === 'broadcast'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span>📺 Truyền Hình Khán Đài (Toàn cảnh)</span>
            </button>

            <button
              onClick={() => onCameraChange('goal')}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                currentCamera === 'goal'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span>🥅 Khung Thành (Góc nhìn thủ môn)</span>
            </button>
          </div>
        )}

        {/* Bottom Action Strip: Big Shoot Button + Charge Button */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          {/* Quick info specs */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-400">
            <span>
              Hướng: <strong className="text-white">{shotParams.aimAngleX}°</strong>
            </span>
            <span>
              Bổng: <strong className="text-white">{shotParams.aimAngleY}°</strong>
            </span>
            <span>
              Lực: <strong className="text-white">{shotParams.power}%</strong>
            </span>
            <span className="text-[11px] text-slate-500">Phím tắt: [Dấu Cách]</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Hold to charge button */}
            <button
              onPointerDown={startCharging}
              onPointerUp={stopCharging}
              onPointerLeave={() => {
                if (isCharging) stopCharging();
              }}
              disabled={isShooting}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border text-xs font-bold transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 ${
                isCharging
                  ? 'bg-rose-600 text-white border-rose-400 scale-95 shadow-lg shadow-rose-900/50'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 active:scale-95'
              }`}
              title="Nhấn và giữ để nạp lực, thả tay ra để sút"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{isCharging ? `Đang Nạp: ${shotParams.power}%` : 'Giữ Để Nạp Lực'}</span>
            </button>

            {/* Instant Shoot Button */}
            <button
              onClick={onShoot}
              disabled={isShooting}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold font-display text-lg tracking-wider transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                isShooting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/25 cursor-pointer'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>SÚT PHẠT!</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
