/**
 * Craft & Drop: Merge Pickaxe (2D Minecraft-style Merge & Drop Game)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderHUD } from './components/HeaderHUD';
import { MineShaftCanvas } from './components/MineShaftCanvas';
import { MergeInventory } from './components/MergeInventory';
import { ForgeUpgradesModal } from './components/ForgeUpgradesModal';
import { StatsModal } from './components/StatsModal';
import { TierUnlockBanner } from './components/TierUnlockBanner';
import { InventorySlot, UpgradeState, PickaxeTier, BlockId } from './types/game';
import { PICKAXE_TIERS, GRID_SIZE, BIOMES, BASE_MAX_ACTIVE_PICKAXES, BASE_DROP_COOLDOWN } from './utils/constants';
import { sound } from './utils/audio';

const STORAGE_KEY = 'craft_drop_save_v3';

interface SaveData {
  coins: number;
  emeralds: number;
  depth: number;
  highestTierUnlocked: number;
  totalBlocksBroken: number;
  slots: InventorySlot[];
  upgrades: UpgradeState;
  autoDropEnabled: boolean;
}

export interface DropAction {
  id: string;
  tier: number | null;
  x?: number;
}

const DEFAULT_UPGRADES: UpgradeState = {
  sharpness: 0,
  pickaxeDurability: 0,
  maxPickaxesLimit: 0,
  dropCooldownSpeed: 0,
  doubleSpinChance: 0,
};

function createInitialSlots(): InventorySlot[] {
  const slots: InventorySlot[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    slots.push({
      id: i,
      tier: i === 0 || i === 1 ? 1 : null, // Start with two Tier 1 Wooden Pickaxes ready to merge!
    });
  }
  return slots;
}

export default function App() {
  // Load saved data or defaults
  const [coins, setCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).coins ?? 50;
    } catch {}
    return 50;
  });

  const [emeralds, setEmeralds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).emeralds ?? 0;
    } catch {}
    return 0;
  });

  const [depth, setDepth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).depth ?? 0;
    } catch {}
    return 0;
  });

  const [highestTierUnlocked, setHighestTierUnlocked] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).highestTierUnlocked ?? 1;
    } catch {}
    return 1;
  });

  const [totalBlocksBroken, setTotalBlocksBroken] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).totalBlocksBroken ?? 0;
    } catch {}
    return 0;
  });

  const [slots, setSlots] = useState<InventorySlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.slots && parsed.slots.length === GRID_SIZE) return parsed.slots;
      }
    } catch {}
    return createInitialSlots();
  });

  const [upgrades, setUpgrades] = useState<UpgradeState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.upgrades) return { ...DEFAULT_UPGRADES, ...parsed.upgrades };
      }
    } catch {}
    return DEFAULT_UPGRADES;
  });

  const [autoDropEnabled, setAutoDropEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).autoDropEnabled ?? true;
    } catch {}
    return true;
  });

  const [activeTier, setActiveTier] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.isMuted);

  // Active pickaxes limit and count
  const [activePickaxesCount, setActivePickaxesCount] = useState<number>(0);
  const maxActivePickaxes = BASE_MAX_ACTIVE_PICKAXES + (upgrades.maxPickaxesLimit || 0);

  // Unified Roulette State
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rouletteIndex, setRouletteIndex] = useState<number | null>(null);
  const [spinningTier, setSpinningTier] = useState<number>(1);
  const [rouletteAimX, setRouletteAimX] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const cooldownDuration = Math.max(0.8, BASE_DROP_COOLDOWN - (upgrades.dropCooldownSpeed || 0) * 0.45);

  const [lastRollResult, setLastRollResult] = useState<{
    slotIndex: number;
    success: boolean;
    tier?: number;
    text: string;
  } | null>(null);

  // Trigger drop action inside canvas
  const [dropAction, setDropAction] = useState<DropAction | null>(null);

  // Reset Trigger Key
  const [resetKey, setResetKey] = useState<number>(0);

  // Modals & Popups
  const [isForgeOpen, setIsForgeOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [unlockedTierPopup, setUnlockedTierPopup] = useState<PickaxeTier | null>(null);

  // Refs for callbacks
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const cursorAimXRef = useRef<number | null>(null);

  // Keep activeTier updated with highest unlocked tier if current is empty
  useEffect(() => {
    const presentTiers = slots.map(s => s.tier).filter((t): t is number => t !== null);
    if (presentTiers.length > 0) {
      const maxPresent = Math.max(...presentTiers);
      setActiveTier(maxPresent);
    } else {
      setActiveTier(Math.max(1, highestTierUnlocked));
    }
  }, [slots, highestTierUnlocked]);

  // Persist game state to LocalStorage
  useEffect(() => {
    try {
      const data: SaveData = {
        coins,
        emeralds,
        depth,
        highestTierUnlocked,
        totalBlocksBroken,
        slots,
        upgrades,
        autoDropEnabled,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [coins, emeralds, depth, highestTierUnlocked, totalBlocksBroken, slots, upgrades, autoDropEnabled]);

  // Rewards handler from block destruction
  const handleReward = useCallback((coinsEarned: number, emeraldsEarned: number) => {
    setCoins(prev => prev + coinsEarned);
    if (emeraldsEarned > 0) {
      setEmeralds(prev => prev + emeraldsEarned);
    }
  }, []);

  // Spent coins handler
  const handleSpendCoins = useCallback((amount: number): boolean => {
    if (coins < amount) return false;
    setCoins(prev => prev - amount);
    return true;
  }, [coins]);

  // Unlock new pickaxe tier handler
  const handleUnlockNewTier = useCallback((tier: number) => {
    if (tier > highestTierUnlocked) {
      setHighestTierUnlocked(tier);
      const tierInfo = PICKAXE_TIERS.find(t => t.tier === tier) || null;
      setUnlockedTierPopup(tierInfo);
    }
  }, [highestTierUnlocked]);

  // Block destroyed counter
  const handleBlockDestroyed = useCallback((type: BlockId) => {
    setTotalBlocksBroken(prev => prev + 1);
  }, []);

  // Core Roulette Execution (works from canvas click or button click)
  // If targetX is provided (canvas click), drops from targetX.
  // If cursor is inside canvas, drops from cursor.
  // If cursor is outside playing field, drops randomly like in the old mechanics!
  const spinRoulette = useCallback((targetX?: number) => {
    if (isRolling) return;
    if (activePickaxesCount >= maxActivePickaxes) return;
    if (cooldownRemaining > 0) return;

    setIsRolling(true);
    const aimPos = targetX ?? cursorAimXRef.current ?? null;
    setRouletteAimX(aimPos);

    let tickCount = 0;
    const maxTicks = 13;
    const intervalTime = 48;

    const rollTimer = setInterval(() => {
      const randomSlot = Math.floor(Math.random() * 16);
      setRouletteIndex(randomSlot);

      // Fast-cycling tier for spinning animation at aim position
      const presentTiers = slotsRef.current
        .map(s => s.tier)
        .filter((t): t is number => t !== null);
      const randomVisualTier =
        presentTiers.length > 0
          ? presentTiers[Math.floor(Math.random() * presentTiers.length)]
          : Math.floor(Math.random() * 6) + 1;
      setSpinningTier(randomVisualTier);

      sound.playHit('dirt');
      tickCount++;

      if (tickCount >= maxTicks) {
        clearInterval(rollTimer);

        // Final chosen slot out of 16 (0 to 15)
        const finalSlot = Math.floor(Math.random() * 16);
        setRouletteIndex(finalSlot);
        setIsRolling(false);
        setCooldownRemaining(cooldownDuration);

        const currentSlots = slotsRef.current;
        const targetSlot = currentSlots[finalSlot];

        if (targetSlot && targetSlot.tier !== null) {
          // Success! Drop pickaxe from this slot at aimPos (or random if null)
          const tier = targetSlot.tier;
          const tierInfo = PICKAXE_TIERS.find(t => t.tier === tier);

          setDropAction({
            id: `drop_${Date.now()}_${Math.random()}`,
            tier,
            x: aimPos ?? undefined,
          });

          setLastRollResult({
            slotIndex: finalSlot,
            success: true,
            tier,
            text: `Слот #${finalSlot + 1}: ${tierInfo?.nameRu || ''} (Т${tier})`,
          });

          // Double spin chance upgrade check
          if (upgrades.doubleSpinChance > 0 && Math.random() < upgrades.doubleSpinChance * 0.15) {
            setTimeout(() => {
              const bonusSlot = Math.floor(Math.random() * 16);
              const bonusTarget = slotsRef.current[bonusSlot];
              if (bonusTarget && bonusTarget.tier !== null) {
                setDropAction({
                  id: `drop_bonus_${Date.now()}_${Math.random()}`,
                  tier: bonusTarget.tier,
                  x: aimPos ? aimPos + (Math.random() - 0.5) * 36 : undefined,
                });
              }
            }, 280);
          }
        } else {
          // Empty slot! Nothing drops!
          sound.playHit('stone');
          setDropAction({
            id: `empty_${Date.now()}_${Math.random()}`,
            tier: null,
            x: aimPos ?? undefined,
          });

          setLastRollResult({
            slotIndex: finalSlot,
            success: false,
            text: `Слот #${finalSlot + 1}: ПУСТО! Ничего не выпало!`,
          });
        }
      }
    }, intervalTime);
  }, [isRolling, activePickaxesCount, maxActivePickaxes, cooldownRemaining, cooldownDuration, upgrades.doubleSpinChance]);

  // Cooldown countdown tick & Auto-roulette trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 0.1) {
          // Cooldown finished: If auto-drop enabled and not full, trigger spin!
          if (autoDropEnabled && !isRolling && activePickaxesCount < maxActivePickaxes) {
            spinRoulette();
            return cooldownDuration;
          }
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    return () => clearInterval(timer);
  }, [autoDropEnabled, isRolling, activePickaxesCount, maxActivePickaxes, spinRoulette, cooldownDuration]);

  // Upgrade handler in Forge
  const handleUpgrade = (key: keyof UpgradeState, coinCost: number, emeraldCost: number) => {
    if (coins < coinCost || emeralds < emeraldCost) return;
    setCoins(prev => prev - coinCost);
    if (emeraldCost > 0) {
      setEmeralds(prev => prev - emeraldCost);
    }
    setUpgrades(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  };

  // Sound mute toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  // FULL GAME PROGRESS RESET (Completely wipes save and resets canvas & boards)
  const handleResetProgress = () => {
    try {
      localStorage.clear();
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('craft_drop_save_v1');
      localStorage.removeItem('craft_drop_save_v2');
      localStorage.removeItem('craft_drop_save_v3');
    } catch {}

    setCoins(50);
    setEmeralds(0);
    setDepth(0);
    setHighestTierUnlocked(1);
    setActiveTier(1);
    setTotalBlocksBroken(0);
    setSlots(createInitialSlots());
    setUpgrades(DEFAULT_UPGRADES);
    setActivePickaxesCount(0);
    setIsRolling(false);
    setCooldownRemaining(0);
    setDropAction(null);
    setLastRollResult(null);
    setResetKey(prev => prev + 1); // Triggers canvas wipe & depth 0 regeneration
    sound.playLevelUp();
  };

  const currentBiome = BIOMES.find(b => depth >= b.depthStart && depth < b.depthEnd) || BIOMES[0];

  return (
    <div className="w-full h-screen flex flex-col bg-[#0F0F13] text-slate-100 font-sans overflow-hidden select-none">
      {/* HUD Header */}
      <HeaderHUD
        coins={coins}
        emeralds={emeralds}
        depth={depth}
        biomeName={currentBiome.nameRu}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenForge={() => setIsForgeOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        activePickaxesCount={activePickaxesCount}
        maxActivePickaxes={maxActivePickaxes}
      />

      {/* Main Game Interface Split */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* Mine Shaft Canvas (2D Physics, Aiming, and Digging Area) */}
        <div className="flex-1 min-h-0 relative h-[50%] md:h-full overflow-hidden">
          <MineShaftCanvas
            depth={depth}
            onDepthChange={setDepth}
            onReward={handleReward}
            upgrades={upgrades}
            activeTier={activeTier}
            highestTierUnlocked={highestTierUnlocked}
            onBlockDestroyed={handleBlockDestroyed}
            onActiveCountChange={(count) => setActivePickaxesCount(count)}
            resetKey={resetKey}
            isRolling={isRolling}
            rouletteAimX={rouletteAimX}
            spinningTier={spinningTier}
            onRequestSpin={spinRoulette}
            dropAction={dropAction}
            onClearDropAction={() => setDropAction(null)}
            cooldownRemaining={cooldownRemaining}
            activePickaxesCount={activePickaxesCount}
            onAimChange={(x) => {
              cursorAimXRef.current = x;
            }}
          />
        </div>

        {/* Merge Inventory & Roulette Controller */}
        <div className="w-full md:w-[380px] lg:w-[420px] h-[50%] md:h-full min-h-0 flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-[#26262B] bg-[#141418] z-10">
          <MergeInventory
            slots={slots}
            onSlotsChange={setSlots}
            coins={coins}
            onSpendCoins={handleSpendCoins}
            highestTierUnlocked={highestTierUnlocked}
            onUnlockNewTier={handleUnlockNewTier}
            onSelectActiveTier={setActiveTier}
            activeTier={activeTier}
            upgrades={upgrades}
            activePickaxesCount={activePickaxesCount}
            autoDropEnabled={autoDropEnabled}
            onToggleAutoDrop={() => setAutoDropEnabled(prev => !prev)}
            isRolling={isRolling}
            rouletteIndex={rouletteIndex}
            cooldownRemaining={cooldownRemaining}
            cooldownDuration={cooldownDuration}
            lastRollResult={lastRollResult}
            onTriggerSpin={() => spinRoulette()}
          />
        </div>
      </div>

      {/* Forge & Enchantments Modal */}
      <ForgeUpgradesModal
        isOpen={isForgeOpen}
        onClose={() => setIsForgeOpen(false)}
        upgrades={upgrades}
        onUpgrade={handleUpgrade}
        coins={coins}
        emeralds={emeralds}
      />

      {/* Stats & Records Modal with Reliable Reset */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        depth={depth}
        highestTierUnlocked={highestTierUnlocked}
        totalBlocksBroken={totalBlocksBroken}
        onResetProgress={handleResetProgress}
      />

      {/* New Pickaxe Tier Unlock Celebration Banner */}
      <TierUnlockBanner
        unlockedTier={unlockedTierPopup}
        onDismiss={() => setUnlockedTierPopup(null)}
      />
    </div>
  );
}
