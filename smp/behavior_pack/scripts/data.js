import { displayName } from './locale.js';
import { texture } from './textures.js';
export const CONFIG = { starter: 100, daily: 100, claimPrice: 200, maxPlayers: 32, maxLots: 48, maxActivePerPlayer: 5, maxClaims: 64, maxPlayerClaims: 4, maxBid: 1000000, maxSupply: 1000000000 };
export const SHOP = [
    { id: 'wood', item: 'minecraft:oak_log', name: 'オークの原木', count: 16, buy: 40, sell: 12, icon: 'wood' },
    { id: 'stone', item: 'minecraft:cobblestone', name: '丸石', count: 32, buy: 30, sell: 8, icon: 'stone' },
    { id: 'wheat', item: 'minecraft:wheat', name: '小麦', count: 16, buy: 32, sell: 10, icon: 'wheat' },
    { id: 'iron', item: 'minecraft:iron_ingot', name: '鉄', count: 4, buy: 100, sell: 32, icon: 'iron' },
    { id: 'diamond', item: 'minecraft:diamond', name: 'ダイヤモンド', count: 1, buy: 250, sell: 80, icon: 'diamond' },
    { id: 'bread', item: 'minecraft:bread', name: 'パン', count: 8, buy: 20, sell: 5, icon: 'bread' },
    { id: 'torch', item: 'minecraft:torch', name: '松明', count: 16, buy: 12, sell: 2, icon: 'torch' }
];
// Restrict the first release to ordinary stackable commodities; never flatten container/equipment NBT.
export const COMMODITIES = new Set(['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log', 'oak_planks', 'spruce_planks', 'birch_planks', 'cherry_planks', 'cobblestone', 'stone', 'dirt', 'sand', 'gravel', 'glass', 'deepslate', 'cobbled_deepslate', 'obsidian', 'netherrack', 'end_stone', 'quartz', 'coal', 'charcoal', 'raw_iron', 'raw_copper', 'raw_gold', 'iron_ingot', 'copper_ingot', 'gold_ingot', 'netherite_ingot', 'diamond', 'emerald', 'lapis_lazuli', 'redstone', 'amethyst_shard', 'iron_block', 'gold_block', 'diamond_block', 'emerald_block', 'redstone_block', 'wheat', 'carrot', 'potato', 'baked_potato', 'beetroot', 'bread', 'apple', 'golden_apple', 'cooked_beef', 'cooked_chicken', 'cooked_porkchop', 'cooked_cod', 'cooked_salmon', 'sugar_cane', 'bamboo', 'kelp', 'dried_kelp', 'bone', 'bone_meal', 'rotten_flesh', 'string', 'spider_eye', 'gunpowder', 'ender_pearl', 'slime_ball', 'leather', 'feather', 'paper', 'book', 'stick', 'torch', 'white_wool', 'black_wool', 'snowball', 'egg', 'arrow'].map(x => 'minecraft:' + x));
export function label(id) { return SHOP.find(x => x.item === id)?.name ?? displayName(id); }
export function itemIcon(id) { return texture(id); }
export const DURATIONS = [{ label: '5分', ms: 300000 }, { label: '30分', ms: 1800000 }, { label: '2時間', ms: 7200000 }, { label: '24時間', ms: 86400000 }];
