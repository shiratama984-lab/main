// Data adapted from the user-provided SMP_Addon_v3.mcaddon.
export const MOB_SKILL_TABLE = {
    "minecraft:zombie": ["minecrafter", "summon_ally", "iron_wall", "berserker", "fire_proof"],
    "minecraft:zombie_villager": ["minecrafter", "summon_ally", "iron_wall", "berserker", "fire_proof"],
    "minecraft:husk": ["summon_ally", "berserker", "fire_proof", "swift"],
    "minecraft:drowned": ["summon_ally", "iron_wall", "regen", "berserker"],
    "minecraft:skeleton": ["minecrafter", "ninja", "poisoner", "swift", "aura"],
    "minecraft:stray": ["ninja", "poisoner", "swift", "iron_wall"],
    "minecraft:wither_skeleton": ["berserker", "iron_wall", "fire_proof", "aura"],
    "minecraft:creeper": ["ninja", "swift", "berserker"],
    "minecraft:spider": ["poisoner", "ninja", "swift", "summon_ally"],
    "minecraft:cave_spider": ["poisoner", "swift", "ninja"],
    "minecraft:enderman": ["ninja", "swift", "regen", "berserker"],
    "minecraft:blaze": ["fire_proof", "berserker", "aura"],
    "minecraft:pillager": ["minecrafter", "ninja", "swift", "aura"],
    "minecraft:vindicator": ["minecrafter", "berserker", "iron_wall", "aura"],
    "minecraft:witch": ["poisoner", "regen", "aura", "ninja"],
    "minecraft:hoglin": ["berserker", "summon_ally", "iron_wall", "swift"],
};
export const SKILL_LOOT = {
    "minecrafter": [
        ["minecraft:iron_pickaxe", "§b元マインクラフターの形見", 0.3, 1, 1],
        ["minecraft:mossy_cobblestone", null, 0.6, 2, 6],
    ],
    "summon_ally": [
        ["minecraft:rotten_flesh", "§e統率者の腐肉", 0.5, 1, 3],
        ["minecraft:bone", null, 0.3, 1, 4],
    ],
    "iron_wall": [
        ["minecraft:iron_ingot", null, 0.5, 1, 3],
        ["minecraft:shield", "§7守護の盾", 0.1, 1, 1],
    ],
    "berserker": [
        ["minecraft:blaze_powder", null, 0.4, 1, 3],
        ["minecraft:fermented_spider_eye", "§4怒りの結晶", 0.2, 1, 1],
    ],
    "poisoner": [
        ["minecraft:spider_eye", null, 0.5, 1, 3],
        ["minecraft:glass_bottle", null, 0.3, 1, 2],
    ],
    "aura": [
        ["minecraft:glowstone_dust", null, 0.5, 1, 4],
    ],
    "ninja": [
        ["minecraft:ender_pearl", null, 0.2, 1, 1],
    ],
    "_rare": [
        ["minecraft:diamond", "§bスキルの欠片", 0.05, 1, 1],
        ["minecraft:emerald", null, 0.15, 1, 1],
        ["minecraft:gold_ingot", null, 0.30, 1, 2],
    ],
};
