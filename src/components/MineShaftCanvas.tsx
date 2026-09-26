import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MiningBlock, DroppedPickaxe, Particle, FloatingText, BlockId, UpgradeState } from '../types/game';
import { BLOCK_CONFIGS, BIOMES, PICKAXE_TIERS, BASE_MAX_ACTIVE_PICKAXES } from '../utils/constants';
import { getBlockTexture, getCrackOverlay, getPickaxeSprite } from '../utils/pixelTextures';
import { sound } from '../utils/audio';
import { DropAction } from '../App';

interface MineShaftCanvasProps {
  depth: number;
  onDepthChange: (newDepth: number) => void;
  onReward: (coins: number, emeralds: number) => void;
  upgrades: UpgradeState;
  activeTier: number;
  highestTierUnlocked: number;
  onBlockDestroyed?: (type: BlockId) => void;
  onActiveCountChange?: (count: number, max: number) => void;
  resetKey: number;

  // Roulette Interactive Aim Mechanics
  isRolling: boolean;
  rouletteAimX: number | null;
  spinningTier: number;
  onRequestSpin: (aimX: number) => void;
  dropAction: DropAction | null;
  onClearDropAction: () => void;
  cooldownRemaining: number;
  activePickaxesCount: number;
  onAimChange?: (x: number | null) => void;
}

const COLS = 7;
const BASE_BLOCK_SIZE = 48; // px

