import { CONFIG, COMMODITIES, SHOP, DURATIONS } from './data.js';
export function check(ok, message) { if (!ok)
    throw Error(message); }
export function amount(n, max = CONFIG.maxBid) { check(Number.isSafeInteger(n) && n > 0 && n <= max, '金額・個数は範囲内の正の整数で入力してください。'); return n; }
export function emptyState() { return { version: 1, players: {}, lots: {}, claims: {}, nextLot: 1, supply: 0 }; }
export function mint(s, p, n) { amount(n, CONFIG.maxSupply); check(s.supply + n <= CONFIG.maxSupply, 'サーバー通貨の発行上限です。'); s.supply += n; p.balance += n; }
export function burn(s, p, n) { amount(n, CONFIG.maxSupply); check(p.balance >= n, '残高が足りません。'); p.balance -= n; s.supply -= n; }
export function register(s, id, name) { if (s.players[id]) {
    s.players[id].name = name;
    return s.players[id];
} check(Object.keys(s.players).length < CONFIG.maxPlayers, '初版の登録上限（32人）です。'); const p = { id, name, balance: 0, daily: null, book: false, homes: {} }; s.players[id] = p; mint(s, p, CONFIG.starter); return p; }
export function transfer(s, from, to, n) { amount(n); check(from !== to && s.players[from] && s.players[to], '送金先を確認してください。'); const a = s.players[from], b = s.players[to]; check(a.balance >= n, '残高が足りません。'); a.balance -= n; b.balance += n; }
export function japanDay(now) { return Math.floor((now + 9 * 3600000) / 86400000); }
export function daily(s, p, now) { const d = japanDay(now); check(p.daily !== d, '今日のボーナスは受取済みです（日本時間0時更新）。'); mint(s, p, CONFIG.daily); p.daily = d; }
export function minimum(lot) { return lot.bid ? lot.bid + Math.max(1, Math.ceil(lot.bid * 0.05)) : lot.start; }
export function createLot(s, p, item, start, buyout, duration, now) {
    check(COMMODITIES.has(item.id), 'この素材は初版の出品対象外です。');
    amount(item.count, 64);
    amount(start);
    check(buyout === null || (Number.isSafeInteger(buyout) && buyout >= start && buyout <= CONFIG.maxBid), '即決価格は開始価格以上です。空欄で即決なしにできます。');
    check(DURATIONS.some(d => d.ms === duration), '出品期間を確認してください。');
    check(Object.keys(s.lots).length < CONFIG.maxLots, 'オークションの保管上限（48件）です。受け取りBOXを確認してください。');
    check(Object.values(s.lots).filter(l => l.seller === p.id && l.status === 'active').length < CONFIG.maxActivePerPlayer, '同時出品は1人5件までです。');
    const id = 'a' + s.nextLot++;
    s.lots[id] = { id, seller: p.id, item: { id: item.id, count: item.count }, start, buyout, bid: 0, bidder: null, endAt: now + duration, status: 'active', recipient: null };
    return s.lots[id];
}
export function settle(s, lot) { check(lot.status === 'active', '終了済みです。'); if (lot.bidder) {
    s.players[lot.seller].balance += lot.bid;
    lot.status = 'sold';
    lot.recipient = lot.bidder;
}
else {
    lot.status = 'expired';
    lot.recipient = lot.seller;
} return lot; }
export function settleDue(s, now) { let count = 0; for (const l of Object.values(s.lots))
    if (l.status === 'active' && l.endAt <= now) {
        settle(s, l);
        count++;
    } return count; }
export function bid(s, p, id, n, now) {
    const l = s.lots[id];
    check(l && l.status === 'active' && l.endAt > now, 'この出品は終了しています。');
    check(l.seller !== p.id, '自分の出品には入札できません。');
    amount(n);
    const buyout = l.buyout !== null && n >= l.buyout;
    const pay = buyout ? l.buyout : n;
    check(buyout || pay >= minimum(l), '現在の最低入札額は ' + minimum(l) + ' Cです。');
    const delta = pay - (l.bidder === p.id ? l.bid : 0);
    check(delta > 0, '現在額より高い金額を入力してください。');
    check(p.balance >= delta, '残高が足りません。');
    p.balance -= delta;
    if (l.bidder && l.bidder !== p.id)
        s.players[l.bidder].balance += l.bid;
    l.bid = pay;
    l.bidder = p.id;
    if (buyout)
        settle(s, l);
    return { price: pay, sold: buyout };
}
export function buyNow(s, p, id, expectedPrice, now) { const l = s.lots[id]; check(l && l.buyout !== null && l.buyout === expectedPrice, '即決価格を再確認してください。'); return bid(s, p, id, l.buyout, now); }
export function cancel(s, p, id, now) { const l = s.lots[id]; check(l && l.status === 'active' && l.endAt > now && l.seller === p.id, '取り消せる出品がありません。'); check(!l.bidder, '入札済みの出品は取り消せません。'); l.status = 'cancelled'; l.recipient = p.id; }
export function claimDelivery(s, p, id) { const l = s.lots[id]; check(l && l.status !== 'active' && l.recipient === p.id, '受け取れるアイテムがありません。'); const item = { ...l.item }; delete s.lots[id]; return item; }
export function trade(s, p, goodId, side, sets) { amount(sets, 64); const g = SHOP.find(g => g.id === goodId); if (!g)
    throw Error('商品が見つかりません。'); check(side === 'buy' || side === 'sell', '取引を確認してください。'); const price = g[side] * sets; if (side === 'buy')
    burn(s, p, price);
else
    mint(s, p, price); return { item: g.item, count: g.count * sets }; }
