import React from 'react';
import { Volume2, VolumeX, Sparkles, BarChart2 } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderHUDProps {
  coins: number;
  emeralds: number;
  depth: number;
  biomeName: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenForge: () => void;
  onOpenStats: () => void;
  activePickaxesCount: number;
  maxActivePickaxes: number;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  coins,
  emeralds,
  depth,
  biomeName,
  isMuted,
  onToggleMute,
  onOpenForge,
  onOpenStats,
  activePickaxesCount,
  maxActivePickaxes,
}) => {
  return (
    <header className="w-full flex items-center justify-between px-3 md:px-5 py-2.5 bg-[#141418] border-b border-[#26262B] select-none z-20">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-2">
        <span className="text-sm md:text-base font-bold tracking-tight text-amber-400 font-mono">
          CRAFT & DROP
        </span>
      </div>

      {/* Zone 2: Live Resource Counters & Depth */}
      <div className="flex items-center gap-2.5 sm:gap-4 md:gap-5 text-xs font-mono">
        {/* Depth Badge */}
        <div className="flex items-center gap-1 text-slate-300">
          <span className="text-slate-400">Глубина:</span>
          <span className="font-bold text-white tabular-nums">{depth}m</span>
        </div>

        {/* Pickaxes in shaft indicator */}
        <div className="hidden sm:flex items-center gap-1 text-slate-300 bg-[#1D1D26] px-2 py-0.5 rounded border border-[#2D2D3B]">
          <span className="text-slate-400">Кирки:</span>
          <span
            className={`font-bold tabular-nums ${
              activePickaxesCount >= maxActivePickaxes ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {activePickaxesCount}/{maxActivePickaxes}
          </span>
        </div>

        {/* Coins Counter */}
        <div className="flex items-center gap-1 text-amber-300">
          <span className="text-base leading-none">🪙</span>
          <span className="font-bold tabular-nums">
            {coins >= 1000000
              ? `${(coins / 1000000).toFixed(2)}M`
              : coins >= 10000
              ? `${(coins / 1000).toFixed(1)}k`
              : coins.toLocaleString()}
          </span>
        </div>

        {/* Emeralds Counter */}
        <div className="flex items-center gap-1 text-emerald-400">
          <span className="text-base leading-none">💎</span>
          <span className="font-bold tabular-nums">{emeralds.toLocaleString()}</span>
        </div>
      </div>

      {/* Zone 3: Primary Actions (Forge, Sound, Stats) */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Forge / Upgrades Button */}
        <button
          onClick={onOpenForge}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B45309] hover:bg-[#D97706] active:scale-95 text-white font-semibold text-xs rounded border border-[#F59E0B] shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Кузница</span>
        </button>

        {/* Stats Button */}
        <button
          onClick={onOpenStats}
          className="p-1.5 rounded bg-[#1C1C22] hover:bg-[#25252F] text-slate-400 hover:text-slate-200 border border-[#2B2B36] transition-colors"
          title="Статистика и сброс прогресса"
        >
          <BarChart2 className="w-4 h-4" />
        </button>

        {/* Sound Mute Toggle */}
        <button
          onClick={() => {
            onToggleMute();
            sound.playHit('dirt');
          }}
          className="p-1.5 rounded bg-[#1C1C22] hover:bg-[#25252F] text-slate-400 hover:text-slate-200 border border-[#2B2B36] transition-colors"
          title={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
};
