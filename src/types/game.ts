/**
 * Game Types for Craft & Drop: Merge Pickaxe
 */

export type BlockId =
  | 'dirt'
  | 'grass'
  | 'wood'
  | 'gravel'
  | 'sandstone'
  | 'stone'
  | 'andesite'
  | 'diorite'
  | 'granite'
  | 'coal_ore'
  | 'copper_ore'
  | 'iron_ore'
  | 'deepslate'
  | 'deepslate_iron_ore'
  | 'deepslate_gold_ore'
  | 'deepslate_redstone_ore'
  | 'deepslate_diamond_ore'
  | 'tuff'
  | 'gold_ore'
  | 'lapis_ore'
  | 'redstone_ore'
  | 'diamond_ore'
  | 'emerald_ore'
  | 'amethyst_block'
  | 'netherrack'
  | 'soul_sand'
  | 'basalt'
  | 'blackstone'
  | 'crying_obsidian'
  | 'ancient_debris'
  | 'obsidian'
  | 'end_stone'
  | 'purpur'
  | 'tnt'
  | 'chest'
  | 'bedrock_boss';

export interface BlockConfig {
  id: BlockId;
  name: string;
  nameRu: string;
  baseHp: number;
  coinReward: number;
  emeraldReward: number;
  color: string;
  particleColor: string;
  isSpecial?: boolean;
}

export interface PickaxeTier {
  tier: number;
  id: string;
  name: string;
  nameRu: string;
  damage: number;
  hp: number; // Durability / Health pool of the pickaxe
  color: string;
  bladeColor: string;
  handleColor: string;
  cost: number;
  gravity: number; // Slow & smooth gravity
  maxSpeedY: number;
  glowColor?: string;
  specialEffectRu?: string;
}

export interface MiningBlock {
  id: string;
  col: number;
  row: number; // Global row number from depth
  type: BlockId;
  level: number; // Block level based on depth
  hp: number;
  maxHp: number;
  x: number; // Canvas coordinate x
  y: number; // Canvas coordinate y (world y)
  width: number;
  height: number;
  isHit?: boolean;
  hitFlashTimer?: number;
}

export interface DroppedPickaxe {
  id: string;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vRot: number; // Angular velocity
  radius: number;
  damage: number;
  hp: number; // Current pickaxe durability
  maxHp: number; // Maximum pickaxe durability
  color: string;
  bladeColor: string;
  gravity: number;
  maxSpeedY: number;
  lifeTime: number;
  specialEffect?: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity?: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
  scale?: number;
}

export interface InventorySlot {
  id: number;
  tier: number | null; // null if empty
  isLocked?: boolean;
}

export interface BiomeInfo {
  depthStart: number;
  depthEnd: number;
  name: string;
  nameRu: string;
  bgColor: string;
  wallColor: string;
  descriptionRu: string;
  allowedBlocks: BlockId[];
}

export interface UpgradeState {
  sharpness: number;         // +20% damage for all pickaxes
  pickaxeDurability: number; // +30% HP / durability for all pickaxes
  maxPickaxesLimit: number;  // +1 max active pickaxes in shaft
  dropCooldownSpeed: number; // decreases roulette drop cooldown
  doubleSpinChance: number;  // chance to spin 2 slots simultaneously
}
