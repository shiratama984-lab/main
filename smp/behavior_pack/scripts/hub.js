import { world, system, CommandPermissionLevel, CustomCommandStatus, CustomCommandParamType } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { Chest } from './chest.js';
import { read, change, xpNeeded, getTitle, skillLevel, SKILL_DEFS, unlock, toggle, award } from './survival/core.js';
import { TITLES } from './survival/constants.js';
import { installProgression } from './survival/runtime.js';
import { installMobs, TRAITS } from './survival/mobs.js';
import * as social from './social_model.js';
import { takeSlot, give, removePlain, plain } from './items.js';
import { label, itemIcon } from './data.js';
import { texture } from './textures.js';
let api;
const requests = new Map(), requestCooldown = new Map(), machineLocks = new Set();
function tell(p, s) { p.sendMessage('§b[SMP] §r' + s); }
function back(c, p) { return c.slot(49, 'メインメニューへ', 'menu', () => api.showHome(p)); }
export async function status(p) { const d = read(p), c = new Chest('ステータス', `§eLv.${d.lv} ${getTitle(d.lv).text}  §7${d.xp}/${xpNeeded(d.lv)} XP\n§6${api.current(p).balance} C §7/ スキルポイント ${d.points}`); const tracks = ['mine', 'combat', 'farm', 'explore']; for (let i = 0; i < 4; i++)
    c.slot(10 + i * 2, ['採掘', '戦闘', '農業', '探索'][i] + ` Lv.${skillLevel(d[tracks[i]])}\n累計 ${d[tracks[i]]} XP`, tracks[i]); c.slot(31, `総移動 ${(d.dist / 1000).toFixed(2)} km\n徒歩の移動だけを集計します。`, 'explore'); return back(c, p).slot(33, 'スキルツリーへ', 'skills', () => skills(p)).show(p); }
