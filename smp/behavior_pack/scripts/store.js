import { emptyState, validate } from './model.js';
export const SAVE_KEY = 'smp:save_v1';
function bytes(s) { let n = 0; for (const c of s) {
    const x = c.codePointAt(0);
    n += x < 128 ? 1 : x < 2048 ? 2 : x < 65536 ? 3 : 4;
} return n; }
export class Store {
    constructor(port) { this.port = port; const raw = port.getDynamicProperty(SAVE_KEY); this.state = raw === undefined ? emptyState() : validate(JSON.parse(String(raw))); }
    transaction(operation) { const old = JSON.stringify(this.state); try {
        const result = operation(this.state);
        validate(this.state);
        const text = JSON.stringify(this.state);
        const maxRecipient = Math.max(4, ...Object.keys(this.state.players).map(id => bytes(JSON.stringify(id))));
        const reserve = Object.values(this.state.lots).filter(l => l.status === 'active').length * (maxRecipient + 12);
        if (bytes(text) + reserve > 30000)
            throw Error('初版の保存容量です。受け取りBOXからアイテムを回収してください。今回の操作は取り消しました。');
        this.port.setDynamicProperty(SAVE_KEY, text);
        return result;
    }
    catch (e) {
        this.state = JSON.parse(old);
        throw e;
    } }
}