export function chunkKey(dim, x, z) { return dim + ':' + Math.floor(x / 16) + ':' + Math.floor(z / 16); }
export function landAt(s, dim, x, z) { return s.claims[chunkKey(dim, x, z)]; }
export function mayUse(s, id, dim, x, z, admin = false) { const c = landAt(s, dim, x, z); return !c || admin || c.owner === id || c.trusted.includes(id); }
export function buyClaim(s, p, dim, x, z) { check(dim === 'minecraft:overworld', '土地購入はオーバーワールドのみです。'); const key = chunkKey(dim, x, z); check(!s.claims[key], 'この区画は購入済みです。'); check(Object.keys(s.claims).length < CONFIG.maxClaims, '土地の登録上限です。'); check(Object.values(s.claims).filter(c => c.owner === p.id).length < CONFIG.maxPlayerClaims, '土地は1人4区画までです。'); burn(s, p, CONFIG.claimPrice); s.claims[key] = { owner: p.id, trusted: [] }; return key; }
export function trust(s, p, key, other, allowed) { const c = s.claims[key]; check(c?.owner === p.id, '所有者だけが共有者を変更できます。'); check(s.players[other] && other !== p.id, '共有する相手を確認してください。'); c.trusted = c.trusted.filter(id => id !== other); if (allowed) {
    check(c.trusted.length < 8, '共有者は8人までです。');
    c.trusted.push(other);
} }
export function abandon(s, p, key) { const c = s.claims[key]; check(c?.owner === p.id, '自分の土地ではありません。'); delete s.claims[key]; }
export function setHome(p, name, dim, pos) { name = String(name).trim().replace(/§./g, ''); check(!['__proto__', 'constructor', 'prototype'].includes(name) && /^[\p{L}\p{N}_ -]{1,16}$/u.test(name), 'ホーム名は文字・数字・空白など16文字以内です。'); check(Object.hasOwn(p.homes, name) || Object.keys(p.homes).length < 3, 'ホームは3件までです。'); check(['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'].includes(dim), '次元を確認してください。'); check([pos.x, pos.y, pos.z].every(Number.isFinite), '座標が不正です。'); p.homes[name] = { dimension: dim, x: pos.x, y: pos.y, z: pos.z }; }
export function removeHome(p, name) { check(Object.hasOwn(p.homes, name), 'ホームがありません。'); delete p.homes[name]; }
export function validate(s) {
    check(s && s.version === 1 && s.players && s.lots && s.claims && Number.isSafeInteger(s.nextLot) && s.nextLot > 0 && Number.isSafeInteger(s.supply) && s.supply >= 0 && s.supply <= CONFIG.maxSupply, '保存データの形式に対応していません。');
    let total = 0;
    for (const [id, p] of Object.entries(s.players)) {
        check(p.id === id && Number.isSafeInteger(p.balance) && p.balance >= 0, '口座の保存データが不正です。');
        total += p.balance;
    }
    for (const [id, l] of Object.entries(s.lots)) {
        check(l.id === id && s.players[l.seller] && COMMODITIES.has(l.item.id) && Number.isSafeInteger(l.item.count) && l.item.count > 0 && l.item.count <= 64, '出品データが不正です。');
        check(['active', 'sold', 'expired', 'cancelled'].includes(l.status) && Number.isSafeInteger(l.bid) && l.bid >= 0, '入札データが不正です。');
        if (l.status === 'active') {
            check(l.bidder ? s.players[l.bidder] && l.bid > 0 : l.bid === 0, '入札口座が不正です。');
            total += l.bid;
        }
        else
            check(s.players[l.recipient], '受取人が不正です。');
    }
    check(total === s.supply, '所持金と入札預り金の合計が一致しません。データの変更を停止します。');
    return s;
}
