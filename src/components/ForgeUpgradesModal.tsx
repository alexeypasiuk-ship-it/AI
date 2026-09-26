import React from 'react';
import { UpgradeState } from '../types/game';
import { sound } from '../utils/audio';
import { X, Sword, Shield, Layers, Gauge, Dices } from 'lucide-react';

interface ForgeUpgradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  upgrades: UpgradeState;
  onUpgrade: (key: keyof UpgradeState, coinCost: number, emeraldCost: number) => void;
  coins: number;
  emeralds: number;
}

interface UpgradeItemConfig {
  key: keyof UpgradeState;
  title: string;
  description: string;
  icon: React.ReactNode;
  baseCoinCost: number;
  coinMultiplier: number;
  baseEmeraldCost: number;
  emeraldMultiplier: number;
  maxLevel: number;
}

const UPGRADE_CONFIGS: UpgradeItemConfig[] = [
  {
    key: 'sharpness',
    title: 'Острота (Sharpness)',
    description: '+20% урона для всех кирок',
    icon: <Sword className="w-5 h-5 text-red-400" />,
    baseCoinCost: 100,
    coinMultiplier: 2.1,
    baseEmeraldCost: 0,
    emeraldMultiplier: 1,
    maxLevel: 25,
  },
  {
    key: 'pickaxeDurability',
    title: 'Прочность кирок (Durability HP)',
    description: '+30% больше запаса HP/прочности для всех кирок',
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    baseCoinCost: 140,
    coinMultiplier: 2.2,
    baseEmeraldCost: 1,
    emeraldMultiplier: 1.8,
    maxLevel: 25,
  },
  {
    key: 'maxPickaxesLimit',
    title: 'Лимит кирок в шахте (Max Pickaxes)',
    description: '+1 к максимальному числу активных кирок в шахте',
    icon: <Layers className="w-5 h-5 text-blue-400" />,
    baseCoinCost: 250,
    coinMultiplier: 2.7,
    baseEmeraldCost: 3,
    emeraldMultiplier: 2.1,
    maxLevel: 7, // 3 base + 7 = 10 max active pickaxes
  },
  {
    key: 'dropCooldownSpeed',
    title: 'Скорость рулетки (Drop Cooldown)',
    description: 'Ускоряет перезарядку сброса кирок (с 3.5с до 0.8с)',
    icon: <Gauge className="w-5 h-5 text-amber-400" />,
    baseCoinCost: 200,
    coinMultiplier: 2.4,
    baseEmeraldCost: 2,
    emeraldMultiplier: 1.9,
    maxLevel: 6,
  },
  {
    key: 'doubleSpinChance',
    title: 'Двойная рулетка (Double Drop)',
    description: '+15% шанс запустить сразу две кирки из разных слотов',
    icon: <Dices className="w-5 h-5 text-purple-400" />,
    baseCoinCost: 500,
    coinMultiplier: 2.8,
    baseEmeraldCost: 6,
    emeraldMultiplier: 2.2,
    maxLevel: 5,
  },
];

export const ForgeUpgradesModal: React.FC<ForgeUpgradesModalProps> = ({
  isOpen,
  onClose,
  upgrades,
  onUpgrade,
  coins,
  emeralds,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="relative w-full max-w-md bg-[#141418] border-2 border-[#33333F] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C1C22] border-b border-[#2B2B36]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#B45309] flex items-center justify-center border border-[#D97706]">
              <Sword className="w-3.5 h-3.5 text-amber-200" />
            </div>
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">
              Кузница Зачарований (Forge)
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playHit('stone');
              onClose();
            }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#2B2B36] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance strip */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0E0E12] border-b border-[#212128] text-xs font-mono">
          <span className="text-slate-400">Твои ресурсы:</span>
          <div className="flex items-center gap-4">
            <span className="text-amber-400 font-bold">{coins.toLocaleString()} 🪙</span>
            <span className="text-emerald-400 font-bold">{emeralds.toLocaleString()} 💎</span>
          </div>
        </div>

        {/* Upgrade List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {UPGRADE_CONFIGS.map(cfg => {
            const currentLvl = upgrades[cfg.key] || 0;
            const isMax = currentLvl >= cfg.maxLevel;
            const coinCost = isMax
              ? 0
              : Math.round(cfg.baseCoinCost * Math.pow(cfg.coinMultiplier, currentLvl));
            const emeraldCost = isMax
              ? 0
              : cfg.baseEmeraldCost > 0
              ? Math.round(cfg.baseEmeraldCost * Math.pow(cfg.emeraldMultiplier, currentLvl))
              : 0;

            const canAfford = !isMax && coins >= coinCost && emeralds >= emeraldCost;

            return (
              <div
                key={cfg.key}
                className="flex items-center justify-between gap-3 p-3 bg-[#191920] border border-[#2B2B38] rounded hover:border-[#3E3E52] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#20202B] border border-[#2F2F40]">
                    {cfg.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{cfg.title}</span>
                      <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-1 rounded">
                        Ур. {currentLvl}/{cfg.maxLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      {cfg.description}
                    </p>
                  </div>
                </div>

                {/* Upgrade Button */}
                <button
                  disabled={!canAfford || isMax}
                  onClick={() => {
                    if (canAfford) {
                      onUpgrade(cfg.key, coinCost, emeraldCost);
                      sound.playLevelUp();
                    }
                  }}
                  className={`px-3 py-2 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                    isMax
                      ? 'bg-[#202028] text-slate-500 border border-[#2A2A36] cursor-default'
                      : canAfford
                      ? 'bg-[#2E6B34] hover:bg-[#38823F] active:scale-95 text-white border border-[#48A551] shadow-sm'
                      : 'bg-[#1F2026] text-slate-500 border border-[#2A2B33] cursor-not-allowed'
                  }`}
                >
                  {isMax ? (
                    'МАКС'
                  ) : (
                    <div className="flex flex-col items-center">
                      <span>Улучшить</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-200">
                        {coinCost > 0 && <span>{coinCost.toLocaleString()} 🪙</span>}
                        {emeraldCost > 0 && (
                          <span className="text-emerald-300">{emeraldCost} 💎</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#1C1C22] border-t border-[#2B2B36] text-center">
          <p className="text-[11px] text-slate-400">
            Прокачивай лимит кирок и прочность HP, чтобы сокрушать глубокие пласты руд!
          </p>
        </div>
      </div>
    </div>
  );
};
