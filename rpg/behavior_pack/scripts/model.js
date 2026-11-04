import { SPELLS, QUESTS, FOUNDATION_COST, CLAIM_COST } from './data.js';
export class RuleError extends Error {
}
const requireRule = (ok, message) => { if (!ok)
    throw new RuleError(message); };
export function emptyState() { return { version: 1, players: {}, kingdoms: {}, claims: {}, nextKingdom: 1 }; }
export function profile(id, name) { return { id, name, classId: null, level: 1, xp: 0, mana: 30, gold: 0, spell: 'ember', cooldowns: {}, kills: 0, questKills: 0, quests: {}, kingdom: null, joinRequest: null, kit: false, book: false }; }
export function xpRequired(level) { return 60 + 30 * (level - 1) ** 2; }
export function maxMana(p) { return (p.classId === 'mage' ? 60 : p.classId === 'ranger' ? 40 : 30) + (p.level - 1) * 3; }
export function gainXp(p, xp) { requireRule(Number.isSafeInteger(xp) && xp >= 0, '経験値が不正です。'); p.xp += xp; while (p.level < 50 && p.xp >= xpRequired(p.level)) {
    p.xp -= xpRequired(p.level);
    p.level++;
    p.mana = maxMana(p);
} if (p.level === 50)
    p.xp = Math.min(p.xp, xpRequired(50)); }
export function money(p, delta) { requireRule(Number.isSafeInteger(delta) && Number.isSafeInteger(p.gold + delta) && p.gold + delta >= 0 && p.gold + delta <= 1e9, '所持金が不足しているか、金額が上限を超えています。'); p.gold += delta; }
export function transfer(s, from, to, amount) { requireRule(from !== to && s.players[from] && s.players[to], '送金先を確認してください。'); requireRule(Number.isSafeInteger(amount) && amount > 0, '金額は1以上の整数です。'); money(s.players[from], -amount); money(s.players[to], amount); }
export function chooseClass(p, id) { requireRule(!p.kit && !p.classId, '初期職業と装備は受け取り済みです。'); requireRule(['warrior', 'mage', 'ranger'].includes(id), '職業が不正です。'); p.classId = id; p.kit = true; p.mana = maxMana(p); }
export function creditKill(p, type, hostiles) { if (!hostiles.has(type))
    return false; p.kills++; p.questKills++; gainXp(p, type.startsWith('arpg:') ? 30 : 20); money(p, type.startsWith('arpg:') ? 8 : 4); return true; }
export function claimQuest(p, id) { const q = QUESTS.find(q => q.id === id); if (!q)
    throw new RuleError('依頼が見つかりません。'); requireRule(!p.quests[id], 'この依頼の報酬は受け取り済みです。'); if (q.kind === 'hunt')
    requireRule(p.questKills >= (q.target ?? 0), '討伐数が足りません。'); p.quests[id] = true; money(p, q.reward); gainXp(p, q.xp); return q; }
