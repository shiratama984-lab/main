import { emptyState, validateState } from './model.js';
export const SAVE_KEY = 'arpg:save_v1';
export function utf8Size(s) { let n = 0; for (const ch of s) {
    const c = ch.codePointAt(0);
    n += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
} return n; }
export class Store {
    constructor(port) { this.port = port; const raw = port.getDynamicProperty(SAVE_KEY); this.state = raw === undefined ? emptyState() : validateState(JSON.parse(String(raw))); }
    transaction(operation) { const previous = JSON.stringify(this.state); try {
        const result = operation(this.state);
        validateState(this.state);
        const text = JSON.stringify(this.state);
        if (utf8Size(text) > 30000)
            throw Error('初版の保存容量に達しました。今回の操作は取り消しました。');
        this.port.setDynamicProperty(SAVE_KEY, text);
        return result;
    }
    catch (e) {
        this.state = JSON.parse(previous);
        throw e;
    } }
}
