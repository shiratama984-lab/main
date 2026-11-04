import { CONFIG, COMMODITIES } from './data.js';
const ok = (v, msg) => { if (!v)
    throw Error(msg); };
export function normalize(s) { s.barters ??= {}; s.parcels ??= {}; s.duels ??= {}; s.nextSocial ??= 1; return s; }
export function held(s) { return Object.keys(s.lots).length + Object.keys(s.barters ?? {}).length * 2 + Object.keys(s.parcels ?? {}).length; }
export function validateSocial(s) { let escrow = 0; for (const b of Object.values(s.barters ?? {})) {
    ok(s.players[b.seller] && COMMODITIES.has(b.item.id) && COMMODITIES.has(b.want.id) && b.item.count > 0 && b.want.count > 0, 'バザーの保存データが不正です。');
} for (const p of Object.values(s.parcels ?? {}))
    ok(s.players[p.recipient] && COMMODITIES.has(p.item.id) && p.item.count > 0, '受取品が不正です。'); for (const d of Object.values(s.duels ?? {})) {
    ok(s.players[d.from] && s.players[d.to] && Number.isSafeInteger(d.stake) && d.stake > 0, '対戦の預り金が不正です。');
    escrow += d.stake;
} return escrow; }
export function listBarter(s, p, item, want) { normalize(s); ok(held(s) + 2 <= CONFIG.maxLots, '受け取り保管枠が不足しています。'); ok(COMMODITIES.has(item.id) && COMMODITIES.has(want.id) && item.id !== want.id, '交換する素材を確認してください。'); ok(Number.isSafeInteger(item.count) && item.count > 0 && item.count <= 64 && Number.isSafeInteger(want.count) && want.count > 0 && want.count <= 999, '個数を確認してください。'); ok(Object.values(s.barters).filter(b => b.seller === p.id).length < 5, 'バザーの出品は1人5件までです。'); const id = 'b' + s.nextSocial++; return s.barters[id] = { id, seller: p.id, item: { ...item }, want: { ...want } }; }
export function buyBarter(s, p, id) { const b = s.barters[id]; ok(b && b.seller !== p.id, '出品を確認してください。'); s.parcels[id + ':goods'] = { id: id + ':goods', recipient: p.id, item: { ...b.item }, reason: 'バザー購入' }; s.parcels[id + ':payment'] = { id: id + ':payment', recipient: b.seller, item: { ...b.want }, reason: 'バザー売上' }; delete s.barters[id]; return b.want; }
export function cancelBarter(s, p, id) { const b = s.barters[id]; ok(b && b.seller === p.id, '自分の出品ではありません。'); s.parcels[id + ':return'] = { id: id + ':return', recipient: p.id, item: { ...b.item }, reason: 'バザー返却' }; delete s.barters[id]; }
export function claimParcel(s, p, id) { const parcel = s.parcels[id]; ok(parcel?.recipient === p.id, '受け取れる品物がありません。'); delete s.parcels[id]; return parcel.item; }
export function requestDuel(s, p, to, stake, now) { normalize(s); ok(s.players[to] && to !== p.id, '相手を確認してください。'); ok(Number.isSafeInteger(stake) && stake >= 1 && stake <= 10000, '賭け金は1〜10,000 Cです。'); ok(!Object.values(s.duels).some(d => [d.from, d.to].includes(p.id) || [d.from, d.to].includes(to)), 'どちらかのプレイヤーが別の対戦を待っています。'); ok(p.balance >= stake, '残高が足りません。'); p.balance -= stake; const id = 'd' + s.nextSocial++; return s.duels[id] = { id, from: p.id, to, stake, endAt: now + 30000 }; }
export function cancelDuel(s, p, id, now) { const d = s.duels[id]; ok(d && (d.from === p.id || d.to === p.id || d.endAt <= now), '取り消せる対戦ではありません。'); s.players[d.from].balance += d.stake; delete s.duels[id]; }
export function expireDuels(s, now) { for (const d of Object.values(s.duels ?? {}))
    if (d.endAt <= now) {
        s.players[d.from].balance += d.stake;
        delete s.duels[d.id];
    } }
export function acceptDuel(s, p, id, now, roll) { const d = s.duels[id]; ok(d && d.to === p.id && d.endAt > now, '対戦の申請がないか期限切れです。'); ok(p.balance >= d.stake, '残高が足りません。'); ok(Number.isFinite(roll) && roll >= 0 && roll < 1, '抽選値が不正です。'); p.balance -= d.stake; const winner = roll < 0.5 ? d.from : d.to; s.players[winner].balance += d.stake * 2; delete s.duels[id]; return { winner, stake: d.stake }; }
export const WEIGHTS = [30, 25, 15, 12, 8, 10], PAYOUT = [3, 4, 20, 10, 30, 8];
export function reel(roll) { ok(Number.isFinite(roll) && roll >= 0 && roll < 1, '抽選値が不正です。'); let x = roll * 100; for (let i = 0; i < WEIGHTS.length; i++) {
    x -= WEIGHTS[i];
    if (x < 0)
        return i;
} return 5; }
export function payout(reels) { if (reels.every(r => r === reels[0]))
    return 5 * PAYOUT[reels[0]]; const cherries = reels.filter(r => r === 0).length; return cherries === 2 ? 5 : cherries === 1 ? 2 : 0; }
export function spin(s, p, reels, now) { ok(reels.length === 3 && reels.every(r => Number.isInteger(r) && r >= 0 && r <= 5), 'リールが不正です。'); ok(now >= (p.lastSpin?.at ?? 0) + 6000, '次の抽選まで少しお待ちください。'); ok(p.balance >= 5, '残高が足りません。'); const pay = payout(reels); ok(s.supply - 5 + pay <= CONFIG.maxSupply, '通貨の発行上限です。'); p.balance += pay - 5; s.supply += pay - 5; p.lastSpin = { reels: [...reels], pay, at: now }; return pay; }
