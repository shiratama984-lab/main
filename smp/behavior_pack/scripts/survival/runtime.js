import { world, system, ItemStack, EntityDamageCause } from '@minecraft/server';
import { MINE_XP, COMBAT_XP, FARM_RIPE_STATES, FARM_XP } from './constants.js';
import { read, change, award, getTitle, skillLevel, xpNeeded } from './core.js';
const positions = new Map(), recentPlaced = new Map(), budgets = new Map(), lowHealth = new Set();
const DROP = { coal: 'coal', iron: 'raw_iron', gold: 'raw_gold', diamond: 'diamond', emerald: 'emerald', lapis: 'lapis_lazuli', redstone: 'redstone', copper: 'raw_copper', quartz: 'quartz' };
export function mature(id, permutation) { const ripe = FARM_RIPE_STATES[id]; if (ripe === undefined)
    return false; if (ripe === null)
    return true; return Object.entries(ripe).every(([key, value]) => permutation.getState(key) === value); }
function survival(p) { const mode = p.getGameMode?.(); return p.typeId === 'minecraft:player' && mode !== 'creative' && mode !== 'spectator'; }
export function gain(player, n, track) { if (!survival(player))
    return; const now = Date.now(), b = budgets.get(player.id) ?? { start: now, used: 0 }; if (now - b.start > 60000) {
    b.start = now;
    b.used = 0;
} const amount = Math.min(n, Math.max(0, 1200 - b.used)); if (!amount)
    return; let level = 0; change(player, d => { level = award(d, amount, track); }); b.used += amount; budgets.set(player.id, b); if (level) {
    const d = read(player);
    try {
        player.onScreenDisplay.setTitle('§6✦ Lv.' + d.lv + ' ✦');
        player.onScreenDisplay.updateSubtitle(getTitle(d.lv).text);
        player.playSound('random.levelup');
        player.dimension.spawnParticle('smp:levelup_burst', player.location);
        player.dimension.spawnParticle('smp:levelup_ring', player.location);
    }
    catch { }
} }
function effect(p, id, amp = 0, duration = 60) { try {
    const previous = p.getEffect?.(id);
    if (previous && previous.amplifier > amp)
        return;
    p.addEffect(id, duration, { amplifier: amp, showParticles: false });
}
catch { } }
function heal(p, n) { const h = p.getComponent('minecraft:health'); if (h)
    h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + n)); }
