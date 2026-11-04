import { world, system, ItemStack } from '@minecraft/server';
import { MOB_SKILL_TABLE, SKILL_LOOT } from './mob_skills_defs.js';
export const TRAITS = { minecrafter: { name: '元マインクラフター', weight: 15 }, summon_ally: { name: '仲間呼び', weight: 20 }, aura: { name: '強化オーラ', weight: 12 }, poisoner: { name: '毒持ち', weight: 18 }, iron_wall: { name: '鉄壁', weight: 12 }, swift: { name: '疾風', weight: 18 }, regen: { name: '再生', weight: 10 }, ninja: { name: '透明忍者', weight: 10 }, fire_proof: { name: '耐炎', weight: 15 }, berserker: { name: '怒り', weight: 12 } };
export function rollTraits(type, random = Math.random) { const options = MOB_SKILL_TABLE[type]; if (!options)
    return []; const r = random(), count = r < .4 ? 0 : r < .85 ? 1 : 2, pool = [...options], result = []; for (let j = 0; j < count; j++) {
    let n = random() * pool.reduce((v, k) => v + TRAITS[k].weight, 0);
    for (let i = 0; i < pool.length; i++) {
        n -= TRAITS[pool[i]].weight;
        if (n < 0) {
            result.push(pool[i]);
            pool.splice(i, 1);
            break;
        }
    }
} return result; }
const cooldowns = new Map();
function cooldown(id, kind, ms) { const key = id + ':' + kind, now = Date.now(); if (now < (cooldowns.get(key) ?? 0))
    return false; cooldowns.set(key, now + ms); return true; }
