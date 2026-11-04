import { displayName } from './locale.js';
import { ActionFormData } from '@minecraft/server-ui';
import { iconTexture, texture } from './textures.js';
export const CHEST_PREFIX = '§0[SMP:CHEST]§r ';
export const CONTENT_SIZE = 45;
export function encoded(text, count = 1, durability = 0) { return 'stack#' + String(Math.max(1, Math.min(99, Math.floor(count)))).padStart(2, '0') + 'dur#' + String(Math.max(0, Math.min(99, Math.floor(durability)))).padStart(2, '0') + '§r' + text; }
export class Chest {
    constructor(title, body = '') { this.title = title; this.body = body; this.slots = Array.from({ length: 54 }, () => ({ text: '', icon: 'textures/smp/empty', count: 1, durability: 0 })); this.handlers = new Map(); this.selectInventory = false; }
    /** @param {number} index @param {string} text @param {string} [icon] @param {(() => any)|undefined} [handler] @param {number} [count] @param {number} [durability] */
    slot(index, text, icon = 'parcel', handler = undefined, count = 1, durability = 0) { if (!Number.isInteger(index) || index < 0 || index >= 54)
        throw Error('Invalid chest slot'); this.slots[index] = { text, icon: iconTexture(icon), count, durability }; if (handler)
        this.handlers.set(index, handler); return this; }
    async show(player) {
        while (true) {
            const compact = player.hasTag('smp.standard_ui');
            const entries = this.slots.map((slot, index) => ({ ...slot, index })).filter(slot => !compact || slot.text !== '');
            if (!compact) {
                const inv = player.getComponent('minecraft:inventory')?.container;
                for (let i = 0; i < 36; i++) {
                    const item = inv?.getItem(i);
                    let durability = 0;
                    const d = item?.getComponent?.('minecraft:durability');
                    if (d)
                        durability = Math.max(1, Math.round((1 - d.damage / d.maxDurability) * 99));
                    entries.push({ index: 54 + i, text: item ? (item.nameTag ?? displayName(item.typeId)) + '\n' + (item.getLore?.() ?? []).join('\n') : '', icon: item ? texture(item.typeId) : 'textures/smp/empty', count: item?.amount ?? 1, durability });
                }
            }
            const form = new ActionFormData().title(compact ? 'SMP — ' + this.title : CHEST_PREFIX + this.title).body(this.body);
            for (const s of entries)
                form.button(s.text ? (compact ? s.text : encoded(s.text, s.count, s.durability)) : '', s.icon);
            const result = await form.show(player);
            if (result.canceled || result.selection === undefined)
                return;
            let index = entries[result.selection]?.index;
            if (index >= 54 && this.selectInventory)
                index -= 54;
            if (this.handlers.has(index))
                return this.handlers.get(index)();
        }
    }
}
