import React, { useState } from 'react';
import { X, Trophy, Pickaxe, MapPin, Layers, RotateCcw, AlertTriangle } from 'lucide-react';
import { PICKAXE_TIERS, BIOMES } from '../utils/constants';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  depth: number;
  highestTierUnlocked: number;
  totalBlocksBroken: number;
  onResetProgress: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  depth,
  highestTierUnlocked,
  totalBlocksBroken,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  if (!isOpen) return null;

  const highestTier = PICKAXE_TIERS.find(t => t.tier === highestTierUnlocked) || PICKAXE_TIERS[0];
  const currentBiome = BIOMES.find(b => depth >= b.depthStart && depth < b.depthEnd) || BIOMES[0];

  const handleClose = () => {
    setConfirmReset(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-md bg-[#141418] border-2 border-[#33333F] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C1C22] border-b border-[#2B2B36]">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">
              Статистика Шахты
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#2B2B36] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-[#181820] border border-[#2B2B36] rounded">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Рекорд глубины
              </span>
              <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">{depth} метров</p>
            </div>

            <div className="p-3 bg-[#181820] border border-[#2B2B36] rounded">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Разбито блоков
              </span>
              <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">
                {totalBlocksBroken.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Highest Pickaxe Unlocked */}
          <div className="p-3 bg-[#181820] border border-[#2B2B36] rounded flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-[#20202A] border border-[#2F2F3D]">
                <Pickaxe className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Лучшая открытая кирка:</span>
                <p className="text-xs font-bold text-slate-100">
                  Т{highestTier.tier} · {highestTier.nameRu}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Урон: {highestTier.damage.toLocaleString()} · HP: {highestTier.hp.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Current Biome */}
          <div className="p-3 bg-[#181820] border border-[#2B2B36] rounded">
            <span className="text-[11px] text-slate-400">Текущий биом:</span>
            <p className="text-xs font-bold text-slate-100 mt-0.5">{currentBiome.nameRu}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{currentBiome.descriptionRu}</p>
          </div>

          {/* Reset Game Section */}
          <div className="pt-3 border-t border-[#262630] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Сброс всего прогресса</span>
            </div>

            {confirmReset ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onResetProgress();
                    handleClose();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold shadow-md transition-all animate-pulse"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Точно сбросить!</span>
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1.5 bg-[#2A2A35] hover:bg-[#3A3A48] text-slate-300 rounded text-xs transition-colors"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white rounded text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить всё</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