function skills(e) { return String(e.getDynamicProperty('smp:traits_v2') ?? '').split(',').filter(Boolean); }
function buff(e, name, amp = 0) { e.addEffect(name, 80, { amplifier: amp, showParticles: false }); }
const safeTerrain = new Set(['minecraft:stone', 'minecraft:cobblestone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:oak_planks', 'minecraft:spruce_planks', 'minecraft:torch', 'minecraft:wooden_door', 'minecraft:spruce_door']);
export function installMobs(api) {
    const enabled = () => api.getState() && (api.getState().settings?.enhancedMobs ?? true);
    function assign(e) { if (!enabled() || !MOB_SKILL_TABLE[e.typeId] || e.hasTag('smp.summoned') || e.getDynamicProperty('smp:traits_v2') !== undefined)
        return; e.setDynamicProperty('smp:base_name', e.nameTag ?? ''); e.setDynamicProperty('smp:traits_v2', rollTraits(e.typeId).join(',')); }
    world.afterEvents.entitySpawn.subscribe(e => system.run(() => { try {
        assign(e.entity);
    }
    catch { } }));
    world.afterEvents.entityHurt.subscribe(e => {
        if (!enabled())
            return;
        try {
            const mob = e.hurtEntity, attacker = e.damageSource?.damagingEntity;
            if (mob.typeId === 'minecraft:player' && attacker && skills(attacker).includes('poisoner'))
                mob.addEffect('poison', 80, { amplifier: 0 });
            if (attacker?.typeId !== 'minecraft:player' || !MOB_SKILL_TABLE[mob.typeId])
                return;
            const list = skills(mob);
            if (list.includes('minecrafter') && cooldown(mob.id, 'step', 3000)) {
                const dx = mob.location.x - attacker.location.x, dz = mob.location.z - attacker.location.z, n = Math.hypot(dx, dz) || 1;
                mob.applyKnockback({ x: dx / n * .9, z: dz / n * .9 }, .08);
            }
            if (list.includes('summon_ally') && cooldown(mob.id, 'summon', 15000) && (Number(mob.getDynamicProperty('smp:children')) || 0) < 2) {
                const crowd = mob.dimension.getEntities({ location: mob.location, maxDistance: 12 }).length;
                if (crowd < 24) {
                    const child = mob.dimension.spawnEntity(mob.typeId, { x: mob.location.x + 1.5, y: mob.location.y, z: mob.location.z + 1.5 });
                    child.addTag('smp.summoned');
                    child.setDynamicProperty('smp:traits_v2', '');
                    mob.setDynamicProperty('smp:children', (Number(mob.getDynamicProperty('smp:children')) || 0) + 1);
                }
            }
        }
        catch (e) {
            console.warn('[SMP モブ] ' + String(e));
        }
    });
    world.afterEvents.entityDie.subscribe(e => { try {
        const mob = e.deadEntity;
        if (e.damageSource?.damagingEntity?.typeId !== 'minecraft:player' || mob.hasTag('smp.summoned'))
            return;
        const list = skills(mob);
        if (!list.length)
            return;
        for (const entry of [...(SKILL_LOOT[list[0]] ?? []), ...(list.length > 1 ? SKILL_LOOT._rare : [])]) {
            const [id, name, chance, min, max] = entry;
            if (Math.random() >= chance)
                continue;
            const item = new ItemStack(String(id), Number(min) + Math.floor(Math.random() * (Number(max) - Number(min) + 1)));
            if (name)
                item.nameTag = String(name);
            mob.dimension.spawnItem(item, mob.location);
        }
    }
    catch { } });
    system.runInterval(() => {
        if (!api.getState())
            return;
        const nearby = new Map();
        for (const p of world.getPlayers()) {
            try {
                for (const mob of p.dimension.getEntities({ location: p.location, maxDistance: 20, excludeTypes: ['minecraft:player'] })) {
                    if (!MOB_SKILL_TABLE[mob.typeId])
                        continue;
                    const dist = Math.hypot(mob.location.x - p.location.x, mob.location.z - p.location.z);
                    if (!nearby.has(mob.id) || nearby.get(mob.id).dist > dist)
                        nearby.set(mob.id, { mob, p, dist });
                }
            }
            catch { }
        }
        let count = 0;
        for (const { mob, p, dist } of nearby.values()) {
            if (count++ >= 64)
                break;
            try {
                assign(mob);
                const list = skills(mob);
                if (!list.length)
                    continue;
                if (!enabled()) {
                    mob.nameTag = String(mob.getDynamicProperty('smp:base_name') ?? '');
                    continue;
                }
                const h = mob.getComponent('minecraft:health');
                mob.nameTag = '§e' + list.map(k => TRAITS[k]?.name ?? k).join('・') + '\n§f' + mob.typeId.replace('minecraft:', '') + ' §c♥' + Math.ceil(h?.currentValue ?? 0);
                for (const k of list) {
                    if (k === 'iron_wall')
                        buff(mob, 'resistance');
                    if (k === 'swift')
                        buff(mob, 'speed', 1);
                    if (k === 'regen')
                        buff(mob, 'regeneration');
                    if (k === 'fire_proof')
                        buff(mob, 'fire_resistance');
                    if (k === 'berserker')
                        buff(mob, 'strength', h && h.currentValue / h.effectiveMax < .5 ? 1 : 0);
                    if (k === 'ninja' && cooldown(mob.id, 'hide', 6000))
                        buff(mob, 'invisibility');
                    if (k === 'aura' && cooldown(mob.id, 'aura', 5000))
                        for (const a of mob.dimension.getEntities({ location: mob.location, maxDistance: 6 }))
                            if (MOB_SKILL_TABLE[a.typeId]) {
                                buff(a, 'strength');
                                buff(a, 'speed');
                            }
                }
                if (list.includes('minecrafter') && dist >= 2 && dist <= 6 && cooldown(mob.id, 'dash', 6000)) {
                    const dx = p.location.x - mob.location.x, dz = p.location.z - mob.location.z, n = Math.hypot(dx, dz) || 1;
                    mob.applyKnockback({ x: dx / n * .8, z: dz / n * .8 }, .2);
                }
                if (list.includes('minecrafter') && api.getState().settings?.mobTerrain && world.gameRules.mobGriefing && dist > 1 && dist < 8 && cooldown(mob.id, 'terrain', 3000)) {
                    const dx = Math.round((p.location.x - mob.location.x) / (dist || 1)), dz = Math.round((p.location.z - mob.location.z) / (dist || 1)), x = Math.floor(mob.location.x) + dx, z = Math.floor(mob.location.z) + dz, y = Math.floor(mob.location.y);
                    if (api.canMobEdit(mob.dimension.id, x, z)) {
                        const front = mob.dimension.getBlock({ x, y, z });
                        if (front && safeTerrain.has(front.typeId))
                            front.setType('minecraft:air');
                        const below = mob.dimension.getBlock({ x, y: y - 1, z }), above = mob.dimension.getBlock({ x, y, z });
                        if (below?.isAir && above?.isAir)
                            below.setType('minecraft:mossy_cobblestone');
                        if (p.location.y - mob.location.y >= 2 && p.location.y - mob.location.y <= 6 && front?.isAir) {
                            const head = mob.dimension.getBlock({ x, y: y + 1, z });
                            if (head?.isAir)
                                front.setType('minecraft:mossy_cobblestone');
                        }
                    }
                }
            }
            catch { }
        }
        const now = Date.now();
        for (const [key, t] of cooldowns)
            if (now > t + 60000)
                cooldowns.delete(key);
    }, 40);
}