export function installProgression(api) {
    const run = fn => { try {
        if (api.getState())
            fn();
    }
    catch (e) {
        console.warn('[SMP 成長] ' + String(e));
    } };
    world.afterEvents.playerPlaceBlock.subscribe(e => { const l = e.block.location; recentPlaced.set(e.player.dimension.id + ':' + [l.x, l.y, l.z].join(','), Date.now()); if (recentPlaced.size > 4096)
        recentPlaced.delete(recentPlaced.keys().next().value); });
    world.afterEvents.playerBreakBlock.subscribe(e => run(() => { const p = e.player, id = e.brokenBlockPermutation.type.id, loc = e.block.location, key = p.dimension.id + ':' + [loc.x, loc.y, loc.z].join(','); if (!survival(p))
        return; if (recentPlaced.delete(key) && (!FARM_RIPE_STATES[id] || FARM_RIPE_STATES[id] === null))
        return; const d = read(p), active = new Set(d.active); if (MINE_XP[id]) {
        gain(p, MINE_XP[id], 'mine');
        const chance = active.has('mine_fortune') ? 0.25 : active.has('mine_silk') ? 0.1 : 0;
        if (Math.random() < chance) {
            const ore = Object.keys(DROP).find(k => id.includes(k) && id.endsWith('_ore'));
            if (ore)
                p.dimension.spawnItem(new ItemStack('minecraft:' + DROP[ore], 1), { x: loc.x + .5, y: loc.y + .5, z: loc.z + .5 });
        }
    }
    else if (mature(id, e.brokenBlockPermutation)) {
        if ((id === 'minecraft:sugar_cane' || id === 'minecraft:reeds') && p.dimension.getBlock({ x: loc.x, y: loc.y - 1, z: loc.z })?.typeId !== id)
            return;
        gain(p, (FARM_XP[id] ?? 5) * (active.has('farm_luck') && Math.random() < .1 ? 2 : 1), 'farm');
        if (active.has('farm_regen'))
            heal(p, 1);
    } }));
    world.afterEvents.entityDie.subscribe(e => run(() => { const p = e.damageSource?.damagingEntity; if (!p || p.typeId !== 'minecraft:player' || !COMBAT_XP[e.deadEntity.typeId])
        return; gain(p, COMBAT_XP[e.deadEntity.typeId], 'combat'); if (read(p).active.includes('combat_life'))
        heal(p, 3); }));
    world.afterEvents.entityHurt.subscribe(e => run(() => { const p = e.hurtEntity; if (p.typeId !== 'minecraft:player')
        return; const a = read(p).active; if (a.includes('combat_burst'))
        effect(p, 'speed', 1); const enemy = e.damageSource?.damagingEntity; if (a.includes('combat_thorns') && enemy && enemy.typeId !== 'minecraft:player' && Math.random() < .2)
        enemy.applyDamage(e.damage * .3, { cause: EntityDamageCause.thorns, damagingEntity: p }); }));
    world.afterEvents.itemCompleteUse.subscribe(e => run(() => { if (e.itemStack.getComponent('minecraft:food') && read(e.source).active.includes('farm_sat'))
        effect(e.source, 'saturation', 0, 1); }));
    const chat = /** @type {any} */ (world.beforeEvents).chatSend;
    if (chat)
        chat.subscribe(e => { try {
            const d = read(e.sender);
            if (!d.chat)
                return;
            e.cancel = true;
            system.run(() => world.sendMessage(getTitle(d.lv).color + '[Lv.' + d.lv + '] §r' + e.sender.name + ': ' + e.message));
        }
        catch { } });
    system.runInterval(() => {
        for (const p of world.getPlayers())
            run(() => {
                const d = read(p), a = new Set(d.active), inv = p.getComponent('minecraft:inventory')?.container, held = inv?.getItem(p.selectedSlotIndex ?? 0)?.typeId ?? '';
                if (held.includes('pickaxe') && (a.has('mine_haste1') || a.has('mine_haste2')))
                    effect(p, 'haste', a.has('mine_haste2') ? 1 : 0);
                if (a.has('mine_night'))
                    effect(p, 'night_vision', 0, 220);
                if (a.has('combat_str1') || a.has('combat_str2'))
                    effect(p, 'strength', a.has('combat_str2') ? 1 : 0);
                const h = p.getComponent('minecraft:health');
                if (a.has('combat_res') && h && h.currentValue / h.effectiveMax < .3)
                    effect(p, 'resistance');
                if (a.has('exp_speed1') || a.has('exp_speed2'))
                    effect(p, 'speed', a.has('exp_speed2') ? 1 : 0);
                if (a.has('exp_health'))
                    effect(p, 'health_boost');
                if (a.has('exp_feather'))
                    effect(p, 'slow_falling');
                if (a.has('exp_saturation'))
                    effect(p, 'saturation', 0, 25);
                if (d.hud) {
                    const need = xpNeeded(d.lv), fill = Math.min(10, Math.floor(d.xp / need * 10)), bar = '§e' + '▰'.repeat(fill) + '§8' + '▱'.repeat(10 - fill);
                    const warning = h && h.currentValue <= 6 ? '§c⚠ HP ' + Math.ceil(h.currentValue) + '  ' : '';
                    if (warning && !lowHealth.has(p.id)) {
                        try {
                            p.playSound('random.orb', { pitch: .5 });
                        }
                        catch { }
                        lowHealth.add(p.id);
                    }
                    if (!warning)
                        lowHealth.delete(p.id);
                    p.onScreenDisplay.setActionBar(`${warning}§bLv.${d.lv} §r${getTitle(d.lv).text}  §6${api.getState().players[p.id]?.balance ?? 0} C\n${bar} §7${d.xp}/${need}  §b⛏${skillLevel(d.mine)} §c⚔${skillLevel(d.combat)} §a☘${skillLevel(d.farm)} §d◈${skillLevel(d.explore)}`);
                }
                if (d.nameTag)
                    p.nameTag = getTitle(d.lv).color + 'Lv.' + d.lv + ' §c♥' + Math.ceil(h?.currentValue ?? 20) + ' §f' + p.name;
                const last = positions.get(p.id);
                positions.set(p.id, { ...p.location, dim: p.dimension.id });
                if (last && last.dim === p.dimension.id && survival(p) && !p.isFlying && !p.isGliding) {
                    const moved = Math.hypot(p.location.x - last.x, p.location.z - last.z);
                    if (moved > .1 && moved < 12) {
                        let xp = 0;
                        change(p, data => { const before = Math.floor(data.dist / 1000); data.dist += moved; xp = Math.floor(data.dist / 1000) - before; });
                        if (xp)
                            gain(p, xp * 20, 'explore');
                    }
                }
                if (d.menuHotbar && inv) {
                    const slot = inv?.getItem(8);
                    if (!slot) {
                        const existing = Array.from({ length: inv.size }, (_, i) => i).find(i => inv.getItem(i)?.typeId === 'smp:menu');
                        if (existing !== undefined) {
                            inv.setItem(8, inv.getItem(existing));
                            inv.setItem(existing, undefined);
                        }
                    }
                }
            });
    }, 20);
    system.runInterval(() => { for (const p of world.getPlayers())
        run(() => { if (!read(p).active.includes('mine_xray'))
            return; let count = 0; for (let x = -3; x <= 3 && count < 64; x++)
            for (let z = -3; z <= 3 && count < 64; z++) {
                count++;
                const loc = { x: Math.floor(p.location.x) + x, y: Math.floor(p.location.y) - 1, z: Math.floor(p.location.z) + z };
                const block = p.dimension.getBlock(loc);
                if (block && block.typeId.endsWith('_ore'))
                    try {
                        p.dimension.spawnParticle('minecraft:critical_hit_emitter', { x: loc.x + .5, y: loc.y + .5, z: loc.z + .5 });
                    }
                    catch { }
            } }); for (const [key, t] of recentPlaced)
        if (Date.now() - t > 600000)
            recentPlaced.delete(key); const online = new Set(world.getPlayers().map(p => p.id)); for (const key of positions.keys())
        if (!online.has(key))
            positions.delete(key); for (const [key, b] of budgets)
        if (Date.now() - b.start > 600000)
            budgets.delete(key); }, 100);
}
