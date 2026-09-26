/**
 * Procedural Pixel Art Generator for Minecraft Textures & Pickaxes
 * High performance, zero external asset dependencies, ultra-sharp pixel rendering.
 */

import { BlockId } from '../types/game';
import { PICKAXE_TIERS } from './constants';

const textureCache: Map<string, HTMLCanvasElement> = new Map();

// Helper to create an offscreen canvas
function createOffscreen(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Generate authentic 16x16 block texture
export function getBlockTexture(type: BlockId): HTMLCanvasElement {
  if (textureCache.has(type)) {
    return textureCache.get(type)!;
  }

  const canvas = createOffscreen(16, 16);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  // Pseudo-random deterministic noise function
  const seed = (x: number, y: number, s: number) => {
    const val = Math.sin(x * 12.9898 + y * 78.233 + s * 43758.5453) * 10000;
    return val - Math.floor(val);
  };

  if (type === 'dirt') {
    const browns = ['#866043', '#77543a', '#946c4d', '#6c4a31'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 1) * browns.length);
        ctx.fillStyle = browns[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'grass') {
    const browns = ['#866043', '#77543a', '#946c4d'];
    const greens = ['#5B8731', '#669837', '#4C7327', '#73A83D'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const grassDepth = 3 + Math.floor(seed(x, 1, 2) * 3);
        if (y < grassDepth) {
          const gIdx = Math.floor(seed(x, y, 3) * greens.length);
          ctx.fillStyle = greens[gIdx];
        } else {
          const bIdx = Math.floor(seed(x, y, 4) * browns.length);
          ctx.fillStyle = browns[bIdx];
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'wood') {
    const woods = ['#9C7A4A', '#8F6F41', '#A88452', '#7A5E35'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        // Vertical grain pattern
        const grain = (x % 3 === 0 ? 1 : 0) + Math.floor(seed(x, y, 5) * 2);
        ctx.fillStyle = woods[grain % woods.length];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'gravel') {
    const gravels = ['#828282', '#6D6D6D', '#969696', '#595959'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 21) * gravels.length);
        ctx.fillStyle = gravels[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'sandstone') {
    const sands = ['#D8C58D', '#CEBA82', '#E2D19B', '#C2AE74'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const layer = (Math.floor(y / 4) % 2 === 0 ? 0 : 1) + Math.floor(seed(x, y, 22) * 2);
        ctx.fillStyle = sands[layer % sands.length];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'stone') {
    const stones = ['#767676', '#696969', '#828282', '#5E5E5E'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 6) * stones.length);
        ctx.fillStyle = stones[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Subtle cobblestone mortar lines
    ctx.fillStyle = '#4D4D4D';
    for (let i = 0; i < 16; i += 4) {
      ctx.fillRect(i, 4 + (i % 8), 1, 1);
      ctx.fillRect(i, 11 + (i % 6), 1, 1);
    }
  } else if (type === 'andesite') {
    const ands = ['#888888', '#7B7B7B', '#969696', '#686868'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 23) * ands.length);
        ctx.fillStyle = ands[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'diorite') {
    const diors = ['#C4C4C4', '#E0E0E0', '#9E9E9E', '#FFFFFF'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 24) * diors.length);
        ctx.fillStyle = diors[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'granite') {
    const grans = ['#9A6B59', '#AA7663', '#835B4C', '#B5826F'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 25) * grans.length);
        ctx.fillStyle = grans[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'deepslate') {
    const deeps = ['#34343B', '#27272D', '#3F3F47', '#1F1F24'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const band = (Math.floor((y + seed(x, y, 26) * 2) / 3) % 2 === 0 ? 0 : 1);
        ctx.fillStyle = deeps[(band + Math.floor(seed(x, y, 27) * 2)) % deeps.length];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'tuff') {
    const tuffs = ['#4F5448', '#42463C', '#5C6254', '#363930'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 28) * tuffs.length);
        ctx.fillStyle = tuffs[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'amethyst_block') {
    const ameths = ['#8B5CF6', '#7C3AED', '#A78BFA', '#6D28D9'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 29) * ameths.length);
        ctx.fillStyle = ameths[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Crystal shimmer highlight
    ctx.fillStyle = '#DDD6FE';
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(10, 10, 2, 2);
  } else if (type === 'netherrack') {
    const neths = ['#682020', '#541919', '#7D2727', '#421414'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 30) * neths.length);
        ctx.fillStyle = neths[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'soul_sand') {
    const souls = ['#513E32', '#433328', '#634C3D', '#362920'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 31) * souls.length);
        ctx.fillStyle = souls[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Ghostly face impression
    ctx.fillStyle = '#362920';
    ctx.fillRect(4, 5, 2, 2);
    ctx.fillRect(10, 5, 2, 2);
    ctx.fillRect(6, 10, 4, 2);
  } else if (type === 'basalt') {
    const basalts = ['#4F4F54', '#3A3A3F', '#5F5F66', '#2D2D33'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        // Vertical column pattern
        const col = (x % 4 === 0 ? 1 : 0) + Math.floor(seed(x, y, 32) * 2);
        ctx.fillStyle = basalts[col % basalts.length];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'blackstone') {
    const blacks = ['#272228', '#1F1B20', '#342E36', '#171418'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 33) * blacks.length);
        ctx.fillStyle = blacks[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'crying_obsidian') {
    const obs = ['#160E24', '#1A112B', '#23143B', '#2E1A4E'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 34) * obs.length);
        ctx.fillStyle = obs[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Glowing crying tears
    ctx.fillStyle = '#C084FC';
    ctx.fillRect(5, 4, 2, 4);
    ctx.fillRect(11, 7, 2, 5);
    ctx.fillStyle = '#F3E8FF';
    ctx.fillRect(5, 5, 1, 2);
    ctx.fillRect(11, 8, 1, 2);
  } else if (type === 'end_stone') {
    const ends = ['#DCDE9F', '#CECF91', '#E8EAB5', '#BCBD83'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 35) * ends.length);
        ctx.fillStyle = ends[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'purpur') {
    const purs = ['#A97CA9', '#966D96', '#B88EB8', '#855E85'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const border = (x === 0 || x === 15 || y === 0 || y === 15) ? 1 : 0;
        ctx.fillStyle = border ? '#745174' : purs[Math.floor(seed(x, y, 36) * purs.length)];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type.includes('ore')) {
    const isDeepslateOre = type.startsWith('deepslate_');

    if (isDeepslateOre) {
      // Deepslate dark banded base
      const deeps = ['#34343B', '#27272D', '#3F3F47', '#1F1F24'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const band = (Math.floor((y + seed(x, y, 26) * 2) / 3) % 2 === 0 ? 0 : 1);
          ctx.fillStyle = deeps[(band + Math.floor(seed(x, y, 27) * 2)) % deeps.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else {
      // Standard Stone base
      const stones = ['#767676', '#696969', '#828282', '#5E5E5E'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const idx = Math.floor(seed(x, y, 7) * stones.length);
          ctx.fillStyle = stones[idx];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Ore mineral colors
    let oreColors: string[] = [];
    if (type.includes('coal')) oreColors = ['#1C1C1C', '#333333', '#111111'];
    else if (type.includes('copper')) oreColors = ['#D97706', '#B45309', '#F59E0B', '#10B981'];
    else if (type.includes('iron')) oreColors = ['#D1B499', '#BFA082', '#E2CDB7'];
    else if (type.includes('gold')) oreColors = ['#FBBF24', '#F59E0B', '#FEF08A'];
    else if (type.includes('lapis')) oreColors = ['#1D4ED8', '#2563EB', '#60A5FA'];
    else if (type.includes('redstone')) oreColors = ['#DC2626', '#EF4444', '#F87171'];
    else if (type.includes('diamond')) oreColors = ['#2DD4BF', '#0D9488', '#99F6E4'];
    else if (type.includes('emerald')) oreColors = ['#10B981', '#059669', '#6EE7B7'];

    // Place 3 clusters of mineral spots
    const clusters = [
      { cx: 4, cy: 5 },
      { cx: 11, cy: 4 },
      { cx: 7, cy: 11 },
      { cx: 12, cy: 12 },
    ];
    clusters.forEach((c, cIdx) => {
      const spots = [
        [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]
      ];
      spots.forEach(([dx, dy], sIdx) => {
        const nx = c.cx + dx;
        const ny = c.cy + dy;
        if (nx >= 0 && nx < 16 && ny >= 0 && ny < 16 && seed(nx, ny, cIdx + sIdx) > 0.25) {
          const colorIdx = Math.floor(seed(nx, ny, 99) * oreColors.length);
          ctx.fillStyle = oreColors[colorIdx];
          ctx.fillRect(nx, ny, 1, 1);
        }
      });
    });
  } else if (type === 'ancient_debris') {
    const debris = ['#49372F', '#5E483D', '#3B2C25', '#73584A'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const ring = Math.floor(Math.sin((y + seed(x, y, 9)) * 0.8) * 2 + 2);
        ctx.fillStyle = debris[ring % debris.length];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'obsidian') {
    const obs = ['#160E24', '#1A112B', '#23143B', '#2E1A4E', '#482075'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 10) * obs.length);
        ctx.fillStyle = obs[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  } else if (type === 'tnt') {
    // Red body with white middle stripe and "TNT" pixel text
    ctx.fillStyle = '#DB2727';
    ctx.fillRect(0, 0, 16, 16);

    // Dark grooves
    ctx.fillStyle = '#B91C1C';
    for (let i = 0; i < 16; i += 4) {
      ctx.fillRect(i, 0, 1, 16);
    }

    // White middle banner
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 5, 16, 6);

    // "TNT" pixel lettering
    ctx.fillStyle = '#0F172A';
    // T
    ctx.fillRect(2, 6, 3, 1);
    ctx.fillRect(3, 7, 1, 3);
    // N
    ctx.fillRect(6, 6, 1, 4);
    ctx.fillRect(7, 7, 1, 1);
    ctx.fillRect(8, 8, 1, 1);
    ctx.fillRect(9, 6, 1, 4);
    // T
    ctx.fillRect(11, 6, 3, 1);
    ctx.fillRect(12, 7, 1, 3);

    // Top fuse ring
    ctx.fillStyle = '#333333';
    ctx.fillRect(7, 0, 2, 2);
  } else if (type === 'chest') {
    // Wood texture
    ctx.fillStyle = '#9C6E3B';
    ctx.fillRect(0, 0, 16, 16);
    // Dark border
    ctx.fillStyle = '#68451D';
    ctx.strokeRect(0.5, 0.5, 15, 15);
    ctx.fillRect(0, 6, 16, 1);
    // Lock in center
    ctx.fillStyle = '#D4D4D8';
    ctx.fillRect(6, 5, 4, 4);
    ctx.fillStyle = '#27272A';
    ctx.fillRect(7, 6, 2, 2);
  } else if (type === 'bedrock_boss') {
    const rocks = ['#1C1C1C', '#282828', '#111111', '#3A3A3A', '#4F4F4F'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const idx = Math.floor(seed(x, y, 15) * rocks.length);
        ctx.fillStyle = rocks[idx];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Bedrock boss metallic core runes
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(7, 5, 2, 6);
    ctx.fillRect(5, 7, 6, 2);
  }

  textureCache.set(type, canvas);
  return canvas;
}

// Generate the 10 Minecraft crack overlay stages
const crackStages: HTMLCanvasElement[] = [];

export function getCrackOverlay(stage: number): HTMLCanvasElement {
  const clampedStage = Math.max(0, Math.min(9, stage));
  if (crackStages[clampedStage]) {
    return crackStages[clampedStage];
  }

  const canvas = createOffscreen(16, 16);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  // Draw authentic fracture lines
  const density = (clampedStage + 1) * 3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

  const lines = [
    [7, 7], [8, 7], [8, 8], [9, 8], [10, 9], [11, 10],
    [6, 6], [5, 6], [4, 5], [3, 4], [2, 3],
    [7, 9], [6, 10], [6, 11], [5, 12], [4, 13],
    [9, 6], [10, 5], [11, 5], [12, 4], [13, 3],
    [7, 8], [5, 8], [4, 9], [3, 10],
    [8, 5], [8, 4], [9, 3], [10, 2],
    [10, 8], [11, 8], [12, 9], [13, 10],
    [5, 4], [4, 3], [3, 2], [11, 12], [12, 13]
  ];

  const pointsToDraw = Math.min(lines.length, density);
  for (let i = 0; i < pointsToDraw; i++) {
    const [x, y] = lines[i];
    ctx.fillRect(x, y, 1, 1);
    if (clampedStage > 5) {
      // Thicker cracks for advanced damage
      ctx.fillRect(x + 1, y, 1, 1);
    }
  }

  crackStages[clampedStage] = canvas;
  return canvas;
}

// Generate pickaxe pixel art sprite
const pickaxeSprites: Map<number, HTMLCanvasElement> = new Map();

export function getPickaxeSprite(tierNumber: number): HTMLCanvasElement {
  if (pickaxeSprites.has(tierNumber)) {
    return pickaxeSprites.get(tierNumber)!;
  }

  const tier = PICKAXE_TIERS.find(t => t.tier === tierNumber) || PICKAXE_TIERS[0];
  const canvas = createOffscreen(24, 24);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  const handleDark = tier.handleColor;
  const handleLight = '#8B5A2B';
  const blade = tier.bladeColor;
  const bladeDark = tier.color;
  const highlight = '#FFFFFF';

  // Draw diagonal handle from bottom-left (4, 20) to (14, 10)
  const handlePixels = [
    [4, 19], [5, 18], [6, 17], [7, 16],
    [8, 15], [9, 14], [10, 13], [11, 12],
    [12, 11], [13, 10], [14, 9]
  ];

  handlePixels.forEach(([x, y]) => {
    ctx.fillStyle = handleDark;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = handleLight;
    ctx.fillRect(x, y - 1, 1, 1);
  });

  // Pickaxe Head blade
  // Top curve / horns
  const bladePixels = [
    // Left claw tip
    [7, 6], [8, 6], [9, 7], [10, 8],
    // Center arch
    [11, 8], [12, 7], [13, 6], [14, 6], [15, 6], [16, 7],
    // Right claw tip
    [17, 8], [18, 9], [18, 10], [19, 11], [19, 12]
  ];

  bladePixels.forEach(([x, y]) => {
    ctx.fillStyle = blade;
    ctx.fillRect(x, y, 2, 2);
  });

  // Dark shading for depth
  const darkBladePixels = [
    [7, 7], [8, 7], [17, 9], [18, 11], [19, 13], [14, 8], [15, 8]
  ];
  darkBladePixels.forEach(([x, y]) => {
    ctx.fillStyle = bladeDark;
    ctx.fillRect(x, y, 1, 1);
  });

  // Specular sheen highlight
  ctx.fillStyle = highlight;
  ctx.fillRect(14, 6, 1, 1);
  ctx.fillRect(15, 6, 1, 1);
  ctx.fillRect(8, 6, 1, 1);

  // Outer glow if tier >= 4
  if (tier.glowColor) {
    ctx.shadowColor = tier.glowColor;
    ctx.shadowBlur = 4;
  }

  pickaxeSprites.set(tierNumber, canvas);
  return canvas;
}
