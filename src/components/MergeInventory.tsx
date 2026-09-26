import React, { useState } from 'react';
import { InventorySlot, UpgradeState } from '../types/game';
import { PICKAXE_TIERS, BASE_MAX_ACTIVE_PICKAXES } from '../utils/constants';
import { getPickaxeSprite } from '../utils/pixelTextures';
import { sound } from '../utils/audio';
import { Sparkles, ShoppingBag, Dices, Play, Pause, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MergeInventoryProps {
  slots: InventorySlot[];
  onSlotsChange: (newSlots: InventorySlot[]) => void;
  coins: number;
  onSpendCoins: (amount: number) => boolean;
  highestTierUnlocked: number;
  onUnlockNewTier: (tier: number) => void;
  onSelectActiveTier: (tier: number) => void;
  activeTier: number;
  upgrades: UpgradeState;
  activePickaxesCount: number;
  autoDropEnabled: boolean;
  onToggleAutoDrop: () => void;
  isRolling: boolean;
  rouletteIndex: number | null;
  cooldownRemaining: number;
  cooldownDuration: number;
  lastRollResult: {
    slotIndex: number;
    success: boolean;
    tier?: number;
    text: string;
  } | null;
  onTriggerSpin: () => void;
}

export const MergeInventory: React.FC<MergeInventoryProps> = ({
  slots,
  onSlotsChange,
  coins,
  onSpendCoins,
  highestTierUnlocked,
  onUnlockNewTier,
  onSelectActiveTier,
  activeTier,
  upgrades,
  activePickaxesCount,
  autoDropEnabled,
  onToggleAutoDrop,
  isRolling,
  rouletteIndex,
  cooldownRemaining,
  cooldownDuration,
  lastRollResult,
  onTriggerSpin,
}) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);

  const maxActivePickaxes = BASE_MAX_ACTIVE_PICKAXES + (upgrades.maxPickaxesLimit || 0);

  // Buy price formula
  const buyTier = Math.max(1, Math.min(10, highestTierUnlocked - 2));
  const baseCost = PICKAXE_TIERS.find(t => t.tier === buyTier)?.cost || 15;
  const currentCount = slots.filter(s => s.tier !== null).length;
  const currentBuyCost = Math.round(baseCost * (1 + currentCount * 0.18));

  // Buy a pickaxe
  const handleBuyPickaxe = () => {
    const emptyIndex = slots.findIndex(s => s.tier === null);
    if (emptyIndex === -1) return;

    if (!onSpendCoins(currentBuyCost)) return;

    const newSlots = [...slots];
    newSlots[emptyIndex] = { id: emptyIndex, tier: buyTier };
    onSlotsChange(newSlots);
    sound.playCoin();
  };

  // Merge logic between source slot and target slot
  const performSlotAction = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) {
      setSelectedSlotIndex(null);
      return;
    }

    const newSlots = [...slots];
    const sourceSlot = newSlots[sourceIdx];
    const targetSlot = newSlots[targetIdx];

    if (!sourceSlot.tier) {
      setSelectedSlotIndex(null);
      return;
    }

    // Target is empty: Move
    if (targetSlot.tier === null) {
      targetSlot.tier = sourceSlot.tier;
      sourceSlot.tier = null;
      onSlotsChange(newSlots);
      setSelectedSlotIndex(null);
      return;
    }

    // Both are same tier: MERGE!
    if (sourceSlot.tier === targetSlot.tier) {
      const nextTier = sourceSlot.tier + 1;
      if (nextTier <= PICKAXE_TIERS.length) {
        targetSlot.tier = nextTier;
        sourceSlot.tier = null;
        onSlotsChange(newSlots);
        sound.playMerge(nextTier);

        if (nextTier > highestTierUnlocked) {
          onUnlockNewTier(nextTier);
          sound.playLevelUp();
        }
      }
      setSelectedSlotIndex(null);
      return;
    }

    // Different tiers: Swap
    const temp = targetSlot.tier;
    targetSlot.tier = sourceSlot.tier;
    sourceSlot.tier = temp;
    onSlotsChange(newSlots);
    setSelectedSlotIndex(null);
  };

  // Click handler for inventory slot
  const handleSlotClick = (index: number) => {
    if (selectedSlotIndex === null) {
      if (slots[index].tier !== null) {
        setSelectedSlotIndex(index);
        onSelectActiveTier(slots[index].tier!);
      }
    } else {
      performSlotAction(selectedSlotIndex, index);
    }
  };

  // Auto-Merge all matching pairs on the board
  const handleAutoMerge = () => {
    const newSlots = [...slots];
    let mergedAny = false;

    for (let i = 0; i < newSlots.length; i++) {
      if (!newSlots[i].tier) continue;
      for (let j = i + 1; j < newSlots.length; j++) {
        if (newSlots[j].tier === newSlots[i].tier) {
          const nextTier = (newSlots[i].tier as number) + 1;
          if (nextTier <= PICKAXE_TIERS.length) {
            newSlots[i].tier = nextTier;
            newSlots[j].tier = null;
            mergedAny = true;
            if (nextTier > highestTierUnlocked) {
              onUnlockNewTier(nextTier);
            }
          }
          break;
        }
      }
    }

    if (mergedAny) {
      onSlotsChange(newSlots);
      sound.playMerge(highestTierUnlocked);
    }
    setSelectedSlotIndex(null);
  };

  const selectedTierInfo = selectedSlotIndex !== null && slots[selectedSlotIndex]?.tier
    ? PICKAXE_TIERS.find(t => t.tier === slots[selectedSlotIndex].tier)
    : PICKAXE_TIERS.find(t => t.tier === activeTier);

  const canSpin = !isRolling && cooldownRemaining <= 0 && activePickaxesCount < maxActivePickaxes;
  const cooldownPercent = Math.max(0, Math.min(100, (cooldownRemaining / cooldownDuration) * 100));

  return (
    <div className="w-full h-full flex flex-col justify-between bg-[#141418] border-t md:border-t-0 border-[#26262B] p-2.5 sm:p-3 text-slate-200 overflow-y-auto select-none">
      {/* Upper Control Bar: Buy & Auto-merge Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* Buy Pickaxe Button */}
        <button
          onClick={handleBuyPickaxe}
          disabled={coins < currentBuyCost || slots.every(s => s.tier !== null)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded text-xs font-semibold tracking-wide transition-all ${
            coins >= currentBuyCost && slots.some(s => s.tier === null)
              ? 'bg-[#2E6B34] hover:bg-[#38823F] active:scale-[0.98] text-white shadow-sm border border-[#48A551]'
              : 'bg-[#1E2024] text-slate-500 border border-[#2B2D33] cursor-not-allowed'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Купить Т{buyTier} ({currentBuyCost} 🪙)</span>
        </button>

        {/* Auto-Merge Button */}
        <button
          onClick={handleAutoMerge}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#242730] hover:bg-[#2F3440] active:scale-[0.98] border border-[#3A404F] text-slate-200 rounded text-xs font-semibold transition-all shadow-sm"
          title="Объединить все одинаковые кирки на доске"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Слияние</span>
        </button>
      </div>

      {/* ROULETTE CONTROLLER BAR */}
      <div className="relative mb-2.5 p-2 bg-[#1A1A22] rounded border border-[#2E2E3C] flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Spin Roulette Button */}
          <button
            onClick={onTriggerSpin}
            disabled={!canSpin}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
              canSpin
                ? 'bg-[#B45309] hover:bg-[#D97706] active:scale-[0.98] text-white border border-[#F59E0B] shadow-amber-950/40'
                : 'bg-[#22222B] text-slate-500 border border-[#2D2D3B] cursor-not-allowed'
            }`}
          >
            <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
            <span>
              {isRolling
                ? 'Рулетка крутится...'
                : activePickaxesCount >= maxActivePickaxes
                ? `Лимит в шахте (${activePickaxesCount}/${maxActivePickaxes})`
                : cooldownRemaining > 0
                ? `Перезарядка (${cooldownRemaining.toFixed(1)}с)`
                : 'Крутить Рулетку!'}
            </span>
          </button>

          {/* Auto-Roulette Toggle Button */}
          <button
            onClick={onToggleAutoDrop}
            className={`flex items-center gap-1 px-2.5 py-2 rounded text-xs font-semibold border transition-all ${
              autoDropEnabled
                ? 'bg-[#2E6B34] text-white border-[#48A551]'
                : 'bg-[#202028] text-slate-400 border-[#2D2D38] hover:text-slate-200'
            }`}
            title={autoDropEnabled ? 'Выключить авто-рулетку' : 'Включить авто-рулетку'}
          >
            {autoDropEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Авто</span>
          </button>
        </div>

        {/* Cooldown Progress Bar */}
        <div className="w-full bg-[#111116] h-1.5 rounded-full overflow-hidden border border-[#282836]">
          <div
            className={`h-full transition-all duration-100 ${
              canSpin ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            style={{ width: `${100 - cooldownPercent}%` }}
          />
        </div>

        {/* Live Active Pickaxes Cap & Roulette Result */}
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1 text-slate-400">
            <span>В шахте:</span>
            <strong
              className={
                activePickaxesCount >= maxActivePickaxes ? 'text-amber-400' : 'text-emerald-400'
              }
            >
              {activePickaxesCount} / {maxActivePickaxes}
            </strong>
          </div>

          {/* Roulette Outcome Toast */}
          {lastRollResult && (
            <div
              className={`flex items-center gap-1 truncate max-w-[210px] ${
                lastRollResult.success ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {lastRollResult.success ? (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{lastRollResult.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4x4 Inventory Grid (Roulette Target Board) */}
      <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#0E0E12] rounded border border-[#212127]">
        {slots.map((slot, index) => {
          const isSelected = selectedSlotIndex === index;
          const isRouletteTarget = rouletteIndex === index;
          const tierInfo = slot.tier ? PICKAXE_TIERS.find(t => t.tier === slot.tier) : null;

          return (
            <div
              key={slot.id}
              onClick={() => handleSlotClick(index)}
              draggable={slot.tier !== null}
              onDragStart={() => setDraggedSlotIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedSlotIndex !== null) {
                  performSlotAction(draggedSlotIndex, index);
                  setDraggedSlotIndex(null);
                }
              }}
              className={`relative aspect-square flex items-center justify-center rounded cursor-pointer transition-all select-none ${
                isRouletteTarget
                  ? 'bg-amber-500/35 border-2 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.8)] scale-105 z-20 animate-pulse'
                  : isSelected
                  ? 'bg-[#2A2B36] border-2 border-cyan-400 shadow-md scale-105 z-10'
                  : 'bg-[#18181D] hover:bg-[#202026] border border-[#2D2D36] active:bg-[#25252F]'
              }`}
            >
              {/* Slot Number Label (1..16) */}
              <span className="absolute top-0.5 right-1 text-[8px] font-mono text-slate-500 pointer-events-none">
                #{index + 1}
              </span>

              {tierInfo ? (
                <>
                  {/* Pickaxe Sprite Canvas */}
                  <PickaxeDisplay tier={tierInfo.tier} />

                  {/* Level / Tier badge in corner */}
                  <span
                    className="absolute top-0.5 left-1 text-[10px] font-mono font-bold tracking-tight px-1 rounded pointer-events-none"
                    style={{
                      color: tierInfo.glowColor || tierInfo.bladeColor,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                    }}
                  >
                    T{tierInfo.tier}
                  </span>

                  {/* HP & Damage label */}
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-emerald-300 bg-black/75 px-1 rounded pointer-events-none">
                    {tierInfo.hp >= 1000 ? `${(tierInfo.hp / 1000).toFixed(0)}k` : tierInfo.hp} HP
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center opacity-30 text-slate-500 pointer-events-none">
                  <span className="text-[10px] font-mono">ПУСТО</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected / Active Pickaxe Info Bar */}
      {selectedTierInfo && (
        <div className="mt-2 py-1.5 px-2.5 bg-[#0D0D11] rounded border border-[#212128] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className="font-bold"
              style={{ color: selectedTierInfo.glowColor || selectedTierInfo.bladeColor }}
            >
              Т{selectedTierInfo.tier} {selectedTierInfo.nameRu}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Урон: <strong className="text-white">{selectedTierInfo.damage.toLocaleString()}</strong> · HP: <strong className="text-emerald-400">{selectedTierInfo.hp.toLocaleString()}</strong>
            </span>
          </div>
          <span className="text-[11px] text-amber-300/90 truncate max-w-[180px]">
            {selectedTierInfo.specialEffectRu}
          </span>
        </div>
      )}
    </div>
  );
};

// Sub-component to render pickaxe crisp pixel canvas
const PickaxeDisplay: React.FC<{ tier: number }> = ({ tier }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 36, 36);
    const sprite = getPickaxeSprite(tier);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, 2, 2, 32, 32);
  }, [tier]);

  return <canvas ref={canvasRef} width={36} height={36} className="w-9 h-9 pointer-events-none" />;
};