export function spellCheck(p, id, now) { const s = SPELLS[id]; requireRule(s, '魔法が不正です。'); requireRule(p.level >= s.level, 'レベルが足りません。'); requireRule(p.mana >= s.cost, 'MPが足りません。'); requireRule(now >= (p.cooldowns[id] ?? 0), 'まだ再使用できません。'); return s; }
export function consumeSpell(p, id, now) { const s = spellCheck(p, id, now); p.mana -= s.cost; p.cooldowns[id] = now + s.cooldown; }
export function landKey(dimension, x, z) { return dimension + ':' + Math.floor(x / 16) + ':' + Math.floor(z / 16); }
export function claimAt(s, dim, x, z) { const k = s.claims[landKey(dim, x, z)]; return k ? s.kingdoms[k] : undefined; }
export function mayBuild(s, id, dim, x, z, admin = false) { const k = claimAt(s, dim, x, z); return !k || admin || !!k.members[id]; }
function nameClean(name) { return String(name).normalize('NFKC').replace(/§./g, '').trim(); }
export function foundKingdom(s, p, name, dim, x, z) {
    requireRule(!p.kingdom, '既に王国に所属しています。');
    name = nameClean(name);
    requireRule(name.length >= 2 && name.length <= 20, '国名は2〜20文字です。');
    requireRule(!Object.values(s.kingdoms).some(k => k.name === name), '同じ名前の王国があります。');
    requireRule(Object.keys(s.kingdoms).length < 8, '初版の王国数上限（8）です。');
    requireRule(dim === 'minecraft:overworld', '建国はオーバーワールドで行ってください。');
    const key = landKey(dim, x, z);
    requireRule(!s.claims[key], 'この区画は他国の領地です。');
    money(p, -FOUNDATION_COST);
    const id = 'k' + s.nextKingdom++;
    s.kingdoms[id] = { id, name, owner: p.id, members: { [p.id]: 'king' }, treasury: 0 };
    s.claims[key] = id;
    p.kingdom = id;
    p.joinRequest = null;
    return s.kingdoms[id];
}
export function requestJoin(s, p, id) { requireRule(!p.kingdom, '既に王国に所属しています。'); requireRule(s.kingdoms[id], '王国が見つかりません。'); p.joinRequest = id; }
export function approveJoin(s, king, applicantId) { const k = s.kingdoms[king.kingdom], p = s.players[applicantId]; requireRule(k && k.owner === king.id, '国王だけが加入を承認できます。'); requireRule(p && !p.kingdom && p.joinRequest === k.id, '加入申請がありません。'); k.members[p.id] = 'citizen'; p.kingdom = k.id; p.joinRequest = null; }
export function leaveKingdom(s, p) { const k = s.kingdoms[p.kingdom]; requireRule(k, '王国に所属していません。'); requireRule(k.owner !== p.id, '国王は脱退できません。初版では解散と王位移譲は未対応です。'); delete k.members[p.id]; p.kingdom = null; }
export function setRole(s, king, id, role) { const k = s.kingdoms[king.kingdom]; requireRule(k && k.owner === king.id, '国王だけが役職を変更できます。'); requireRule(id !== king.id && k.members[id], '対象の国民を確認してください。'); requireRule(['citizen', 'officer'].includes(role), '役職が不正です。'); k.members[id] = role; }
export function deposit(s, p, amount) { const k = s.kingdoms[p.kingdom]; requireRule(k && k.members[p.id], '王国に所属していません。'); requireRule(Number.isSafeInteger(amount) && amount > 0, '金額は1以上の整数です。'); requireRule(k.treasury + amount <= 1e9, '国庫の上限です。'); money(p, -amount); k.treasury += amount; }
export function expand(s, p, dim, x, z) {
    const k = s.kingdoms[p.kingdom];
    requireRule(k && ['king', 'officer'].includes(k.members[p.id]), '領地の購入には国王または執政官の役職が必要です。');
    requireRule(dim === 'minecraft:overworld', '領地はオーバーワールドに購入してください。');
    const key = landKey(dim, x, z);
    requireRule(!s.claims[key], 'この区画は購入済みです。');
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    requireRule([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => s.claims[`${dim}:${cx + dx}:${cz + dz}`] === k.id), '自国領に辺で隣接する区画だけ購入できます。');
    requireRule(Object.values(s.claims).filter(id => id === k.id).length < 16, '初版の領地上限（16区画）です。');
    requireRule(k.treasury >= CLAIM_COST, '国庫に80G必要です。');
    k.treasury -= CLAIM_COST;
    s.claims[key] = k.id;
}
export function validateState(s) { requireRule(s && s.version === 1 && s.players && s.kingdoms && s.claims && Number.isSafeInteger(s.nextKingdom), '保存データの形式に対応していません。'); for (const [id, p] of Object.entries(s.players)) {
    requireRule(p.id === id && Number.isSafeInteger(p.gold) && p.gold >= 0 && Number.isFinite(p.mana) && p.mana >= 0, 'プレイヤーの保存データが不正です。');
    if (p.kingdom)
        requireRule(s.kingdoms[p.kingdom]?.members[id], '所属データが一致しません。');
} return s; }
export function beginRaid(s, p, dim, x, y, z) { const k = s.kingdoms[p.kingdom]; requireRule(k && k.owner === p.id, '防衛戦を開始できるのは国王です。'); requireRule(claimAt(s, dim, x, z)?.id === k.id, '自国の領地で開始してください。'); requireRule(!k.raid, '防衛戦は進行中です。'); requireRule(k.treasury >= 40, '開始には国庫40Gが必要です。'); k.treasury -= 40; k.raid = { dimension: dim, x: Math.floor(x), y: Math.floor(y), z: Math.floor(z), spawned: 0, defeated: 0, mobs: [] }; }
export function raidDeath(s, kingdomId, entityId) { const k = s.kingdoms[kingdomId], r = k?.raid; if (!r || !r.mobs.includes(entityId))
    return false; r.mobs = r.mobs.filter(id => id !== entityId); r.defeated++; if (r.spawned === 3 && r.defeated === 3) {
    k.raid = null;
    k.treasury = Math.min(1e9, k.treasury + 60);
    return true;
} return false; }
