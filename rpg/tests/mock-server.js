export const hooks = { itemUse: [], interact: [], spawn: [], die: [], break: [], beforeInteract: [], explosion: [], script: [], intervals: [], timeouts: [] };
export const props = new Map(), players = [], entities = new Map(), messages = [];
export const port = { fail: false, getDynamicProperty: k => props.get(k), setDynamicProperty(k, v) { if (this.fail)
        throw Error('Disk full'); props.set(k, v); } };
export class ItemStack {
    constructor(typeId, amount) { this.typeId = typeId; this.amount = amount; this.maxAmount = typeId.startsWith('arpg:') || ['minecraft:shield', 'minecraft:bow'].includes(typeId) ? 1 : 64; }
}
export class Inventory {
    constructor(size = 12) { this.size = size; this.slots = Array(size); }
    getItem(i) { const s = this.slots[i]; return s ? Object.assign(new ItemStack(s.typeId, s.amount), s) : undefined; }
    setItem(i, s) { this.slots[i] = s ? Object.assign(new ItemStack(s.typeId, s.amount), s) : undefined; }
    addItem(item) { let n = item.amount; for (let i = 0; i < this.size && n; i++) {
        const s = this.slots[i];
        if (s?.typeId === item.typeId) {
            const k = Math.min(n, s.maxAmount - s.amount);
            s.amount += k;
            n -= k;
        }
    } for (let i = 0; i < this.size && n; i++)
        if (!this.slots[i]) {
            const k = Math.min(n, item.maxAmount);
            this.slots[i] = new ItemStack(item.typeId, k);
            n -= k;
        } return n ? new ItemStack(item.typeId, n) : undefined; }
}
let nextEntity = 0;
export const dimension = { id: 'minecraft:overworld', spawnParticle() { }, getBlock(loc) { return { location: loc, isAir: loc.y >= 64, isLiquid: false }; }, spawnEntity(typeId, location) { const id = 'e' + nextEntity++, dp = new Map(); const e = { id, typeId, location, dimension, isValid: true, health: 24, triggerEvent() { }, setDynamicProperty: (k, v) => dp.set(k, v), getDynamicProperty: k => dp.get(k), remove() { this.isValid = false; entities.delete(id); }, addEffect() { }, applyDamage(n) { this.health -= n; return true; } }; entities.set(id, e); return e; } };
export const EntityDamageCause = { magic: 'magic' };
const signal = list => ({ subscribe: f => list.push(f) });
export const world = { getDynamicProperty: k => port.getDynamicProperty(k), setDynamicProperty: (k, v) => port.setDynamicProperty(k, v), getPlayers: () => players, getDimension: () => dimension, getEntity: id => entities.get(id), afterEvents: { itemUse: signal(hooks.itemUse), playerInteractWithBlock: signal(hooks.interact), playerSpawn: signal(hooks.spawn), entityDie: signal(hooks.die) }, beforeEvents: { playerBreakBlock: signal(hooks.break), playerInteractWithBlock: signal(hooks.beforeInteract), explosion: signal(hooks.explosion) } };
export const system = { currentTick: 100, run: f => f(), runTimeout: f => hooks.timeouts.push(f), runInterval: (f, n) => hooks.intervals.push({ f, n }), afterEvents: { scriptEventReceive: signal(hooks.script) } };
export function player(id) { const inv = new Inventory(), health = { currentValue: 10, effectiveMax: 20, setCurrentValue(n) { this.currentValue = n; } }; return { id, name: id, typeId: 'minecraft:player', isValid: true, dimension, location: { x: 0, y: 64, z: 0 }, inventory: inv, health, tags: new Set(), getComponent(type) { if (type === 'minecraft:inventory')
        return { container: inv }; if (type === 'minecraft:health')
        return health; return {}; }, sendMessage: m => messages.push(m), hasTag(t) { return this.tags.has(t); }, getEntitiesFromViewDirection: () => [], onScreenDisplay: { setActionBar() { } } }; }
