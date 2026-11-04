export const CLASS_NAMES = { warrior: '戦士', mage: '魔法使い', ranger: '弓使い' };
export const SPELLS = {
    ember: { name: '火炎弾', level: 1, cost: 8, cooldown: 2400, damage: 7, range: 14, icon: 'flame', description: '視線の先の魔物1体を攻撃。地形を燃やしません。' },
    frost: { name: '氷結', level: 3, cost: 12, cooldown: 4000, damage: 5, range: 12, icon: 'frost', description: '魔物1体を攻撃し、4秒間移動を遅くします。' },
    heal: { name: '癒やし', level: 1, cost: 14, cooldown: 8000, damage: 0, range: 0, icon: 'heal', description: '自分の体力を6回復します。' }
};
export const QUESTS = [
    { id: 'first_hunt', name: '街道の安全を守れ', kind: 'hunt', target: 3, reward: 100, xp: 40, description: 'ゾンビ・スケルトン・野盗などの敵を3体討伐。' },
    { id: 'iron_supply', name: '鍛冶屋への納品', kind: 'delivery', item: 'minecraft:iron_ingot', count: 8, reward: 140, xp: 50, description: '鉄インゴット8個を納品。' },
    { id: 'food_supply', name: '旅人の食糧', kind: 'delivery', item: 'minecraft:wheat', count: 32, reward: 50, xp: 25, description: '小麦32個を納品。' }
];
export const GOODS = [
    { id: 'wheat', item: 'minecraft:wheat', name: '小麦', count: 16, price: 12, side: 'sell', icon: 'wheat' },
    { id: 'wood', item: 'minecraft:oak_log', name: 'オークの原木', count: 16, price: 16, side: 'sell', icon: 'wood' },
    { id: 'stone', item: 'minecraft:cobblestone', name: '丸石', count: 32, price: 10, side: 'sell', icon: 'stone' },
    { id: 'iron', item: 'minecraft:iron_ingot', name: '鉄', count: 4, price: 36, side: 'sell', icon: 'iron' },
    { id: 'bread', item: 'minecraft:bread', name: 'パン', count: 8, price: 16, side: 'buy', icon: 'bread' },
    { id: 'blade', item: 'arpg:adventurer_blade', name: '冒険者の剣', count: 1, price: 90, side: 'buy', icon: 'sword' },
    { id: 'staff', item: 'arpg:oak_staff', name: '樫の杖', count: 1, price: 70, side: 'buy', icon: 'staff' },
    { id: 'arrow', item: 'minecraft:arrow', name: '矢', count: 16, price: 16, side: 'buy', icon: 'arrow' }
];
export const HOSTILES = new Set(['minecraft:zombie', 'minecraft:husk', 'minecraft:drowned', 'minecraft:skeleton', 'minecraft:stray', 'minecraft:wither_skeleton', 'minecraft:spider', 'minecraft:cave_spider', 'minecraft:creeper', 'minecraft:witch', 'minecraft:pillager', 'minecraft:vindicator', 'minecraft:evoker', 'minecraft:phantom', 'minecraft:blaze', 'minecraft:piglin_brute', 'arpg:raider', 'arpg:shade']);
export const FOUNDATION_COST = 300, CLAIM_COST = 80;