export async function skills(p) { const d = read(p), c = new Chest('スキルツリー', `所持 ${d.points} pt / SMP Lv.${d.lv}\n解放済み ${d.unlocked.length}/${SKILL_DEFS.length} / クリックで解放・切替`), rows = { mine: 10, combat: 19, farm: 28, explore: 37 }, offset = { mine: 0, combat: 0, farm: 0, explore: 0 }; for (const sk of SKILL_DEFS) {
    const owned = d.unlocked.includes(sk.id), on = d.active.includes(sk.id), ready = d.lv >= sk.minLv && (!sk.req || d.unlocked.includes(sk.req)) && d.points >= sk.cost;
    const name = (owned ? (on ? '§aON ' : '§7OFF ') : ready ? '§e解放可 ' : '§c未解放 ') + sk.name;
    c.slot(rows[sk.track] + offset[sk.track]++, name + `\n${sk.desc}\n必要 Lv.${sk.minLv} / ${sk.cost} pt` + (sk.req ? '\n前提: ' + SKILL_DEFS.find(s => s.id === sk.req)?.name : ''), sk.track, async () => { if (owned)
        change(p, data => toggle(data, sk.id));
    else {
        if (!await api.confirm(p, sk.name, sk.desc + `\n必要 Lv.${sk.minLv} / ${sk.cost} pt\n解放しますか？`))
            return;
        change(p, data => unlock(data, sk.id));
    } return skills(p); });
} return back(c, p).show(p); }
export async function ranking(p) { const data = world.getPlayers().map(o => ({ id: o.id, name: o.name, ...read(o) })).sort((a, b) => b.lv - a.lv || b.xp - a.xp); const c = new Chest('ランキング', '現在オンラインのプレイヤー / レベル順'); data.slice(0, 45).forEach((o, i) => c.slot(i, `${i + 1}位 ${o.name}\nLv.${o.lv} ${getTitle(o.lv).text}\n${o.xp}/${xpNeeded(o.lv)} XP`, 'rank')); return back(c, p).show(p); }
export async function titles(p) { const d = read(p), c = new Chest('称号コレクション', 'レベルで自動獲得。21段階の称号を一覧表示。'); TITLES.forEach((t, i) => c.slot(i, (d.lv >= t.min ? '§a獲得済 ' : '§8未獲得 ') + t.color + t.text + `\nLv.${t.min}以上`, 'titles')); return back(c, p).show(p); }
export async function settings(p) {
    const d = read(p), c = new Chest('設定', '自分のHUD・ネームタグ・メニュー配置を調整');
    for (const [slot, key, name] of [[11, 'hud', 'HUD表示'], [13, 'nameTag', 'レベル付きネームタグ'], [15, 'menuHotbar', '空いている右端へメニューを移動']])
        c.slot(Number(slot), `${name}\n${d[key] ? '§aON' : '§7OFF'}\n持ち物を上書きしません。`, 'settings', async () => { change(p, data => { data[key] = !data[key]; }); if (key === 'nameTag' && !read(p).nameTag)
            p.nameTag = p.name; return settings(p); });
    c.slot(29, 'チェスト／標準リストを切り替え', 'settings', () => { if (p.hasTag('smp.standard_ui'))
        p.removeTag('smp.standard_ui');
    else
        p.addTag('smp.standard_ui'); return settings(p); });
    if (p.hasTag('smp.admin')) {
        const cfg = api.getState().settings ?? {};
        for (const [slot, key, name] of [[32, 'enhancedMobs', '特殊能力モブ'], [34, 'mobTerrain', 'モブの地形操作']])
            c.slot(Number(slot), `管理: ${name}\n${cfg[key] ?? (key === 'enhancedMobs') ? '§aON' : '§7OFF'}\n地形操作は既定OFF。私有地とコンテナを除外。`, 'settings', async () => { if (!await api.confirm(p, 'ワールド設定', name + 'を切り替えますか？'))
                return; api.tx(p, s => { s.settings ??= {}; s.settings[key] = !(s.settings[key] ?? key === 'enhancedMobs'); }); return settings(p); });
    }
    return back(c, p).show(p);
}
export async function tpa(p) { const now = Date.now(); for (const [id, r] of requests)
    if (r.endAt <= now)
        requests.delete(id); const incoming = [...requests.values()].filter(r => r.to === p.id), others = world.getPlayers().filter(o => o.id !== p.id), c = new Chest('TPA リクエスト', `受信 ${incoming.length}件 / 有効30秒・送信CD15秒\n承認後も移動先の安全・土地権限を確認します。`); others.forEach((o, i) => c.slot(i, `${o.name}へ移動を申請\nLv.${read(o).lv}`, 'players', () => { if (Date.now() < (requestCooldown.get(p.id) ?? 0))
    throw Error('送信の再使用待ちです。'); if ([...requests.values()].some(r => r.from === p.id))
    throw Error('送信済みの申請があります。'); const id = p.id + '>' + o.id; requests.set(id, { id, from: p.id, to: o.id, endAt: Date.now() + 30000 }); requestCooldown.set(p.id, Date.now() + 15000); tell(p, '申請を送りました。'); tell(o, p.name + 'からTPA申請。メニューのTPAで承認できます。'); return tpa(p); })); incoming.slice(0, 8).forEach((r, i) => c.slot(36 + i, `受信: ${api.user(r.from)}\nクリックで承認・拒否`, 'mail', async () => { const accepted = await api.confirm(p, 'TPAの承認', api.user(r.from) + 'を現在地へ呼びますか？'); const fresh = requests.get(r.id); if (!fresh || fresh.endAt <= Date.now())
    throw Error('期限切れです。'); requests.delete(r.id); const from = world.getPlayers().find(o => o.id === r.from); if (!accepted) {
    if (from)
        tell(from, 'TPAは拒否されました。');
    return tpa(p);
} if (!from)
    throw Error('送信者がオフラインです。'); api.startTeleport(from, { dimension: p.dimension.id, ...p.location }); tell(p, '承認しました。相手が5秒待機します。'); })); return back(c, p).slot(47, '自分の送信を取り消す', 'cancel', () => { for (const [id, r] of requests)
    if (r.from === p.id)
        requests.delete(id); return tpa(p); }).show(p); }
const currencies = ['minecraft:emerald', 'minecraft:diamond', 'minecraft:iron_ingot', 'minecraft:gold_ingot', 'minecraft:coal'];
export async function bazaar(p) { const entries = Object.values(api.getState().barters ?? {}), c = new Chest('物々交換バザー', 'C通貨のオークションとは別の、素材同士の即時交換です。'); entries.slice(0, 45).forEach((b, i) => c.slot(i, `${label(b.item.id)} ×${b.item.count}\n交換: ${label(b.want.id)} ×${b.want.count}\n出品者 ${api.user(b.seller)}`, texture(b.item.id), async () => { const mine = b.seller === p.id; if (!await api.confirm(p, mine ? '出品取消' : '交換の確認', mine ? '受け取りBOXへ商品を返します。' : `${label(b.want.id)} ×${b.want.count}で交換します。両者の品物はBOXに届きます。`))
    return; if (mine)
    api.tx(p, (s, d) => social.cancelBarter(s, d, b.id));
else
    api.inventory(p, (inv, s, d) => { const want = social.buyBarter(s, d, b.id); removePlain(inv, want.id, want.count); }); return bazaar(p); }, b.item.count)); return back(c, p).slot(46, '交換品を出品', 'sell', () => listBarter(p)).slot(51, '受け取りBOX', 'mail', () => api.showInbox(p)).show(p); }
