export const hooks = { place: [], breakAfter: [], die: [], entitySpawn: [], consume: [], interactEntity: [], startup: [], itemUse: [], interact: [], spawn: [], hurt: [], break: [], beforeInteract: [], explosion: [], script: [], intervals: [], timeouts: [] };
export const props = new Map(), players = [], messages = [];
export const port = { fail: false, getDynamicProperty: k => props.get(k), setDynamicProperty(k, v) {
        if (this.fail)
            throw Error('Disk full');
        props.set(k, v);
    } };
export class ItemStack {
    constructor(typeId, amount = 1) { this.typeId = typeId; this.maxAmount = typeId === 'smp:menu' ? 1 : ['minecraft:ender_pearl', 'minecraft:snowball', 'minecraft:egg'].includes(typeId) ? 16 : 64; this.amount = Math.min(amount, this.maxAmount); this.nameTag = undefined; this.lockMode = 'none'; this.keepOnDeath = false; this.lore = []; this.dp = {}; this.canDestroy = []; this.canPlace = []; this.hidden = false; }
    get isStackable() { return this.maxAmount > 1 && !this.nameTag && !this.lore.length && !Object.keys(this.dp).length && !this.hidden; }
    getLore() { return [...this.lore]; }
    getDynamicPropertyIds() { return Object.keys(this.dp); }
    getCanDestroy() { return [...this.canDestroy]; }
    getCanPlaceOn() { return [...this.canPlace]; }
    clone() { return Object.assign(new ItemStack(this.typeId, this.amount), JSON.parse(JSON.stringify(this))); }
    isStackableWith(other) { const strip = i => JSON.stringify({ ...i, amount: 1 }); return this.isStackable && other.isStackable && strip(this) === strip(other); }
}
export class Inventory {
    constructor(size = 36) { this.size = size; this.slots = Array(size); }
    getItem(i) { return this.slots[i]?.clone(); }
    setItem(i, v) { this.slots[i] = v?.clone(); }
    addItem(item) {
        let n = item.amount;
        for (let i = 0; i < this.size && n; i++) {
            const s = this.slots[i];
            if (s && s.isStackableWith(item)) {
                const k = Math.min(n, s.maxAmount - s.amount);
                s.amount += k;
                n -= k;
            }
        }
        for (let i = 0; i < this.size && n; i++)
            if (!this.slots[i]) {
                const k = Math.min(n, item.maxAmount), v = item.clone();
                v.amount = k;
                this.slots[i] = v;
                n -= k;
            }
        if (n) {
            const left = item.clone();
            left.amount = n;
            return left;
        }
    }
}
export const dimension = { id: 'minecraft:overworld', unsafe: false, getEntities() { return []; }, spawnParticle() { }, getBlock(loc) {
        if (this.unsafe)
            return undefined;
        return { location: loc, typeId: loc.y < 64 ? 'minecraft:stone' : 'minecraft:air', isAir: loc.y >= 64, isLiquid: false };
    } };
const signal = list => ({ subscribe: f => list.push(f) });
export const world = { getDynamicProperty: k => port.getDynamicProperty(k), setDynamicProperty: (k, v) => port.setDynamicProperty(k, v), getPlayers: () => players, getDimension: id => {
        if (id !== dimension.id)
            throw Error('Unknown dimension');
        return dimension;
    }, getDefaultSpawnLocation: () => ({ x: 0, y: 64, z: 0 }), afterEvents: { itemUse: signal(hooks.itemUse), playerInteractWithBlock: signal(hooks.interact), playerSpawn: signal(hooks.spawn), entityHurt: signal(hooks.hurt), playerPlaceBlock: signal(hooks.place), playerBreakBlock: signal(hooks.breakAfter), entityDie: signal(hooks.die), entitySpawn: signal(hooks.entitySpawn), itemCompleteUse: signal(hooks.consume), playerInteractWithEntity: signal(hooks.interactEntity) }, beforeEvents: { playerBreakBlock: signal(hooks.break), playerInteractWithBlock: signal(hooks.beforeInteract), explosion: signal(hooks.explosion) } };
export const registeredCommands = new Map();
export const customComponents = new Map();
export const CommandPermissionLevel = { Any: 0, GameDirectors: 1 };
export const CustomCommandStatus = { Success: 0, Failure: 1 };
export const CustomCommandParamType = { Integer: 0, Enum: 1, PlayerSelector: 2 };
export const system = { beforeEvents: { startup: { subscribe: f => { hooks.startup.push(f); f({ customCommandRegistry: { registerEnum() { }, registerCommand: (d, fn) => registeredCommands.set(d.name, { ...d, callback: fn }) }, itemComponentRegistry: { registerCustomComponent: (id, data) => customComponents.set(id, data) } }); } } }, currentTick: 100, run: f => f(), runTimeout: f => hooks.timeouts.push(f), runInterval: (f, n) => hooks.intervals.push({ f, n }), afterEvents: { scriptEventReceive: signal(hooks.script) } };
export function player(id) {
    const inv = new Inventory(), dp = new Map(), effects = new Map();
    return { dp, effects, getDynamicProperty: k => dp.get(k), setDynamicProperty: (k, v) => dp.set(k, v), getGameMode() { return 'survival'; }, getViewDirection() { return { x: 0, y: 0, z: 1 }; }, getEffect: k => effects.get(k), addEffect: (id, ticks, data) => effects.set(id, { duration: ticks, ...data }), onScreenDisplay: { setActionBar() { }, setTitle() { }, updateSubtitle() { } }, playSound() { }, id, name: id, typeId: 'minecraft:player', isValid: true, dimension, location: { x: 0, y: 64, z: 0 }, inventory: inv, tags: new Set(), teleported: 0, getComponent(type) {
            if (type === 'minecraft:inventory')
                return { container: inv };
            return {};
        }, sendMessage: m => messages.push(m), hasTag(t) { return this.tags.has(t); }, addTag(t) { this.tags.add(t); }, removeTag(t) { this.tags.delete(t); }, teleport(loc, options) {
            if (this.failTeleport)
                throw Error('Cannot teleport');
            this.location = { ...loc };
            this.dimension = options.dimension;
            this.teleported++;
        } };
}
export const EntityDamageCause = { thorns: 'thorns' };
