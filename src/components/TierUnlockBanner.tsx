import React from 'react';
import { PickaxeTier } from '../types/game';
import { Sparkles } from 'lucide-react';

interface TierUnlockBannerProps {
  unlockedTier: PickaxeTier | null;
  onDismiss: () => void;
}

export const TierUnlockBanner: React.FC<TierUnlockBannerProps> = ({
  unlockedTier,
  onDismiss,
}) => {
  if (!unlockedTier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in zoom-in duration-200">
      <div className="relative w-full max-w-sm bg-[#16161D] border-2 border-amber-400/90 rounded-lg p-6 shadow-[0_0_50px_rgba(251,191,36,0.3)] text-center flex flex-col items-center">
        {/* Sparkles Icon */}
        <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3">
          <Sparkles className="w-8 h-8 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
        </div>

        <span className="text-xs uppercase font-mono font-bold tracking-widest text-amber-400">
          Новое открытие!
        </span>

        <h3
          className="text-lg md:text-xl font-bold mt-1 mb-2"
          style={{ color: unlockedTier.glowColor || unlockedTier.bladeColor }}
        >
          {unlockedTier.nameRu} (Тир {unlockedTier.tier})
        </h3>

        <div className="py-2 px-4 rounded bg-[#0F0F14] border border-[#2B2B38] text-xs font-mono mb-4 w-full">
          <div className="flex justify-between py-1 border-b border-[#21212B]">
            <span className="text-slate-400">Урон:</span>
            <strong className="text-emerald-400">+{unlockedTier.damage.toLocaleString()}</strong>
          </div>
          <div className="py-1 text-slate-300 text-[11px] text-left">
            Эффект: {unlockedTier.specialEffectRu}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-2.5 px-4 bg-[#2E6B34] hover:bg-[#38823F] active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded border border-[#48A551] shadow-md transition-all"
        >
          Продолжить копать!
        </button>
      </div>
    </div>
  );
};
