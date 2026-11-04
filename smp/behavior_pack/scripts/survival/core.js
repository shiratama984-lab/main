import { xpNeeded, skillLevel, getTitle } from './constants.js';
import { SKILL_DEFS } from './skills_defs.js';
export { xpNeeded, skillLevel, getTitle, SKILL_DEFS };
export const KEY = 'smp:progress_v2';
export const defaults = () => ({ version: 2, lv: 1, xp: 0, mine: 0, combat: 0, farm: 0, explore: 0, dist: 0, points: 0, unlocked: [], active: [], hud: true, nameTag: true, chat: false, menuHotbar: false });
export function validateProgress(d) { if (d.version !== 2 || !Number.isInteger(d.lv) || d.lv < 1 || d.lv > 100 || !['xp', 'mine', 'combat', 'farm', 'explore', 'dist', 'points'].every(k => Number.isFinite(d[k]) && d[k] >= 0) || !Number.isInteger(d.points) || !Array.isArray(d.active) || !Array.isArray(d.unlocked) || new Set(d.unlocked).size !== d.unlocked.length || !d.unlocked.every(id => SKILL_DEFS.some(sk => sk.id === id)) || !d.active.every(id => d.unlocked.includes(id)))
    throw Error('成長データが不正です。変更を停止します。'); return d; }
export function read(player) { const raw = player.getDynamicProperty(KEY); if (raw === undefined)
    return defaults(); const d = JSON.parse(String(raw)); if (d.version !== 2 || !Number.isInteger(d.lv) || d.lv < 1 || d.lv > 100 || !Array.isArray(d.active) || !Array.isArray(d.unlocked))
    throw Error('成長データを読み込めません。自動初期化しません。'); return validateProgress({ ...defaults(), ...d }); }
export function change(player, operation) { const d = read(player), result = operation(d); validateProgress(d); player.setDynamicProperty(KEY, JSON.stringify(d)); return result; }
export function award(d, n, track) { if (!['mine', 'combat', 'farm', 'explore'].includes(track) || !Number.isSafeInteger(n) || n < 0 || n > 10000)
    throw Error('経験値が不正です。'); d[track] += n; let gained = 0; if (d.lv < 100) {
    d.xp += n;
    while (d.lv < 100 && d.xp >= xpNeeded(d.lv)) {
        d.xp -= xpNeeded(d.lv);
        d.lv++;
        d.points++;
        gained++;
    }
    if (d.lv === 100)
        d.xp = 0;
} return gained; }
export function unlock(d, id) { const skill = SKILL_DEFS.find(s => s.id === id); if (!skill || d.unlocked.includes(id))
    throw Error('未解放のスキルを選んでください。'); if (d.lv < skill.minLv)
    throw Error('レベルが足りません。'); if (skill.req && !d.unlocked.includes(skill.req))
    throw Error('前提スキルが必要です。'); if (d.points < skill.cost)
    throw Error('スキルポイントが足りません。'); d.points -= skill.cost; d.unlocked.push(id); d.active.push(id); }
export function toggle(d, id) { if (!d.unlocked.includes(id))
    throw Error('解放していないスキルです。'); d.active = d.active.includes(id) ? d.active.filter(x => x !== id) : [...d.active, id]; }
export function active(player, id) { return read(player).active.includes(id); }
