export const TAG = "smp_player";
export const DATA_KEY = "smp_data";
// ─── 採掘XP ─────────────────────────────────────────────────
export const MINE_XP = {
    // 鉱石（高XP）
    "minecraft:diamond_ore": 30, "minecraft:deepslate_diamond_ore": 35,
    "minecraft:emerald_ore": 40, "minecraft:deepslate_emerald_ore": 45,
    "minecraft:ancient_debris": 80,
    "minecraft:gold_ore": 15, "minecraft:deepslate_gold_ore": 18,
    "minecraft:iron_ore": 10, "minecraft:deepslate_iron_ore": 12,
    "minecraft:coal_ore": 5, "minecraft:deepslate_coal_ore": 6,
    "minecraft:lapis_ore": 20, "minecraft:deepslate_lapis_ore": 22,
    "minecraft:redstone_ore": 12, "minecraft:deepslate_redstone_ore": 14,
    "minecraft:copper_ore": 8, "minecraft:deepslate_copper_ore": 9,
    "minecraft:nether_gold_ore": 12, "minecraft:nether_quartz_ore": 8,
    "minecraft:obsidian": 5, "minecraft:crying_obsidian": 8,
    // 石系（低XP）
    "minecraft:stone": 1, "minecraft:cobblestone": 1,
    "minecraft:deepslate": 2, "minecraft:cobbled_deepslate": 2,
    "minecraft:smooth_stone": 1, "minecraft:stone_bricks": 1,
    "minecraft:mossy_cobblestone": 1, "minecraft:mossy_stone_bricks": 1,
    "minecraft:andesite": 1, "minecraft:diorite": 1,
    "minecraft:granite": 1, "minecraft:blackstone": 2,
    "minecraft:basalt": 1, "minecraft:netherrack": 1,
    "minecraft:sandstone": 1, "minecraft:red_sandstone": 1,
    "minecraft:nether_brick": 1, "minecraft:calcite": 1,
    "minecraft:tuff": 1, "minecraft:dripstone_block": 1,
    // 土・砂系（1XP）
    "minecraft:dirt": 1, "minecraft:grass": 1,
    "minecraft:sand": 1, "minecraft:gravel": 1,
    "minecraft:clay": 2, "minecraft:soul_sand": 1,
    "minecraft:soul_soil": 1,
    // 木材系（1XP）
    "minecraft:oak_log": 1, "minecraft:spruce_log": 1,
    "minecraft:birch_log": 1, "minecraft:jungle_log": 1,
    "minecraft:acacia_log": 1, "minecraft:dark_oak_log": 1,
    "minecraft:mangrove_log": 1, "minecraft:cherry_log": 1,
    "minecraft:crimson_stem": 1, "minecraft:warped_stem": 1,
};
// ─── 戦闘XP ─────────────────────────────────────────────────
export const COMBAT_XP = {
    "minecraft:ender_dragon": 500, "minecraft:wither": 300,
    "minecraft:warden": 200, "minecraft:elder_guardian": 150,
    "minecraft:ravager": 80, "minecraft:evoker": 60,
    "minecraft:piglin_brute": 50, "minecraft:guardian": 40,
    "minecraft:blaze": 35, "minecraft:wither_skeleton": 35,
    "minecraft:enderman": 30, "minecraft:phantom": 25,
    "minecraft:creeper": 20, "minecraft:zombie_pigman": 20,
    "minecraft:skeleton": 15, "minecraft:cave_spider": 15,
    "minecraft:spider": 12, "minecraft:zombie": 10,
    "minecraft:magma_cube": 8, "minecraft:slime": 5,
};
// ─── 農業XP ─────────────────────────────────────────────────
export const FARM_XP = {
    "minecraft:wheat": 8,
    "minecraft:potatoes": 8,
    "minecraft:carrots": 8,
    "minecraft:beetroot": 10,
    "minecraft:nether_wart": 12,
    "minecraft:pumpkin": 18,
    "minecraft:melon_block": 12,
};
export const FARM_RIPE_STATES = {
    "minecraft:wheat": { growth: 7 },
    "minecraft:potatoes": { growth: 7 },
    "minecraft:carrots": { growth: 7 },
    "minecraft:beetroot": { growth: 7 },
    "minecraft:nether_wart": { age: 3 },
    "minecraft:pumpkin": null,
    "minecraft:melon_block": null,
    "minecraft:sugar_cane": null,
};
export const FARM_BLOCKS = new Set(Object.keys(FARM_RIPE_STATES));
// ─── レベルXPカーブ ──────────────────────────────────────────
// Lv1→2: 80XP / Lv10→11: 1422XP / Lv50→51: 10636XP / Lv100→101: 25298XP
export function xpNeeded(lv) {
    return Math.floor(80 * Math.pow(lv, 1.25));
}
// ─── スキル系統レベル ────────────────────────────────────────
// 各スキルXPが200溜まるごとに+1（最大30）
export function skillLevel(xp) {
    return Math.min(30, Math.floor((xp ?? 0) / 200) + 1);
}
// ─── 称号（20段階）──────────────────────────────────────────
export const TITLES = [
    { min: 1, text: "新米クラフター", color: "§7" },
    { min: 5, text: "新米クラフター＋", color: "§7" },
    { min: 10, text: "新米クラフター＋＋", color: "§7" },
    { min: 15, text: "一般クラフター", color: "§f" },
    { min: 20, text: "一般クラフター＋", color: "§f" },
    { min: 25, text: "一般クラフター＋＋", color: "§f" },
    { min: 30, text: "中堅クラフター", color: "§a" },
    { min: 35, text: "中堅クラフター＋", color: "§a" },
    { min: 40, text: "中堅クラフター＋＋", color: "§a" },
    { min: 45, text: "上級クラフター", color: "§b" },
    { min: 50, text: "上級クラフター＋", color: "§b" },
    { min: 55, text: "上級クラフター＋＋", color: "§b" },
    { min: 60, text: "VIP", color: "§e" },
    { min: 65, text: "VIP＋", color: "§e" },
    { min: 70, text: "VIP＋＋", color: "§e" },
    { min: 75, text: "MVP", color: "§6" },
    { min: 80, text: "MVP＋", color: "§6" },
    { min: 85, text: "MVP＋＋", color: "§6" },
    { min: 90, text: "GOD", color: "§c§l" },
    { min: 95, text: "GOD＋", color: "§c§l" },
    { min: 100, text: "GOD＋＋", color: "§4§l" },
];
export function getTitle(lv) {
    let t = TITLES[0];
    for (const e of TITLES) {
        if (lv >= e.min)
            t = e;
    }
    return t;
}
// Native Bedrock block aliases; the reference also contained Java-style identifiers.
Object.assign(MINE_XP, { "minecraft:grass_block": 1, "minecraft:stonebrick": 1 });
Object.assign(COMBAT_XP, { "minecraft:husk": 10, "minecraft:drowned": 12, "minecraft:pillager": 20, "minecraft:vindicator": 30, "minecraft:witch": 25, "minecraft:hoglin": 20, "minecraft:zoglin": 20, "minecraft:zombie_villager": 10, "minecraft:breeze": 35, "minecraft:bogged": 18 });
FARM_RIPE_STATES["minecraft:reeds"] = null;
FARM_XP["minecraft:reeds"] = 5;