async function listBarter(p) { const inv = api.bag(p), c = new Chest('交換品を選ぶ', 'インベントリから通常の素材を選択します。'); c.selectInventory = true; for (let i = 0; i < Math.min(36, inv.size); i++) {
    const item = inv.getItem(i);
    if (!item || !plain(item))
        continue;
    const slot = i, id = item.typeId;
    c.slot(slot, `${label(id)} ×${item.amount}`, texture(id), async () => { const r = await new ModalFormData().title('交換条件').textField('販売個数', String(item.amount), { defaultValue: String(item.amount) }).dropdown('受け取る素材', currencies.map(label)).textField('受け取る個数（1〜999）', '1').show(p); if (r.canceled || !r.formValues)
        return; const n = Number(r.formValues[0]), want = { id: currencies[Number(r.formValues[1])], count: Number(r.formValues[2]) }; if (!await api.confirm(p, 'バザー出品', `${label(id)} ×${n} と ${label(want.id)} ×${want.count} を交換する出品です。`))
        return; api.inventory(p, (bag, s, d) => social.listBarter(s, d, takeSlot(bag, slot, id, n), want)); return bazaar(p); }, item.amount);
} return back(c, p).show(p); }
export async function arcade(p) { const duels = Object.values(api.getState().duels ?? {}).filter(d => d.from === p.id || d.to === p.id), c = new Chest('ミニゲーム', 'ゲーム内Cだけを使います。コイントスは勝者が両者の賭け金を獲得。'); c.slot(11, 'コイントスを申請', 'coin', async () => { const people = world.getPlayers().filter(o => o.id !== p.id); if (!people.length)
    throw Error('相手がいません。'); people.forEach(api.current); const r = await new ModalFormData().title('コイントス').dropdown('相手', people.map(o => o.name)).textField('賭け金 C（1〜10,000）', '10').show(p); if (r.canceled || !r.formValues)
    return; const to = people[Number(r.formValues[0])], n = Number(r.formValues[1]); if (!to)
    throw Error('相手を確認してください。'); if (!await api.confirm(p, '対戦申請', `${to.name}へ ${n} Cの対戦を申し込みます。あなたの賭け金を30秒間預かります。`))
    return; api.tx(p, (s, d) => social.requestDuel(s, d, to.id, n, Date.now())); tell(to, p.name + 'から対戦申請。ミニゲーム画面で承認できます。'); return arcade(p); }); duels.forEach((d, i) => c.slot(19 + i, `${api.user(d.from)} → ${api.user(d.to)}\n${d.stake} C / ${d.to === p.id ? '承認' : '取消'}`, 'mail', async () => { if (!await api.confirm(p, '対戦', d.to === p.id ? `${d.stake} Cで承認しますか？50%で両者の賭け金を獲得します。` : '申請を取り消して返金しますか？')) {
    api.tx(p, (s, player) => social.cancelDuel(s, player, d.id, Date.now()));
    return arcade(p);
} if (d.to === p.id) {
    if (!world.getPlayers().some(o => o.id === d.from))
        throw Error('相手がオフラインです。取消または期限切れで返金されます。');
    const result = api.tx(p, (s, player) => social.acceptDuel(s, player, d.id, Date.now(), Math.random()));
    tell(p, api.user(result.winner) + 'の勝利！');
}
else
    api.tx(p, (s, player) => social.cancelDuel(s, player, d.id, Date.now())); return arcade(p); })); c.slot(15, 'スロット台\n設置された台を右クリックして遊びます。\n1回5 C。支払・結果を先に保存し、演出中に退出しても失いません。', 'casino'); return back(c, p).show(p); }
