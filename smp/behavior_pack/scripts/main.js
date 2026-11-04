import { setupHub, status, skills, ranking, titles, tpa, bazaar, arcade, settings } from './hub.js';
import { read as progress } from './survival/core.js';
import { claimParcel } from './social_model.js';
import { world, system, ItemStack } from '@minecraft/server';
import { ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { Chest, CONTENT_SIZE } from './chest.js';
import { Store } from './store.js';
import * as m from './model.js';
import { CONFIG, SHOP, DURATIONS, label, itemIcon } from './data.js';
import { plain, snapshot, takeSlot, give, removePlain, atomicInventory } from './items.js';
/** @type {Store} */ export let store;
export const teleports = new Map();
let ready = false;
const busy = new Set(), lastUse = new Map();
const tell = (p, s) => p.sendMessage('§b[SMP] §r' + s);
function safeTell(p, s) {
    try {
        tell(p, s);
    }
    catch { }
}
function current(p) {
    if (!store || !ready)
        throw Error('保存データを読み込めないため操作を停止しています。');
    if (!store.state.players[p.id] || store.state.players[p.id].name !== p.name)
        store.transaction(s => m.register(s, p.id, p.name));
    return store.state.players[p.id];
}
function tx(p, fn) { current(p); return store.transaction(s => fn(s, s.players[p.id])); }
function bag(p) {
    const inv = p.getComponent('minecraft:inventory')?.container;
    if (!inv)
        throw Error('インベントリを取得できません。');
    return inv;
}
function inventory(p, fn) { const inv = bag(p); return atomicInventory(inv, () => tx(p, (s, d) => fn(inv, s, d))); }
function guarded(p, fn) {
    if (busy.has(p.id))
        return;
    busy.add(p.id);
    Promise.resolve().then(() => { current(p); return fn(); }).catch(e => safeTell(p, String(e.message ?? e))).finally(() => busy.delete(p.id));
}
async function confirm(p, title, body) { const r = await new MessageFormData().title(title).body(body).button1('実行する').button2('やめる').show(p); return !r.canceled && r.selection === 0; }
function settleNow() {
    if (store && Object.values(store.state.lots).some(l => l.status === 'active' && l.endAt <= Date.now()))
        store.transaction(s => m.settleDue(s, Date.now()));
}
function timeLeft(l) { return Math.max(0, Math.ceil((l.endAt - Date.now()) / 60000)) + '分'; }
function user(id) { return store.state.players[id]?.name ?? id; }
export async function showHome(p) {
    current(p);
    settleNow();
    const d = current(p), stats = progress(p), inbox = Object.values(store.state.lots).filter(l => l.recipient === p.id && l.status !== 'active').length + Object.values(store.state.parcels ?? {}).filter(l => l.recipient === p.id).length;
    return new Chest('SMP SURVIVAL', `§eLv.${stats.lv} §f${p.name} §6${d.balance} C\n§7スキル ${stats.points} pt / 受取待ち ${inbox}件`)
        .slot(10, 'オークション\n入札・即決・出品', 'hammer', () => showAuctions(p))
        .slot(12, 'サーバーショップ\n素材の売買', 'shop', () => showShop(p))
        .slot(14, 'ウォレット\n残高・送金', 'coin', () => showWallet(p))
        .slot(16, `受け取りBOX\n${inbox}件のアイテム`, 'mail', () => showInbox(p))
        .slot(19, 'ステータス・成長', 'status', () => status(p)).slot(21, 'スキルツリー', 'skills', () => skills(p)).slot(23, 'ランキング', 'rank', () => ranking(p)).slot(25, '称号コレクション', 'titles', () => titles(p))
        .slot(29, 'TPAを送信・承認', 'players', () => tpa(p)).slot(31, '物々交換バザー', 'shop', () => bazaar(p)).slot(33, 'ミニゲーム・スロット', 'casino', () => arcade(p)).slot(47, '設定', 'settings', () => settings(p)).slot(53, '閉じる', 'cancel', () => undefined)
        .slot(28, 'ホーム・スポーン\n移動は5秒待機', 'home', () => showHomes(p))
        .slot(30, '土地保護\n購入・共有者の管理', 'land', () => showLand(p))
        .slot(32, `デイリーボーナス\n${CONFIG.daily} C / 日本時間0時更新`, 'gift', async () => { tx(p, (s, d) => m.daily(s, d, Date.now())); tell(p, 'デイリーボーナスを受け取りました。'); return showHome(p); })
        .slot(34, '使い方\nSMPガイド', 'book', () => showGuide(p))
        .slot(49, `口座: ${d.balance} C\nLv.${stats.lv} / ステータスを確認`, 'status', () => status(p)).show(p);
}
function pageChest(title, body, entries, page, home) {
    const last = Math.max(0, Math.ceil(entries.length / CONTENT_SIZE) - 1);
    page = Math.max(0, Math.min(page, last));
    const c = new Chest(title, body + ` | ${page + 1}/${last + 1}ページ`);
    entries.slice(page * CONTENT_SIZE, (page + 1) * CONTENT_SIZE).forEach((e, i) => c.slot(i, e.text, e.icon, e.handler, e.count ?? 1));
    if (page > 0)
        c.slot(45, '前のページ', 'previous', () => home(page - 1));
    if (page < last)
        c.slot(53, '次のページ', 'next', () => home(page + 1));
    return c;
}
export async function showAuctions(p, page = 0, mine = false) {
    settleNow();
    const lots = Object.values(store.state.lots).filter(l => l.status === 'active' && (!mine || l.seller === p.id)).sort((a, b) => a.endAt - b.endAt);
    const c = pageChest(mine ? '自分の出品' : 'オークション', `残高 ${current(p).balance} C / 出品 ${lots.length}件`, lots.map(l => ({ text: `#${l.id} ${label(l.item.id)} ×${l.item.count}\n${l.bid ? l.bid + ' C' : '開始 ' + l.start + ' C'} / 残り${timeLeft(l)}\n出品者 ${user(l.seller)}`, icon: itemIcon(l.item.id), count: l.item.count, handler: () => showLot(p, l.id) })), page, n => showAuctions(p, n, mine));
    return c.slot(46, 'アイテムを出品', 'sell', () => showSell(p)).slot(47, mine ? '全ての出品' : '自分の出品', 'hammer', () => showAuctions(p, 0, !mine)).slot(49, 'メニューへ戻る', 'menu', () => showHome(p)).slot(51, '受け取りBOX', 'mail', () => showInbox(p)).show(p);
}
async function showLot(p, id) {
    settleNow();
    const l = store.state.lots[id];
    if (!l || l.status !== 'active') {
        tell(p, 'この出品は終了しています。受け取りBOXをご確認ください。');
        return showAuctions(p);
    }
    const c = new Chest('オークション #' + id, `${label(l.item.id)} ×${l.item.count} | 出品者 ${user(l.seller)}\n最高 ${l.bid} C / 最低入札 ${m.minimum(l)} C / 残り ${timeLeft(l)}`)
        .slot(13, `${label(l.item.id)} ×${l.item.count}\n最高入札者 ${l.bidder ? user(l.bidder) : 'なし'}\n即決 ${l.buyout ?? 'なし'}`, itemIcon(l.item.id));
    if (l.seller !== p.id) {
        c.slot(29, '入札する\n最高額を更新', 'hammer', async () => {
            const r = await new ModalFormData().title('入札 #' + id).textField('入札額（現在の最低 ' + m.minimum(store.state.lots[id] ?? l) + ' C）', String(m.minimum(l))).show(p);
            if (r.canceled || !r.formValues)
                return;
            const n = Number(r.formValues[0]);
            if (!await confirm(p, '入札の確認', `${label(l.item.id)} ×${l.item.count}\n${n} Cで入札します。最高入札中は代金を預かります。\n他の人に上回られると自動返金されます。`))
                return;
            const result = tx(p, (s, d) => m.bid(s, d, id, n, Date.now()));
            tell(p, result.sold ? '即決しました。受け取りBOXへ入りました。' : '入札しました。');
            return showAuctions(p);
        });
        if (l.buyout !== null)
            c.slot(31, `即決する\n${l.buyout} C`, 'coin', async () => {
                if (!await confirm(p, '即決購入', `${l.buyout} Cで即決購入しますか？\nアイテムは受け取りBOXに届きます。`))
                    return;
                tx(p, (s, d) => m.buyNow(s, d, id, l.buyout, Date.now()));
                tell(p, '落札しました。受け取りBOXから回収できます。');
                return showInbox(p);
            });
    }
    else
        c.slot(33, '出品を取り消す\n入札のない出品のみ', 'cancel', async () => {
            if (!await confirm(p, '出品取消', '入札がなければ取消し、受け取りBOXへ返します。'))
                return;
            tx(p, (s, d) => m.cancel(s, d, id, Date.now()));
            return showInbox(p);
        });
    return c.slot(49, '出品一覧へ戻る', 'previous', () => showAuctions(p)).show(p);
}
export async function showSell(p) {
    const inv = bag(p), c = new Chest('出品アイテムの選択', 'インベントリのスロットを選択。通常の素材・食料・ブロックのみ。');
    c.selectInventory = true;
    for (let i = 0; i < Math.min(inv.size, 45); i++) {
        const item = inv.getItem(i);
        if (!item)
            continue;
        const slot = i, id = item.typeId, count = item.amount;
        c.slot(i, `スロット ${i + 1}: ${label(id)} ×${count}\n${plain(item) ? '出品する' : '特殊データ等のため出品不可'}`, itemIcon(id), async () => {
            snapshot(bag(p).getItem(slot), 1);
            const r = await new ModalFormData().title('オークションへの出品').textField(`出品個数（最大${count}）`, String(count), { defaultValue: String(count) }).textField('開始価格 C（1〜1,000,000）', '100').textField('即決価格 C（空欄はなし）', '300').dropdown('出品期間', DURATIONS.map(d => d.label)).show(p);
            if (r.canceled || !r.formValues)
                return;
            const [q, price, buy, duration] = r.formValues, n = Number(q), start = Number(price), buyout = String(buy).trim() === '' ? null : Number(buy), ms = DURATIONS[Number(duration)]?.ms;
            if (!await confirm(p, '出品の確認', `${label(id)} ×${n}\n開始 ${start} C / 即決 ${buyout ?? 'なし'}\n出品するとアイテムを預かります。`))
                return;
            inventory(p, (inv, s, d) => { const item = takeSlot(inv, slot, id, n); m.createLot(s, d, item, start, buyout, ms, Date.now()); });
            tell(p, '出品しました。');
            return showAuctions(p, 0, true);
        });
    }
    return c.slot(49, '戻る', 'previous', () => showAuctions(p)).show(p);
}
export async function showInbox(p, page = 0) { settleNow(); const lots = Object.values(store.state.lots).filter(l => l.status !== 'active' && l.recipient === p.id), parcels = Object.values(store.state.parcels ?? {}).filter(l => l.recipient === p.id); const entries = [...lots.map(l => ({ id: l.id, item: l.item, reason: l.status === 'sold' ? '落札品' : '返却品', parcel: false })), ...parcels.map(l => ({ ...l, parcel: true }))]; return pageChest('受け取りBOX', `${entries.length}件 / クリックで回収`, entries.map(l => ({ text: `${label(l.item.id)} ×${l.item.count}\n${l.reason}`, icon: itemIcon(l.item.id), count: l.item.count, handler: async () => { inventory(p, (inv, s, d) => { const item = l.parcel ? claimParcel(s, d, l.id) : m.claimDelivery(s, d, l.id); give(inv, item.id, item.count); }); tell(p, 'アイテムを受け取りました。'); return showInbox(p, page); } })), page, n => showInbox(p, n)).slot(49, 'メニューへ戻る', 'menu', () => showHome(p)).show(p); }
async function showShop(p) { const c = new Chest('サーバーショップ', `残高 ${current(p).balance} C | 商品を選択`); SHOP.forEach((g, i) => c.slot(10 + i, `${g.name} ×${g.count}\n購入 ${g.buy} C / 売却 ${g.sell} C`, g.icon, () => showProduct(p, g.id))); return c.slot(49, 'メニューへ戻る', 'menu', () => showHome(p)).show(p); }
async function showProduct(p, id) {
    const g = SHOP.find(g => g.id === id);
    if (!g)
        return;
    const trade = async (side) => {
        const r = await new ModalFormData().title(g.name + 'の' + (side === 'buy' ? '購入' : '売却')).textField(`${g.count}個を1組として取引する組数（1〜64）`, '1', { defaultValue: '1' }).show(p);
        if (r.canceled || !r.formValues)
            return;
        const n = Number(r.formValues[0]);
        if (!await confirm(p, '取引の確認', `${g.name} ${g.count * n}個\n合計 ${g[side] * n} Cで${side === 'buy' ? '購入' : '売却'}します。`))
            return;
        inventory(p, (inv, s, d) => {
            const result = m.trade(s, d, g.id, side, n);
            if (side === 'buy')
                give(inv, result.item, result.count);
            else
                removePlain(inv, result.item, result.count);
        });
        tell(p, '取引しました。');
        return showShop(p);
    };
    return new Chest(g.name, `1組 ${g.count}個 / 残高 ${current(p).balance} C`).slot(13, g.name, g.icon).slot(29, `購入 ${g.buy} C`, 'buy', () => trade('buy')).slot(33, `売却 ${g.sell} C`, 'sell', () => trade('sell')).slot(49, 'ショップへ戻る', 'previous', () => showShop(p)).show(p);
}
async function showWallet(p) {
    return new Chest('ウォレット', `残高 ${current(p).balance} C\n入札中の預り金は残高から除かれます。売上・返金は自動入金。`).slot(13, `${current(p).balance} C`, 'coin').slot(31, '送金する', 'send', async () => {
        const online = world.getPlayers().filter(o => o.id !== p.id);
        if (!online.length)
            throw Error('相手のオンラインプレイヤーがいません。');
        online.forEach(current);
        const r = await new ModalFormData().title('送金').dropdown('相手', online.map(o => o.name)).textField('金額 C', '100').show(p);
        if (r.canceled || !r.formValues)
            return;
        const id = online[Number(r.formValues[0])]?.id, n = Number(r.formValues[1]);
        if (!id)
            throw Error('相手を確認してください。');
        if (!await confirm(p, '送金確認', `${user(id)}へ ${n} C送りますか？`))
            return;
        tx(p, s => m.transfer(s, p.id, id, n));
        tell(p, '送金しました。');
        const target = world.getPlayers().find(o => o.id === id);
        if (target)
            safeTell(target, p.name + 'から' + n + ' C受け取りました。');
        return showWallet(p);
    }).slot(49, 'メニューへ戻る', 'menu', () => showHome(p)).show(p);
}
export function safeDestination(p, dest) { const dim = world.getDimension(dest.dimension), x = Math.floor(dest.x), y = Math.floor(dest.y), z = Math.floor(dest.z); const feet = dim.getBlock({ x, y, z }), head = dim.getBlock({ x, y: y + 1, z }), floor = dim.getBlock({ x, y: y - 1, z }); m.check(feet?.isAir && head?.isAir && floor && !floor.isAir && !floor.isLiquid && !['minecraft:cactus', 'minecraft:magma', 'minecraft:campfire', 'minecraft:soul_campfire', 'minecraft:fire', 'minecraft:soul_fire'].includes(floor.typeId), '移動先が未読み込みか、安全な空間・地面がありません。'); m.check(m.mayUse(store.state, p.id, dest.dimension, x, z, p.hasTag('smp.admin')), '移動先の土地への権限がありません。'); return dim; }
export function startTeleport(p, dest) { current(p); m.check(!teleports.has(p.id), '既に移動を準備中です。'); m.check(Date.now() >= (current(p).teleportAfter ?? 0), 'テレポートは30秒おきです。'); safeDestination(p, dest); teleports.set(p.id, { dest: { ...dest }, origin: { ...p.location }, dimension: p.dimension.id, readyAt: Date.now() + 5000 }); tell(p, '5秒後に移動します。動いたりダメージを受けると中止します。'); }
async function showHomes(p) {
    const d = current(p), c = new Chest('ホーム・スポーン', 'ホーム3件まで。移動準備中の移動・被ダメージでキャンセル。');
    Object.entries(d.homes).forEach(([name, pos], i) => c.slot(10 + i * 3, `${name}\n${pos.dimension} ${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`, 'home', async () => {
        if (await confirm(p, 'ホームへ移動', name + 'へ移動しますか？'))
            startTeleport(p, pos);
    }));
    return c.slot(28, '現在位置をホームに保存', 'save', async () => {
        const r = await new ModalFormData().title('ホームの登録').textField('ホーム名（16文字まで）', 'home').show(p);
        if (r.canceled || !r.formValues)
            return;
        const name = String(r.formValues[0]);
        m.check(m.mayUse(store.state, p.id, p.dimension.id, p.location.x, p.location.z, p.hasTag('smp.admin')), '他人の土地にはホームを登録できません。');
        if (Object.hasOwn(current(p).homes, name) && !await confirm(p, 'ホームの上書き', name + 'の位置を上書きしますか？'))
            return;
        tx(p, (s, d) => m.setHome(d, name, p.dimension.id, p.location));
        return showHomes(p);
    }).slot(30, 'ホームを削除', 'cancel', async () => {
        const names = Object.keys(current(p).homes);
        if (!names.length)
            throw Error('ホームがありません。');
        const r = await new ModalFormData().title('ホーム削除').dropdown('対象', names).show(p);
        if (r.canceled || !r.formValues)
            return;
        const name = names[Number(r.formValues[0])];
        if (await confirm(p, 'ホーム削除', name + 'を削除しますか？'))
            tx(p, (s, d) => m.removeHome(d, name));
        return showHomes(p);
    }).slot(32, 'ワールドスポーンへ', 'compass', () => { const pos = world.getDefaultSpawnLocation(); startTeleport(p, { dimension: 'minecraft:overworld', ...pos }); }).slot(34, '移動をキャンセル', 'cancel', () => { teleports.delete(p.id); tell(p, '準備中の移動を中止しました。'); }).slot(49, 'メニューへ戻る', 'menu', () => showHome(p)).show(p);
}
async function showLand(p) {
    const loc = p.location, here = m.landAt(store.state, p.dimension.id, loc.x, loc.z), c = new Chest('土地保護', `現在地 ${m.chunkKey(p.dimension.id, loc.x, loc.z)}\n所有者 ${here ? user(here.owner) : 'なし'} / 残高 ${current(p).balance} C`);
    c.slot(11, `現在の16×16区画を購入\n${CONFIG.claimPrice} C / 1人4区画まで`, 'buy', async () => {
        if (!await confirm(p, '土地の購入', '今立っている16×16区画を200 Cで購入します。'))
            return;
        tx(p, (s, d) => m.buyClaim(s, d, p.dimension.id, p.location.x, p.location.z));
        return showLand(p);
    });
    c.slot(15, '自分の土地を管理', 'land', () => showMyLand(p));
    return c.slot(49, 'メニューへ戻る', 'menu', () => showHome(p)).show(p);
}
async function showMyLand(p) { const lands = Object.entries(store.state.claims).filter(([key, c]) => c.owner === p.id); const c = new Chest('自分の土地', `${lands.length}/4区画`); lands.forEach(([key, land], i) => c.slot(10 + i, `${key}\n共有 ${land.trusted.length}人`, 'land', () => manageLand(p, key))); return c.slot(49, '戻る', 'previous', () => showLand(p)).show(p); }
async function manageLand(p, key) {
    const c = store.state.claims[key];
    if (!c || c.owner !== p.id)
        throw Error('自分の土地ではありません。');
    return new Chest('土地の管理', key + '\n共有: ' + (c.trusted.map(user).join('、') || 'なし')).slot(29, '共有者の追加・解除', 'players', async () => {
        const people = Object.values(store.state.players).filter(o => o.id !== p.id), f = new Chest('土地の共有', '対象をクリックして共有を切り替えます。');
        people.forEach((o, i) => f.slot(i, `${o.name}\n${store.state.claims[key].trusted.includes(o.id) ? '共有を解除' : '共有を許可'}`, 'players', async () => {
            const allow = !store.state.claims[key]?.trusted.includes(o.id);
            if (!await confirm(p, '共有者の変更', `${o.name}の共有を${allow ? '許可' : '解除'}しますか？`))
                return;
            tx(p, (s, d) => m.trust(s, d, key, o.id, allow));
            return manageLand(p, key);
        }));
        return f.slot(49, '戻る', 'previous', () => manageLand(p, key)).show(p);
    }).slot(33, '土地を放棄\n購入費は返金なし', 'cancel', async () => {
        if (!await confirm(p, '土地を放棄', '共有と保護を解除します。建物は残りますが、購入費は返金されません。'))
            return;
        tx(p, (s, d) => m.abandon(s, d, key));
        return showMyLand(p);
    }).slot(49, '戻る', 'previous', () => showMyLand(p)).show(p);
}
async function showGuide(p) {
    return new Chest('SMP ガイド', 'V3を参考に、成長・スキル・特殊モブ・バザーを追加。上段54枠＋所持品36枠。').slot(10, 'オークション\n出品アイテムと最高入札額を預かり、落札・取消後はBOXで回収。\n入札は現在額の5%以上更新（最低+1 C）。\n期限は現実時間で進み、再開時にも精算します。', 'hammer').slot(12, 'アイテムの制限\n初版は通常の素材・食料・ブロックのみ。\n名前・説明・特殊データ付き、装備・容器等は出品できません。', 'parcel').slot(14, '経済\n初回100 C・毎日100 C。素材売却で稼げます。\n通貨はこのSMPパック専用で、RPG版とは別です。', 'coin').slot(16, '移動\nホーム3件。5秒待機・30秒の再使用制限。\n安全な地面と空間、読み込まれた場所が必要。', 'home').slot(19, 'SMPレベルと4系統\n採掘・討伐・成熟作物・徒歩探索でXP。上限Lv.100。\nレベルごとにスキルポイントを獲得。', 'status').slot(21, 'スキルツリー\nレベルと前提を満たして解放し、ON/OFFできます。', 'skills').slot(23, 'TPA\n相手への移動申請。相手の承認後に5秒待機します。', 'players').slot(25, '物々交換バザー\n素材同士の即時交換。販売品と売上は受け取りBOXへ。', 'shop').slot(37, '特殊能力モブ\n疾風・鉄壁・仲間呼びなど10種類。地形操作は管理者設定でのみ有効。', 'combat').slot(39, 'ミニゲーム\nCを使うコイントスとスロット台。台の設置は管理者のみ。', 'casino').slot(41, '設定\nHUD・ネームタグ・安全なメニュー配置を切り替えます。', 'settings').slot(28, '土地\n1区画16×16・200 C・1人4区画。共有8人まで。\n通常の設置・破壊・コンテナを保護。\n自動機械・液体等の全経路を保証する保護ではありません。', 'land').slot(30, '操作できない場合\n/smp:menu または /scriptevent smp:menu で開きます。\n画像が崩れる場合はRPの標準UI互換モードを選択。', 'book').slot(32, 'メニューアイテムを受取\n無料支給は1回。再作成はコンパス＋チェスト。', 'menu', async () => { inventory(p, (inv, s, d) => { m.check(!d.book, '無料支給済みです。'); give(inv, 'smp:menu', 1); d.book = true; }); tell(p, 'SMPメニューを受け取りました。'); }).slot(34, '表示を切り替える\n標準リスト／チェスト型', 'refresh', () => {
        if (p.hasTag('smp.standard_ui'))
            p.removeTag('smp.standard_ui');
        else
            p.addTag('smp.standard_ui');
        return showHome(p);
    }).slot(49, '戻る', 'previous', () => showHome(p)).show(p);
}
export function heartbeat() {
    if (!store || !ready)
        return;
    try {
        settleNow();
    }
    catch (e) {
        console.warn('[SMP] オークション精算を停止: ' + e);
    }
    for (const [id, job] of teleports) {
        const p = world.getPlayers().find(p => p.id === id);
        if (!p) {
            teleports.delete(id);
            continue;
        }
        if (p.dimension.id !== job.dimension || Math.hypot(p.location.x - job.origin.x, p.location.y - job.origin.y, p.location.z - job.origin.z) > 0.35) {
            teleports.delete(id);
            safeTell(p, '動いたため移動を中止しました。');
            continue;
        }
        if (Date.now() < job.readyAt)
            continue;
        teleports.delete(id);
        try {
            const dim = safeDestination(p, job.dest), previous = current(p).teleportAfter ?? 0;
            tx(p, (s, d) => { d.teleportAfter = Date.now() + 30000; });
            try {
                p.teleport({ x: job.dest.x, y: job.dest.y, z: job.dest.z }, { dimension: dim });
            }
            catch (e) {
                tx(p, (s, d) => { d.teleportAfter = previous; });
                throw e;
            }
            safeTell(p, '移動しました。');
        }
        catch (e) {
            safeTell(p, String(e.message ?? e));
        }
    }
}
export function protection(e) {
    if (!store || !ready) {
        e.cancel = true;
        return;
    }
    const loc = e.block.location, offset = { East: [1, 0], West: [-1, 0], North: [0, -1], South: [0, 1], Up: [0, 0], Down: [0, 0] }[e.blockFace] ?? [0, 0], allowed = (x, z) => m.mayUse(store.state, e.player.id, e.player.dimension.id, x, z, e.player.hasTag('smp.admin'));
    if (!allowed(loc.x, loc.z) || !allowed(loc.x + offset[0], loc.z + offset[1])) {
        e.cancel = true;
        system.run(() => safeTell(e.player, 'この土地の操作には所有者の許可が必要です。'));
    }
}
function use(p, item) {
    if (item?.typeId !== 'smp:menu')
        return;
    const tick = system.currentTick;
    if (tick - (lastUse.get(p.id) ?? -100) < 4)
        return;
    lastUse.set(p.id, tick);
    guarded(p, () => showHome(p));
}
system.run(() => {
    try {
        store = new Store(world);
        settleNow();
        ready = true;
    }
    catch (e) {
        ready = false;
        console.error('[SMP] 保存の読み込み・精算に失敗。自動初期化しません。' + e);
    }
});
world.afterEvents.itemUse.subscribe(e => use(e.source, e.itemStack));
world.afterEvents.playerInteractWithBlock.subscribe(e => use(e.player, e.itemStack));
system.afterEvents.scriptEventReceive.subscribe(e => {
    const p = e.sourceEntity;
    if (['smp:menu', 'smp:standard', 'smp:chest'].includes(e.id) && p?.typeId === 'minecraft:player')
        guarded(p, () => {
            if (e.id === 'smp:standard')
                p.addTag('smp.standard_ui');
            if (e.id === 'smp:chest')
                p.removeTag('smp.standard_ui');
            return showHome(p);
        });
});
world.afterEvents.playerSpawn.subscribe(e => {
    if (!e.initialSpawn)
        return;
    system.runTimeout(() => guarded(e.player, () => {
        if (!current(e.player).book)
            inventory(e.player, (inv, s, d) => { give(inv, 'smp:menu', 1); d.book = true; });
        tell(e.player, 'SMPメニューを使うとチェスト型の機能一覧を開けます。');
    }), 40);
});
world.afterEvents.entityHurt.subscribe(e => {
    if (teleports.delete(e.hurtEntity.id))
        safeTell(e.hurtEntity, 'ダメージを受けたため移動を中止しました。');
});
world.beforeEvents.playerBreakBlock.subscribe(protection);
world.beforeEvents.playerInteractWithBlock.subscribe(protection);
world.beforeEvents.explosion.subscribe(e => {
    if (!store || !ready) {
        e.cancel = true;
        return;
    }
    e.setImpactedBlocks(e.getImpactedBlocks().filter(b => !m.landAt(store.state, e.dimension.id, b.location.x, b.location.z)));
});
system.runInterval(heartbeat, 20);
setupHub({ getState: () => ready ? store.state : undefined, update: fn => store.transaction(fn), current, tx, inventory, bag, confirm, showHome, showAuctions, showHomes, showInbox, showGuide, guarded, user, startTeleport, canMobEdit: (dim, x, z) => !m.landAt(store.state, dim, x, z) });
