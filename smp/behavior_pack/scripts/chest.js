import { ActionFormData } from '@minecraft/server-ui';
export const CHEST_PREFIX = '§0[SMP:CHEST]§r ';
export const CONTENT_SIZE = 45;
export class Chest {
    constructor(title, body = '') { this.title = title; this.body = body; this.slots = Array.from({ length: 54 }, () => ({ text: '', icon: 'textures/smp/empty' })); this.handlers = new Map(); }
    /** @param {number} index @param {string} text @param {string} [icon] @param {(() => any)|undefined} [handler] */
    slot(index, text, icon = 'parcel', handler = undefined) { if (!Number.isInteger(index) || index < 0 || index >= 54)
        throw Error('Invalid chest slot'); this.slots[index] = { text, icon: icon.startsWith('textures/') ? icon : 'textures/smp/' + icon }; if (handler)
        this.handlers.set(index, handler); return this; }
    async show(player) { const compact = player.hasTag('smp.standard_ui'); const entries = this.slots.map((slot, index) => ({ ...slot, index })).filter(slot => !compact || slot.text !== ''); const form = new ActionFormData().title(compact ? 'SMP — ' + this.title : CHEST_PREFIX + this.title).body(this.body); for (const s of entries)
        form.button(s.text, s.icon); const result = await form.show(player); if (result.canceled || result.selection === undefined)
        return; return this.handlers.get(entries[result.selection]?.index)?.(); }
}