export const MineShaftCanvas: React.FC<MineShaftCanvasProps> = ({
  depth,
  onDepthChange,
  onReward,
  upgrades,
  activeTier,
  highestTierUnlocked,
  onBlockDestroyed,
  onActiveCountChange,
  resetKey,
  isRolling,
  rouletteAimX,
  spinningTier,
  onRequestSpin,
  dropAction,
  onClearDropAction,
  cooldownRemaining,
  activePickaxesCount,
  onAimChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game internal state held in refs for 60fps game loop
  const blocksRef = useRef<MiningBlock[]>([]);
  const pickaxesRef = useRef<DroppedPickaxe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const cameraYRef = useRef<number>(0);
  const targetCameraYRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);

  const highestGeneratedRowRef = useRef<number>(0);
  const randomRollXRef = useRef<number | null>(null);

  // Mouse / Touch aiming state
  const [aimX, setAimX] = useState<number | null>(null);

  // Get current biome according to depth
  const currentBiome = BIOMES.find(b => depth >= b.depthStart && depth < b.depthEnd) || BIOMES[0];

  // Pick random block according to row depth (Row 0 is handled separately in generateRow)
  const chooseBlockForDepth = useCallback((row: number): BlockId => {
    const biome = BIOMES.find(b => row >= b.depthStart && row < b.depthEnd) || BIOMES[BIOMES.length - 1];

    // Bedrock boss block at depth boundaries (every 45 rows)
    if (row > 0 && row % 45 === 0) {
      return 'bedrock_boss';
    }

    // Rare TNT block
    if (Math.random() < 0.028) {
      return 'tnt';
    }

    // Rare treasure chest
    if (Math.random() < 0.016) {
      return 'chest';
    }

    // Weighted random selection from allowed blocks (NEVER grass for row > 0, but dirt is allowed)
    const allowed = biome.allowedBlocks.filter(
      b => b !== 'tnt' && b !== 'chest' && b !== 'bedrock_boss' && b !== 'grass'
    );
    if (allowed.length === 0) return 'stone';

    // Skew towards rarer ores deeper in the biome
    const depthRatio = Math.min(1, (row - biome.depthStart) / Math.max(1, biome.depthEnd - biome.depthStart));
    const index = Math.floor(Math.pow(Math.random(), 1.4 - depthRatio * 0.7) * allowed.length);
    return allowed[Math.min(index, allowed.length - 1)];
  }, []);

  // Generate a row of blocks:
  // Layer 0 is strictly grass (surface lawn), which NEVER appears again!
  // Subsequent layers include dirt (земля) in upper layers, sandstone, diorite, deepslate, etc.
  const generateRow = useCallback((rowIndex: number) => {
    const newBlocks: MiningBlock[] = [];

    for (let c = 0; c < COLS; c++) {
      let type: BlockId;
      if (rowIndex === 0) {
        // STRICTLY FIRST LAYER: only grass blocks, nowhere else!
        type = 'grass';
      } else {
        type = chooseBlockForDepth(rowIndex);
      }
      const config = BLOCK_CONFIGS[type];
      const finalHp = config.baseHp;

      newBlocks.push({
        id: `b_${rowIndex}_${c}_${Math.random().toString(36).substring(2, 6)}`,
        col: c,
        row: rowIndex,
        type,
        level: 1, // Visual material defines hardness
        hp: finalHp,
        maxHp: finalHp,
        x: 0,
        y: 0,
        width: BASE_BLOCK_SIZE,
        height: BASE_BLOCK_SIZE,
      });
    }
    return newBlocks;
  }, [chooseBlockForDepth]);

  // Spawn pickaxe projectile with graceful, slower physics
  const spawnPickaxeWithTier = useCallback((tierNumber: number, startX?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxActive = BASE_MAX_ACTIVE_PICKAXES + upgrades.maxPickaxesLimit;
    if (pickaxesRef.current.length >= maxActive) {
      return;
    }

    const tierInfo = PICKAXE_TIERS.find(t => t.tier === tierNumber) || PICKAXE_TIERS[0];
    const width = canvas.width;
    const blockSize = Math.floor(Math.min(BASE_BLOCK_SIZE, Math.max(34, (width - 16) / COLS)));
    const shaftWidth = COLS * blockSize;
    const shaftLeft = Math.floor((width - shaftWidth) / 2);

    const defaultX = shaftLeft + shaftWidth / 2 + (Math.random() - 0.5) * (shaftWidth * 0.5);
    const spawnX = startX ?? defaultX;

    // Apply Sharpness upgrade damage multiplier (+20% per lvl)
    const damageMult = 1 + upgrades.sharpness * 0.2;
    const finalDamage = Math.max(1, Math.round(tierInfo.damage * damageMult));

    // Apply Pickaxe Durability upgrade HP multiplier (+30% per lvl)
    const hpMult = 1 + upgrades.pickaxeDurability * 0.3;
    const finalHp = Math.max(20, Math.round(tierInfo.hp * hpMult));

    const pickaxeObj: DroppedPickaxe = {
      id: `p_${Date.now()}_${Math.random()}`,
      tier: tierInfo.tier,
      x: spawnX,
      y: 65 + cameraYRef.current,
      vx: (Math.random() - 0.5) * 1.6,
      vy: Math.max(1.4, tierInfo.maxSpeedY * 0.4),
      angle: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.18,
      radius: 14,
      damage: finalDamage,
      hp: finalHp,
      maxHp: finalHp,
      gravity: tierInfo.gravity,
      maxSpeedY: tierInfo.maxSpeedY,
      color: tierInfo.color,
      bladeColor: tierInfo.bladeColor,
      lifeTime: 0,
      specialEffect: tierInfo.specialEffectRu,
    };

    pickaxesRef.current.push(pickaxeObj);
    sound.playDrop();

    // Spawn slight flash of light at dropper launch point
    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        id: `launch_${Date.now()}_${i}`,
        x: spawnX,
        y: 56 + cameraYRef.current,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 3,
        color: tierInfo.bladeColor,
        alpha: 0.9,
        life: 0,
        maxLife: 15,
      });
    }
  }, [upgrades.maxPickaxesLimit, upgrades.sharpness, upgrades.pickaxeDurability]);

  // Spawn empty puff when roulette lands on an empty slot
  const spawnEmptyPuff = useCallback((dropX?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const blockSize = Math.floor(Math.min(BASE_BLOCK_SIZE, Math.max(34, (width - 16) / COLS)));
    const shaftWidth = COLS * blockSize;
    const shaftLeft = Math.floor((width - shaftWidth) / 2);
    const posX = dropX ?? (shaftLeft + shaftWidth / 2);
    const posY = 56 + cameraYRef.current;

    // Grey dust smoke puff
    for (let i = 0; i < 14; i++) {
      particlesRef.current.push({
        id: `puff_${Date.now()}_${i}`,
        x: posX,
        y: posY,
        vx: (Math.random() - 0.5) * 2.8,
        vy: (Math.random() - 0.5) * 2.8,
        size: 4 + Math.random() * 4,
        color: '#94A3B8',
        alpha: 0.8,
        life: 0,
        maxLife: 22,
        gravity: -0.05,
      });
    }

    // Floating text "ПУСТО! ❌"
    floatingTextsRef.current.push({
      id: `empty_txt_${Date.now()}`,
      x: posX - 20,
      y: posY + 10,
      text: 'ПУСТО! ❌',
      color: '#F87171',
      alpha: 1,
      life: 0,
      maxLife: 35,
      vy: -1.2,
      scale: 1.1,
    });
  }, []);

  // Set randomized position for the roulette spin if cursor is outside
  useEffect(() => {
    if (isRolling) {
      if (rouletteAimX !== null) {
        randomRollXRef.current = rouletteAimX;
      } else {
        const canvas = canvasRef.current;
        if (canvas) {
          const width = canvas.width;
          const blockSize = Math.floor(Math.min(BASE_BLOCK_SIZE, Math.max(34, (width - 16) / COLS)));
          const shaftWidth = COLS * blockSize;
          const shaftLeft = Math.floor((width - shaftWidth) / 2);
          randomRollXRef.current = Math.floor(shaftLeft + 24 + Math.random() * (shaftWidth - 48));
        }
      }
    }
  }, [isRolling, rouletteAimX]);

  // Handle incoming drop action from Roulette
  useEffect(() => {
    if (dropAction) {
      const launchX = dropAction.x ?? randomRollXRef.current ?? undefined;
      if (dropAction.tier !== null) {
        spawnPickaxeWithTier(dropAction.tier, launchX);
      } else {
        spawnEmptyPuff(launchX);
      }
      randomRollXRef.current = null;
      onClearDropAction();
    }
  }, [dropAction, spawnPickaxeWithTier, spawnEmptyPuff, onClearDropAction]);

  // Initial block generation on mount
  useEffect(() => {
    if (blocksRef.current.length === 0) {
      const initialBlocks: MiningBlock[] = [];
      const numInitialRows = 16;
      for (let r = 0; r < numInitialRows; r++) {
        initialBlocks.push(...generateRow(r));
      }
      blocksRef.current = initialBlocks;
      highestGeneratedRowRef.current = numInitialRows - 1;
    }
  }, [generateRow]);

  // FULL GAME RESET LISTENER: Completely clears blocks, pickaxes, and camera!
  useEffect(() => {
    if (resetKey > 0) {
      pickaxesRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      cameraYRef.current = 0;
      targetCameraYRef.current = 0;
      screenShakeRef.current = 0;

      const initialBlocks: MiningBlock[] = [];
      const numInitialRows = 16;
      for (let r = 0; r < numInitialRows; r++) {
        initialBlocks.push(...generateRow(r));
      }
      blocksRef.current = initialBlocks;
      highestGeneratedRowRef.current = numInitialRows - 1;
    }
  }, [resetKey, generateRow]);

  // Handle explosions (TNT)
  const triggerExplosion = useCallback((centerX: number, centerY: number, radius: number = 95, baseDamage: number = 80) => {
    sound.playExplosion();
    screenShakeRef.current = 14;

    // Explosion particles
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const colors = ['#EF4444', '#F59E0B', '#FBBF24', '#78350F', '#4B5563'];
      particlesRef.current.push({
        id: `exp_${Date.now()}_${i}`,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        gravity: 0.1,
      });
    }

    // Damage all blocks within blast radius
    const blocks = blocksRef.current;
    const blocksToRemove: MiningBlock[] = [];

    blocks.forEach(block => {
      const blockCenterX = block.x + block.width / 2;
      const blockCenterY = block.y + block.height / 2;
      const dist = Math.hypot(blockCenterX - centerX, blockCenterY - centerY);

      if (dist <= radius) {
        const falloff = 1 - dist / radius;
        const blastDmg = Math.max(1, Math.round(baseDamage * (0.5 + falloff)));
        block.hp -= blastDmg;
        block.hitFlashTimer = 6;

        if (block.hp <= 0) {
          blocksToRemove.push(block);
        }
      }
    });

    // Process blocks destroyed by the blast
    blocksToRemove.forEach(b => {
      const config = BLOCK_CONFIGS[b.type];
      const lvlRewardMult = 1 + (b.level - 1) * 0.45;
      onReward(Math.round(config.coinReward * lvlRewardMult), config.emeraldReward);
      if (onBlockDestroyed) onBlockDestroyed(b.type);

      // Chain reaction if another TNT
      if (b.type === 'tnt') {
        setTimeout(() => {
          triggerExplosion(b.x + b.width / 2, b.y + b.height / 2, 85, 60);
        }, 120);
      }
    });

    blocksRef.current = blocks.filter(b => b.hp > 0);
  }, [onReward, onBlockDestroyed]);

  // Main 60 FPS Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Handle screen shake decay
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (screenShakeRef.current > 0) {
        shakeOffsetX = (Math.random() - 0.5) * screenShakeRef.current;
        shakeOffsetY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
      }

      // Responsive Block & Shaft Geometry: Always perfectly centered and scaled
      const blockSize = Math.floor(Math.min(BASE_BLOCK_SIZE, Math.max(34, (width - 16) / COLS)));
      const shaftWidth = COLS * blockSize;
      const shaftLeft = Math.floor((width - shaftWidth) / 2);
      const shaftRight = shaftLeft + shaftWidth;
      const topStartOffset = 70;

      // Synchronize all blocks' physical bounding boxes to the active playing field
      const blocks = blocksRef.current;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        b.width = blockSize;
        b.height = blockSize;
        b.x = shaftLeft + b.col * blockSize;
        b.y = topStartOffset + b.row * blockSize;
      }

      // Smooth camera follow top-most active blocks
      if (blocks.length > 0) {
        let minRow = Infinity;
        for (let i = 0; i < blocks.length; i++) {
          if (blocks[i].row < minRow) minRow = blocks[i].row;
        }

        if (minRow !== Infinity && minRow > depth) {
          onDepthChange(minRow);
        }

        const idealCameraY = Math.max(0, (minRow - 1) * blockSize);
        targetCameraYRef.current = idealCameraY;
      }

      // Smooth camera interpolation
      cameraYRef.current += (targetCameraYRef.current - cameraYRef.current) * 0.08;

      // Ensure we have enough rows generated ahead of the camera
      const currentBottomRow = Math.floor((cameraYRef.current + height) / blockSize);
      while (highestGeneratedRowRef.current < currentBottomRow + 10) {
        highestGeneratedRowRef.current += 1;
        const newRowBlocks = generateRow(highestGeneratedRowRef.current);
        newRowBlocks.forEach(b => {
          b.width = blockSize;
          b.height = blockSize;
          b.x = shaftLeft + b.col * blockSize;
          b.y = topStartOffset + b.row * blockSize;
        });
        blocksRef.current.push(...newRowBlocks);
      }

      // Clear & Draw Biome Background
      ctx.save();
      ctx.translate(shakeOffsetX, shakeOffsetY);

      // Whole canvas background
      ctx.fillStyle = '#0f0f13';
      ctx.fillRect(0, 0, width, height);

      // Shaft Active Area Background
      ctx.fillStyle = currentBiome.bgColor;
      ctx.fillRect(shaftLeft, 0, shaftWidth, height);

      // Draw subtle mine shaft brick wall background texture inside shaft
      ctx.fillStyle = currentBiome.wallColor;
      const wallTileSize = Math.max(24, Math.floor(blockSize * 0.65));
      const startTileY = Math.floor(cameraYRef.current / wallTileSize) * wallTileSize;
      for (let y = startTileY; y < cameraYRef.current + height; y += wallTileSize) {
        for (let x = shaftLeft; x < shaftRight; x += wallTileSize) {
          const drawY = y - cameraYRef.current;
          if ((Math.floor(x / wallTileSize) + Math.floor(y / wallTileSize)) % 2 === 0) {
            const tileW = Math.min(wallTileSize, shaftRight - x);
            ctx.fillRect(x, drawY, tileW, wallTileSize);
          }
        }
      }

      // Draw Solid Stone Side Walls (Bedrock boundary)
      ctx.fillStyle = '#141417';
      ctx.fillRect(0, 0, shaftLeft, height);
      ctx.fillRect(shaftRight, 0, width - shaftRight, height);

      // Side wall divider lines (Cobblestone border)
      ctx.fillStyle = '#374151';
      ctx.fillRect(shaftLeft - 2, 0, 2, height);
      ctx.fillRect(shaftRight, 0, 2, height);

      // Shadow on shaft edges for depth
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(shaftLeft, 0, 6, height);
      ctx.fillRect(shaftRight - 6, 0, 6, height);

      // --- RENDER BLOCKS ---
      const destroyedBlocks: MiningBlock[] = [];

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const screenY = b.y - cameraYRef.current;

        // Viewport culling
        if (screenY + b.height < 0 || screenY > height) continue;

        const texture = getBlockTexture(b.type);
        ctx.drawImage(texture, b.x, screenY, b.width, b.height);

        // Flash white on hit
        if (b.hitFlashTimer && b.hitFlashTimer > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillRect(b.x, screenY, b.width, b.height);
          b.hitFlashTimer--;
        }

        // Crack overlay according to damage percentage
        const damagePercent = (b.maxHp - b.hp) / b.maxHp;
        if (damagePercent > 0.08) {
          const crackStage = Math.floor(damagePercent * 10);
          const crackOverlay = getCrackOverlay(crackStage);
          ctx.drawImage(crackOverlay, b.x, screenY, b.width, b.height);
        }

        // Bedrock Boss label / health bar if special
        if (b.type === 'bedrock_boss') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(b.x + 2, screenY + b.height - 8, b.width - 4, 6);
          ctx.fillStyle = '#A855F7';
          const hpRatio = Math.max(0, b.hp / b.maxHp);
          ctx.fillRect(b.x + 2, screenY + b.height - 8, (b.width - 4) * hpRatio, 6);
        }
      }

      // --- UPDATE & RENDER PICKAXES ---
      const pickaxes = pickaxesRef.current;

      // Report active pickaxes count to parent
      if (onActiveCountChange) {
        const maxActive = BASE_MAX_ACTIVE_PICKAXES + upgrades.maxPickaxesLimit;
        onActiveCountChange(pickaxes.length, maxActive);
      }

      for (let i = pickaxes.length - 1; i >= 0; i--) {
        const p = pickaxes[i];

        // Apply physics (slow graceful gravity, heavier for higher tiers)
        p.vy = Math.min(p.vy + p.gravity, p.maxSpeedY);
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.vRot;
        p.lifeTime++;

        // Wall collisions (elastic bounce off left and right shaft boundaries)
        if (p.x - p.radius < shaftLeft) {
          p.x = shaftLeft + p.radius;
          p.vx = Math.abs(p.vx) * 0.75 + (0.5 + Math.random() * 0.4);
          p.vRot = (Math.random() - 0.5) * 0.2;
        } else if (p.x + p.radius > shaftRight) {
          p.x = shaftRight - p.radius;
          p.vx = -Math.abs(p.vx) * 0.75 - (0.5 + Math.random() * 0.4);
          p.vRot = (Math.random() - 0.5) * 0.2;
        }

        // Block collisions
        for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
          const b = blocks[bIdx];

          // Circle-rectangle collision
          const nearestX = Math.max(b.x, Math.min(p.x, b.x + b.width));
          const nearestY = Math.max(b.y, Math.min(p.y, b.y + b.height));
          const dx = p.x - nearestX;
          const dy = p.y - nearestY;
          const distSq = dx * dx + dy * dy;

          if (distSq < p.radius * p.radius) {
            // Determine bounce rebound normal
            const overlapX = p.radius - Math.abs(dx);
            const overlapY = p.radius - Math.abs(dy);

            if (overlapX < overlapY) {
              // Side rebound
              p.vx = (dx > 0 ? 1 : -1) * Math.max(1.2, Math.abs(p.vx) * 0.75 + 0.5);
              p.x += dx > 0 ? overlapX : -overlapX;
            } else {
              // Vertical elastic rebound: bouncy jump upwards!
              const reboundSpeed = Math.max(2.2, Math.abs(p.vy) * 0.65 + 1.4);
              p.vy = -reboundSpeed;
              p.y += dy > 0 ? overlapY : -overlapY;
            }

            p.vRot = (Math.random() - 0.5) * 0.25;

            // Damage block
            const actualDamage = p.damage;
            b.hp -= actualDamage;
            b.hitFlashTimer = 4;

            // Pickaxe durability loss based on block toughness
            const blockConfig = BLOCK_CONFIGS[b.type];
            const wear = Math.max(3, Math.round(blockConfig.baseHp / 450 + 4));
            p.hp -= wear;

            // Hit sound
            sound.playHit(b.type);

            // Floating damage indicator
            floatingTextsRef.current.push({
              id: `dmg_${Date.now()}_${Math.random()}`,
              x: p.x,
              y: p.y - 10,
              text: `-${actualDamage}`,
              color: '#F87171',
              alpha: 1,
              life: 0,
              maxLife: 22,
              vy: -1.2,
              scale: 1.0,
            });

            // Hit debris particles
            for (let k = 0; k < 4; k++) {
              particlesRef.current.push({
                id: `debris_${Date.now()}_${k}`,
                x: nearestX,
                y: nearestY,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2.2,
                size: 3 + Math.random() * 2,
                color: blockConfig.particleColor,
                alpha: 1,
                life: 0,
                maxLife: 20,
                gravity: 0.12,
              });
            }

            // Netherite+ Cleave effect: damages neighbor blocks too
            if (p.tier >= 6 && Math.random() < 0.35) {
              const neighborBlocks = blocks.filter(
                nb => Math.abs(nb.col - b.col) <= 1 && Math.abs(nb.row - b.row) <= 1 && nb.id !== b.id
              );
              neighborBlocks.forEach(nb => {
                nb.hp -= Math.round(actualDamage * 0.4);
                nb.hitFlashTimer = 3;
                if (nb.hp <= 0 && !destroyedBlocks.includes(nb)) {
                  destroyedBlocks.push(nb);
                }
              });
            }

            // Check if block destroyed
            if (b.hp <= 0 && !destroyedBlocks.includes(b)) {
              destroyedBlocks.push(b);
            }

            break; // Stop checking other blocks for this pickaxe this frame
          }
        }

        // Draw pickaxe trail for higher tiers
        if (p.tier >= 4 && p.lifeTime % 2 === 0) {
          particlesRef.current.push({
            id: `trail_${Date.now()}_${Math.random()}`,
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: 2 + Math.random() * 2,
            color: p.bladeColor,
            alpha: 0.7,
            life: 0,
            maxLife: 15,
            gravity: 0,
          });
        }

        // Draw pickaxe sprite
        const screenY = p.y - cameraYRef.current;
        const sprite = getPickaxeSprite(p.tier);

        ctx.save();
        ctx.translate(p.x, screenY);
        ctx.rotate(p.angle);
        ctx.drawImage(sprite, -14, -14, 28, 28);
        ctx.restore();

        // Durability / HP Bar right above pickaxe
        const hpPercent = Math.max(0, p.hp / p.maxHp);
        const barW = 22;
        const barH = 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(p.x - barW / 2, screenY - 18, barW, barH);
        ctx.fillStyle = hpPercent > 0.5 ? '#22C55E' : hpPercent > 0.2 ? '#EAB308' : '#EF4444';
        ctx.fillRect(p.x - barW / 2, screenY - 18, Math.max(1, barW * hpPercent), barH);

        // Expire pickaxe if out of durability (HP <= 0) or too deep off screen
        if (p.hp <= 0 || screenY > height + 100) {
          // Break into sparkling pickaxe shards
          for (let s = 0; s < 6; s++) {
            particlesRef.current.push({
              id: `p_shards_${Date.now()}_${s}`,
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 3,
              size: 3,
              color: p.bladeColor,
              alpha: 0.9,
              life: 0,
              maxLife: 20,
              gravity: 0.2,
            });
          }
          pickaxes.splice(i, 1);
        }
      }

      // --- PROCESS DESTROYED BLOCKS ---
      if (destroyedBlocks.length > 0) {
        destroyedBlocks.forEach(b => {
          const config = BLOCK_CONFIGS[b.type];
          sound.playBreak(b.type);

          // Rewarding coins & emeralds based directly on block material
          const coinReward = config.coinReward;
          const emeraldReward = config.emeraldReward;

          onReward(coinReward, emeraldReward);
          if (onBlockDestroyed) onBlockDestroyed(b.type);

          // Explosive block break particle burst
          for (let k = 0; k < 9; k++) {
            particlesRef.current.push({
              id: `break_${Date.now()}_${k}`,
              x: b.x + b.width / 2,
              y: b.y + b.height / 2,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.7) * 5,
              size: 3 + Math.random() * 4,
              color: config.particleColor,
              alpha: 1,
              life: 0,
              maxLife: 28,
              gravity: 0.25,
            });
          }

          // Special Block Handlers
          if (b.type === 'tnt') {
            triggerExplosion(b.x + b.width / 2, b.y + b.height / 2, 95, 80);
          } else if (b.type === 'chest') {
            const chestCoins = 250 + Math.floor(Math.random() * 400);
            const chestEmeralds = 15 + Math.floor(Math.random() * 20);
            onReward(chestCoins, chestEmeralds);

            floatingTextsRef.current.push({
              id: `chest_${Date.now()}`,
              x: b.x + b.width / 2,
              y: b.y,
              text: `СУНДУК! +${chestCoins} 🪙 +${chestEmeralds} 💎`,
              color: '#FBBF24',
              alpha: 1,
              life: 0,
              maxLife: 45,
              vy: -2,
              scale: 1.2,
            });
          } else if (b.type === 'bedrock_boss') {
            sound.playLevelUp();
            screenShakeRef.current = 20;
            floatingTextsRef.current.push({
              id: `boss_${Date.now()}`,
              x: b.x + b.width / 2,
              y: b.y,
              text: `ПРОРЫВ БИОМА! +${config.coinReward} 🪙`,
              color: '#C084FC',
              alpha: 1,
              life: 0,
              maxLife: 50,
              vy: -2,
              scale: 1.4,
            });
          }
        });

        // Filter out destroyed blocks
        const destroyedIds = new Set(destroyedBlocks.map(d => d.id));
        blocksRef.current = blocks.filter(b => !destroyedIds.has(b.id));
      }

      // --- RENDER PARTICLES ---
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.gravity) pt.vy += pt.gravity;
        pt.life++;
        pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);

        if (pt.life >= pt.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const screenY = pt.y - cameraYRef.current;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.fillRect(pt.x, screenY, pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      // --- RENDER FLOATING TEXTS ---
      const texts = floatingTextsRef.current;
      for (let i = texts.length - 1; i >= 0; i--) {
        const ft = texts[i];
        ft.y += ft.vy;
        ft.life++;
        ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);

        if (ft.life >= ft.maxLife) {
          texts.splice(i, 1);
          continue;
        }

        const screenY = ft.y - cameraYRef.current;
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = `${Math.round(11 * (ft.scale || 1))}px "VT323", "Press Start 2P", monospace`;
        ctx.fillStyle = '#000000';
        ctx.fillText(ft.text, ft.x + 1, screenY + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, screenY);
        ctx.restore();
      }

      // --- DROPPER RAIL & ROULETTE LAUNCH OVERLAY (Top of shaft) ---
      // Top dropper station rail
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(shaftLeft, 0, shaftWidth, 54);
      ctx.fillStyle = '#334155';
      ctx.fillRect(shaftLeft, 52, shaftWidth, 2);

      // Dropper dispenser hatch graphics (centered base)
      const shaftCenter = shaftLeft + shaftWidth / 2;
      ctx.fillStyle = '#475569';
      ctx.fillRect(shaftCenter - 24, 6, 48, 38);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(shaftCenter - 16, 18, 32, 16);

      // ROULETTE SPINNING ANIMATION AT AIM POSITION (or randomized position if cursor was outside)
      const activeRollX = rouletteAimX ?? randomRollXRef.current;
      if (isRolling && activeRollX !== null) {
        ctx.save();
        // Golden glowing trajectory line
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(activeRollX, 54);
        ctx.lineTo(activeRollX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulsing glowing roulette aura at dropper hatch
        const pulse = 18 + Math.sin(Date.now() * 0.02) * 5;
        const grad = ctx.createRadialGradient(activeRollX, 34, 4, activeRollX, 34, pulse);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(activeRollX, 34, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Rapidly spinning pickaxe sprite in 360 degrees
        const spinSprite = getPickaxeSprite(spinningTier || 1);
        const spinAngle = (Date.now() * 0.035) % (Math.PI * 2);
        ctx.translate(activeRollX, 34);
        ctx.rotate(spinAngle);
        ctx.drawImage(spinSprite, -14, -14, 28, 28);
        ctx.restore();
      } else if (aimX !== null && aimX >= shaftLeft && aimX <= shaftRight) {
        // Normal interactive cursor aiming guide line & preview
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(aimX, 54);
        ctx.lineTo(aimX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Preview pickaxe at cursor
        const previewSprite = getPickaxeSprite(activeTier);
        ctx.drawImage(previewSprite, aimX - 12, 22, 24, 24);

        // Tactile helper prompt
        ctx.font = '10px "VT323", monospace';
        ctx.fillStyle = cooldownRemaining > 0 ? '#94A3B8' : '#FDE047';
        ctx.textAlign = 'center';
        ctx.fillText(
          cooldownRemaining > 0
            ? `${cooldownRemaining.toFixed(1)}с`
            : 'КЛИК: КРУТИТЬ',
          aimX,
          50
        );
        ctx.restore();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentBiome, generateRow, triggerExplosion, upgrades, onReward, onBlockDestroyed, onDepthChange, activeTier, highestTierUnlocked, aimX, onActiveCountChange, isRolling, rouletteAimX, spinningTier, cooldownRemaining]);

  // Adjust canvas size to parent container using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(container);
    }

    window.addEventListener('resize', updateSize);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Handle click or touch on the map: triggers roulette at aimX!
  const handleCanvasClick = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = canvas.width;
    const blockSize = Math.floor(Math.min(BASE_BLOCK_SIZE, Math.max(34, (width - 16) / COLS)));
    const shaftWidth = COLS * blockSize;
    const shaftLeft = Math.floor((width - shaftWidth) / 2);
    const shaftRight = shaftLeft + shaftWidth;

    const clampedX = Math.max(shaftLeft + 16, Math.min(shaftRight - 16, x));
    const maxActive = BASE_MAX_ACTIVE_PICKAXES + upgrades.maxPickaxesLimit;

    // Zero-latency tactical feedback if full or on cooldown
    if (isRolling) {
      return;
    }
    if (activePickaxesCount >= maxActive) {
      sound.playHit('dirt');
      floatingTextsRef.current.push({
        id: `cap_${Date.now()}`,
        x: clampedX - 35,
        y: 65 + cameraYRef.current,
        text: `Лимит кирок! (${activePickaxesCount}/${maxActive})`,
        color: '#FBBF24',
        alpha: 1,
        life: 0,
        maxLife: 26,
        vy: -1.3,
        scale: 1.0,
      });
      return;
    }
    if (cooldownRemaining > 0) {
      sound.playHit('dirt');
      floatingTextsRef.current.push({
        id: `cd_${Date.now()}`,
        x: clampedX - 30,
        y: 65 + cameraYRef.current,
        text: `Перезарядка: ${cooldownRemaining.toFixed(1)}с`,
        color: '#94A3B8',
        alpha: 1,
        life: 0,
        maxLife: 24,
        vy: -1.3,
        scale: 1.0,
      });
      return;
    }

    // Trigger roulette spin from this exact aim point!
    onRequestSpin(clampedX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    setAimX(currentX);
    if (onAimChange) {
      onAimChange(currentX);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#0c0d0e] select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair touch-none"
        onClick={(e) => handleCanvasClick(e.clientX, e.clientY)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setAimX(null);
          if (onAimChange) {
            onAimChange(null);
          }
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            const touch = e.touches[0];
            const canvas = canvasRef.current;
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              setAimX(touch.clientX - rect.left);
            }
            handleCanvasClick(touch.clientX, touch.clientY);
          }
        }}
      />

      {/* Depth & Biome Indicator */}
      <div className="absolute top-2 pointer-events-none flex flex-col items-center gap-0.5 text-center">
        <span className="text-[11px] font-mono tracking-wider text-slate-300 drop-shadow-md">
          {currentBiome.nameRu} (Глубина: {depth}m)
        </span>
      </div>
    </div>
  );
};