export async function machine(p, entity) { if (machineLocks.has(entity.id))
    throw Error('この台は使用中です。'); machineLocks.add(entity.id); try {
    if (!await api.confirm(p, 'スロット台', '1回5 C。3揃いは3/4/20/10/30/8倍、チェリー2個で5 C、1個で2 C。結果は演出前に確定・保存します。'))
        return;
    const reels = [social.reel(Math.random()), social.reel(Math.random()), social.reel(Math.random())], pay = api.tx(p, (s, d) => social.spin(s, d, reels, Date.now()));
    tell(p, `抽選結果 ${reels.map(i => ['チェリー', 'レモン', '7', 'BAR', 'ダイヤ', 'ベル'][i]).join(' | ')} — ${pay} C獲得（支払5 C）`);
    try {
        reels.forEach((r, i) => entity.setProperty('smp:reel' + (i + 1) + '_result', r));
        entity.setProperty('smp:slot_state', 'spinning');
        system.runTimeout(() => { try {
            entity.setProperty('smp:slot_state', 'stopping');
        }
        catch { } }, 30);
        system.runTimeout(() => { try {
            entity.setProperty('smp:slot_state', pay ? 'result_win' : 'result_lose');
        }
        catch { } }, 70);
        system.runTimeout(() => { try {
            entity.setProperty('smp:slot_state', 'idle');
        }
        catch { } machineLocks.delete(entity.id); }, 110);
    }
    catch {
        machineLocks.delete(entity.id);
    }
    return;
}
finally {
    system.runTimeout(() => machineLocks.delete(entity.id), 120);
} }
export function setupHub(context) {
    api = context;
    installProgression(api);
    installMobs(api);
    world.afterEvents.playerInteractWithEntity.subscribe(e => { if (e.target.typeId === 'smp:slot_machine')
        api.guarded(e.player, () => machine(e.player, e.target)); });
    system.runInterval(() => { if (api.getState() && Object.values(api.getState().duels ?? {}).some(d => d.endAt <= Date.now()))
        try {
            api.update(s => social.expireDuels(s, Date.now()));
        }
        catch { } }, 20);
    system.beforeEvents.startup.subscribe(({ customCommandRegistry, itemComponentRegistry }) => {
        itemComponentRegistry.registerCustomComponent('smp:open_menu_v2', { onUse: e => system.run(() => api.guarded(e.source, () => api.showHome(e.source))) });
        const commands = { menu: api.showHome, help: api.showGuide, status, skills, rank: ranking, titles, settings, tpa, bazaar, auction: api.showAuctions, ah: api.showAuctions, home: api.showHomes, gamble: arcade, gamble_accept: arcade };
        for (const [name, fn] of Object.entries(commands))
            customCommandRegistry.registerCommand({ name: 'smp:' + name, description: 'SMP ' + name, permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, origin => { const p = origin.sourceEntity ?? origin.initiator; if (p?.typeId !== 'minecraft:player')
                return { status: CustomCommandStatus.Failure }; system.run(() => api.guarded(p, () => fn(p))); return { status: CustomCommandStatus.Success }; });
        customCommandRegistry.registerEnum('smp:track', ['mine', 'combat', 'farm', 'explore']);
        customCommandRegistry.registerEnum('smp:level_action', ['set', 'give', 'remove']);
        customCommandRegistry.registerCommand({ name: 'smp:givexp', description: '管理者用の経験値付与', permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ name: 'amount', type: CustomCommandParamType.Integer }, { name: 'smp:track', type: CustomCommandParamType.Enum }] }, (origin, n, track) => { const p = origin.sourceEntity ?? origin.initiator; if (p?.typeId !== 'minecraft:player' || !Number.isInteger(n) || n < 1 || n > 10000)
            return { status: CustomCommandStatus.Failure }; system.run(() => api.guarded(p, () => { change(p, d => award(d, n, track)); tell(p, '経験値を付与しました。'); })); return { status: CustomCommandStatus.Success }; });
        customCommandRegistry.registerCommand({ name: 'smp:level', description: '管理者用レベル操作', permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ name: 'target', type: CustomCommandParamType.PlayerSelector }, { name: 'smp:level_action', type: CustomCommandParamType.Enum }, { name: 'amount', type: CustomCommandParamType.Integer }] }, (origin, targets, action, n) => { if (!Number.isInteger(n) || n < 1 || n > 100)
            return { status: CustomCommandStatus.Failure }; system.run(() => { for (const p of targets)
            api.guarded(p, () => { change(p, d => { const old = d.lv; d.lv = action === 'set' ? n : action === 'give' ? Math.min(100, d.lv + n) : Math.max(1, d.lv - n); d.xp = 0; d.points = Math.max(0, d.points + d.lv - old); d.active = d.active.filter(id => (SKILL_DEFS.find(sk => sk.id === id)?.minLv ?? 1) <= d.lv); }); tell(p, '管理者がレベルを変更しました。'); }); }); return { status: CustomCommandStatus.Success }; });
        customCommandRegistry.registerCommand({ name: 'smp:summon_slot', description: '管理者用スロット台設置', permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, origin => { const p = origin.sourceEntity ?? origin.initiator; if (p?.typeId !== 'minecraft:player')
            return { status: CustomCommandStatus.Failure }; system.run(() => { const v = p.getViewDirection(); p.dimension.spawnEntity('smp:slot_machine', { x: p.location.x + v.x * 2, y: p.location.y, z: p.location.z + v.z * 2 }); }); return { status: CustomCommandStatus.Success }; });
    });
}
