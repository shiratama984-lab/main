import { world, system, ItemStack, EntityDamageCause } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { Store } from './store.js';
import * as model from './model.js';
import { CLASS_NAMES, SPELLS, QUESTS, GOODS, HOSTILES, FOUNDATION_COST, CLAIM_COST } from './data.js';
import { remove, add, inventoryTransaction } from './inventory.js';
export const HOME_TITLE = '§6冒険者手帳 §0[ARPG:HOME]';
export const MARKET_TITLE = '§6城下町の市場 §0[ARPG:MARKET]';
/** @type {Store} */
export let store;
const busy = new Set(), lastUse = new Map();
const icon = id => 'textures/arpg/' + id;
const tell = (p, text) => p.sendMessage('§6[冒険と王国] §r' + text);
function form(title, body, buttons) { const f = new ActionFormData().title(title).body(body); for (const b of buttons) {
    if (typeof b === 'string')
        f.button(b);
    else
        f.button(b.text, icon(b.icon));
} return f; }
function bag(p) { const inv = p.getComponent('minecraft:inventory')?.container; if (!inv)
    throw Error('インベントリを取得できません。'); return inv; }
function current(p) { if (!store)
    throw Error('保存データを読み込めないため操作を停止しています。'); const key = p.id; if (!store.state.players[key])
    store.transaction(s => { if (Object.keys(s.players).length >= 48)
        throw Error('初版の登録上限（48人）です。'); s.players[key] = model.profile(key, p.name); }); return store.state.players[key]; }
function tx(p, fn) { current(p); return store.transaction(s => fn(s, s.players[p.id])); }
function withInventory(p, fn) { const inv = bag(p); return inventoryTransaction(inv, () => tx(p, (s, d) => fn(inv, s, d))); }
function give(inv, id, n) { add(inv, new ItemStack(id, n)); }
function run(p, fn) { if (busy.has(p.id))
    return; busy.add(p.id); Promise.resolve().then(() => { current(p); return fn(); }).catch(e => { try {
    tell(p, String(e.message ?? e));
}
catch { } }).finally(() => busy.delete(p.id)); }
async function confirm(p, title, text) { const r = await new MessageFormData().title(title).body(text).button1('実行する').button2('やめる').show(p); return !r.canceled && r.selection === 0; }
export async function showHome(p) {
    const d = current(p);
    const r = await form(HOME_TITLE, `Lv.${d.level} ${CLASS_NAMES[d.classId] ?? '見習い'}  |  ${d.gold} G\nMP ${d.mana}/${model.maxMana(d)}  |  ${store.state.kingdoms[d.kingdom]?.name ?? '無所属'}`, [{ text: '人物・装備', icon: 'sword' }, { text: '魔法書', icon: 'magic' }, { text: '依頼帳', icon: 'quest' }, { text: '市場・銀行', icon: 'coin' }, { text: '王国台帳', icon: 'crown' }, { text: '旅の手引き', icon: 'map' }]).show(p);
    if (r.canceled || r.selection === undefined)
        return;
    const pages = [showProfile, showMagic, showQuests, showMarket, showKingdom, showGuide];
    if (pages[r.selection])
        await pages[r.selection](p);
}
async function showProfile(p) {
    const d = current(p), health = p.getComponent('minecraft:health');
    const r = await form('人物と装備', `${p.name}\n職業: ${CLASS_NAMES[d.classId] ?? '未選択'} / レベル ${d.level}\n経験値 ${d.xp}/${model.xpRequired(d.level)}\nHP ${Math.ceil(health?.currentValue ?? 20)}/${health?.effectiveMax ?? 20}\nMP ${d.mana}/${model.maxMana(d)}\n所持金 ${d.gold} G / 討伐数 ${d.kills}\n\n職業で初期装備と最大MPが変わります。Lv.3で氷結を解放。`, [d.kit ? '初期装備は受取済み' : '職業を選び初期装備を受け取る', '戻る']).show(p);
    if (r.canceled || r.selection === undefined)
        return;
    if (r.selection === 1)
        return showHome(p);
    if (d.kit)
        return;
    const c = await new ModalFormData().title('初期職業').dropdown('職業', ['戦士：剣・盾・MP30', '魔法使い：杖・MP60', '弓使い：弓・矢・MP40']).show(p);
    if (c.canceled || !c.formValues)
        return;
    const id = ['warrior', 'mage', 'ranger'][Number(c.formValues[0])];
    withInventory(p, (inv, s, pd) => { model.chooseClass(pd, id); if (id === 'warrior') {
        give(inv, 'arpg:adventurer_blade', 1);
        give(inv, 'minecraft:shield', 1);
    } if (id === 'mage')
        give(inv, 'arpg:oak_staff', 1); if (id === 'ranger') {
        give(inv, 'minecraft:bow', 1);
        give(inv, 'minecraft:arrow', 32);
    } give(inv, 'minecraft:bread', 8); if (!pd.book) {
        give(inv, 'arpg:adventure_book', 1);
        pd.book = true;
    } });
    tell(p, '初期装備を受け取りました。');
}
async function showMagic(p) {
    const d = current(p), ids = Object.keys(SPELLS);
    const r = await form('魔法書', `MP ${d.mana}/${model.maxMana(d)} / 選択中: ${SPELLS[d.spell].name}\n樫の杖を使うと選択した魔法を発動します。`, [...ids.map(id => ({ text: `${SPELLS[id].name} / MP${SPELLS[id].cost}\n${d.level >= SPELLS[id].level ? '使用可能' : 'Lv.' + SPELLS[id].level + 'で解放'}`, icon: SPELLS[id].icon })), { text: '戻る', icon: 'back' }]).show(p);
    if (r.canceled || r.selection === undefined)
        return;
    if (r.selection === 3)
        return showHome(p);
    const id = ids[r.selection];
    if (!id)
        return;
    const sp = SPELLS[id];
    if (!await confirm(p, sp.name, sp.description + `\n必要レベル ${sp.level} / 消費MP ${sp.cost}\nこの魔法を杖に設定しますか？`))
        return;
    tx(p, (s, d) => { if (d.level < sp.level)
        throw Error('レベルが足りません。'); d.spell = id; });
    tell(p, '杖に' + sp.name + 'を設定しました。');
}
async function showQuests(p) {
    const d = current(p);
    const r = await form('冒険者ギルドの依頼', `街道の敵を倒すか、素材を納めて報酬を得ましょう。\n各依頼は1人1回です。討伐進捗 ${d.questKills}/3`, [...QUESTS.map(q => ({ text: q.name + (d.quests[q.id] ? '【完了】' : `\n報酬 ${q.reward} G`), icon: 'quest' })), { text: '戻る', icon: 'back' }]).show(p);
    if (r.canceled || r.selection === undefined)
        return;
    if (r.selection === QUESTS.length)
        return showHome(p);
    const q = QUESTS[r.selection];
    if (!q || !await confirm(p, q.name, q.description + `\n${q.reward} G / 経験値 ${q.xp}\n達成報告・納品を行いますか？`))
        return;
    withInventory(p, (inv, s, d) => { if (d.quests[q.id])
        throw Error('受取済みです。'); if (q.kind === 'delivery')
        remove(inv, q.item, q.count); model.claimQuest(d, q.id); });
    tell(p, '依頼を達成しました。' + q.reward + ' Gを獲得。');
}
async function showMarket(p) {
    const d = current(p);
    const r = await form(MARKET_TITLE, `所持金 ${d.gold} G\n素材を売る／装備と食糧を買う`, [...GOODS.map(g => ({ text: `${g.side === 'buy' ? '買' : '売'} ${g.name}×${g.count}\n${g.price} G`, icon: g.icon })), { text: '銀行・戻る', icon: 'back' }]).show(p);
    if (r.canceled || r.selection === undefined)
        return;
    if (r.selection === GOODS.length)
        return showBank(p);
    const g = GOODS[r.selection];
    if (!g)
        return;
    const q = await new ModalFormData().title(g.name + 'の取引').textField(`${g.count}個を1組として取引する組数（1〜64）`, '1', { defaultValue: '1' }).show(p);
    if (q.canceled || !q.formValues)
        return;
    const amount = Number(q.formValues[0]);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 64)
        throw Error('組数は1〜64の整数です。');
    if (!await confirm(p, '取引の確認', `${g.name} ${g.count * amount}個を${g.side === 'buy' ? '買います' : '売ります'}。\n合計 ${g.price * amount} G`))
        return;
    withInventory(p, (inv, s, d) => { const total = g.price * amount; if (g.side === 'buy') {
        model.money(d, -total);
        let left = g.count * amount;
        const max = new ItemStack(g.item, 1).maxAmount;
        while (left) {
            const n = Math.min(left, max);
            give(inv, g.item, n);
            left -= n;
        }
    }
    else {
        remove(inv, g.item, g.count * amount);
        model.money(d, total);
    } });
    tell(p, '取引が成立しました。');
}
async function showBank(p) {
    const r = await form('銀行', `所持金 ${current(p).gold} G`, ['プレイヤーへ送金', '市場に戻る', '手帳に戻る']).show(p);
    if (r.canceled || r.selection === undefined)
        return;
    if (r.selection === 1)
        return showMarket(p);
    if (r.selection === 2)
        return showHome(p);
    const targets = world.getPlayers().filter(x => x.id !== p.id);
    if (!targets.length)
        throw Error('送金できるオンラインプレイヤーがいません。');
    const f = await new ModalFormData().title('送金').dropdown('相手', targets.map(x => x.name)).textField('金額（1以上の整数）', '100').show(p);
    if (f.canceled || !f.formValues)
        return;
    const other = targets[Number(f.formValues[0])], amount = Number(f.formValues[1]);
    if (!other || !other.isValid)
        throw Error('相手が見つかりません。');
    current(other);
    if (!await confirm(p, '送金確認', `${other.name} へ ${amount} Gを送りますか？`))
        return;
    tx(p, s => model.transfer(s, p.id, other.id, amount));
    tell(p, '送金しました。');
    tell(other, p.name + 'から' + amount + ' Gを受け取りました。');
}
async function showKingdom(p) {
    const d = current(p), k = store.state.kingdoms[d.kingdom];
    if (!k) {
        const r = await form('王国台帳', `建国には ${FOUNDATION_COST} G が必要です。\n現在位置の16×16区画を最初の領地にします。`, ['王国を設立', '王国へ加入申請', '手帳へ戻る']).show(p);
        if (r.canceled || r.selection === undefined)
            return;
        if (r.selection === 2)
            return showHome(p);
        if (r.selection === 0) {
            const n = await new ModalFormData().title('王国の設立').textField('王国名（2〜20文字）', '新しい王国').show(p);
            if (n.canceled || !n.formValues)
                return;
            if (!await confirm(p, '建国の確認', `${n.formValues[0]}を設立し、${FOUNDATION_COST} Gを支払います。\n初版では国の解散・王位移譲はできません。`))
                return;
            const values = n.formValues;
            tx(p, (s, d) => model.foundKingdom(s, d, values[0], p.dimension.id, p.location.x, p.location.z));
            tell(p, '王国を設立しました。');
        }
        if (r.selection === 1) {
            const kingdoms = Object.values(store.state.kingdoms);
            if (!kingdoms.length)
                throw Error('まだ王国がありません。');
            const n = await form('加入先', `現在の申請先: ${store.state.kingdoms[d.joinRequest]?.name ?? 'なし'}`, kingdoms.map(k => k.name)).show(p);
            if (!n.canceled && n.selection !== undefined && kingdoms[n.selection]) {
                tx(p, (s, d) => model.requestJoin(s, d, kingdoms[Number(n.selection)].id));
                tell(p, '国王へ加入申請を送りました。');
            }
        }
        return;
    }
    const r = await form(k.name, `役職 ${roleName(k.members[p.id])} / 国民 ${Object.keys(k.members).length}人\n国庫 ${k.treasury} G / 領地 ${Object.values(store.state.claims).filter(id => id === k.id).length}/16区画\n防衛戦 ${k.raid ? `${k.raid.defeated}/3体討伐、${k.raid.spawned}/3体出現` : '待機中'}`, [{ text: '国庫へ入金', icon: 'coin' }, { text: '現在の区画を購入', icon: 'map' }, { text: '国民・加入申請', icon: 'crown' }, { text: '防衛戦', icon: 'sword' }, { text: '脱退', icon: 'back' }, { text: '手帳へ戻る', icon: 'book' }]).show(p);
    if (r.canceled || r.selection === undefined)
        return;
    if (r.selection === 5)
        return showHome(p);
    if (r.selection === 0) {
        const n = await new ModalFormData().title('国庫への入金').textField('金額', '100').show(p);
        if (!n.canceled && n.formValues) {
            const amount = Number(n.formValues[0]);
            tx(p, (s, d) => model.deposit(s, d, amount));
            tell(p, '国庫へ入金しました。');
        }
    }
    if (r.selection === 1 && await confirm(p, '領地の購入', `現在の16×16区画を国庫${CLAIM_COST} Gで購入します。自国領の隣接区画に限ります。`)) {
        tx(p, (s, d) => model.expand(s, d, p.dimension.id, p.location.x, p.location.z));
        tell(p, '領地を拡張しました。');
    }
    if (r.selection === 2)
        await showMembers(p);
    if (r.selection === 3) {
        const active = store.state.kingdoms[current(p).kingdom]?.raid;
        const n = await form('王国防衛戦', '国王が自国領で開始します。野盗3体を倒すと国庫へ60G。\n開始費40G。国王が付近にいる間に敵が出現します。\n生き残った野盗は再入場後も防衛戦の対象です。', active ? ['降参して防衛戦を終了', '閉じる'] : ['防衛戦を開始', '閉じる']).show(p);
        if (n.canceled || n.selection !== 0)
            return;
        if (!await confirm(p, '防衛戦の確認', active ? '敵を除去し終了します。開始費は戻りません。' : '自国の拠点近くに敵3体を出現させます。開始しますか？'))
            return;
        if (active) {
            const ids = tx(p, (s, d) => { const c = s.kingdoms[d.kingdom]; if (c.owner !== p.id)
                throw Error('国王だけが終了できます。'); const ids = c.raid?.mobs ?? []; c.raid = null; return ids; });
            for (const id of ids) {
                try {
                    world.getEntity(id)?.remove();
                }
                catch { }
            }
            tell(p, '防衛戦を終了しました。');
        }
        else {
            tx(p, (s, d) => model.beginRaid(s, d, p.dimension.id, p.location.x, p.location.y, p.location.z));
            tell(p, '防衛戦を開始しました。');
        }
    }
    if (r.selection === 4 && await confirm(p, '脱退', '王国を脱退しますか？')) {
        tx(p, (s, d) => model.leaveKingdom(s, d));
        tell(p, '脱退しました。');
    }
}
function roleName(id) { return { king: '国王', officer: '執政官', citizen: '国民' }[id] ?? id; }
async function showMembers(p) {
    const d = current(p), k = store.state.kingdoms[d.kingdom];
    if (!k)
        return;
    const entries = Object.entries(k.members).map(([id, role]) => ({ id, join: false, text: `${store.state.players[id]?.name ?? id} / ${roleName(role)}` }));
    if (k.owner === p.id)
        for (const a of Object.values(store.state.players))
            if (a.joinRequest === k.id && !a.kingdom)
                entries.push({ id: a.id, join: true, text: '加入申請: ' + a.name });
    const r = await form('国民と申請', k.owner === p.id ? '対象を選ぶと承認・役職変更ができます。' : '国民一覧（変更は国王のみ）', entries.map(e => e.text)).show(p);
    if (r.canceled || r.selection === undefined || !entries[r.selection] || k.owner !== p.id)
        return;
    const a = entries[r.selection];
    if (a.join) {
        if (await confirm(p, '加入承認', a.text + 'を承認しますか？'))
            tx(p, (s, d) => model.approveJoin(s, d, a.id));
    }
    else if (a.id !== p.id) {
        const n = await form('役職の変更', a.text, ['国民にする', '執政官にする']).show(p);
        if (!n.canceled && n.selection !== undefined)
            tx(p, (s, d) => model.setRole(s, d, a.id, n.selection === 0 ? 'citizen' : 'officer'));
    }
}
async function showGuide(p) { const r = await form('旅の手引き', '1. 人物で職業と初期装備を選びます。\n2. 敵の討伐と納品で経験値・Gを獲得。\n3. 魔法書で魔法を選び、樫の杖を使用。\n4. 市場で素材を売り、装備を購入。\n5. 300Gで建国、国庫へ寄付して領土を拡張。\n\n魔法はプレイヤーを攻撃しません。MPは毎秒1回復。\nPvPを望まない場合、ワールドのPvP設定を無効にしてください。\n領地内の設置・破壊・コンテナ操作は国民に限定します。\n死亡時のG喪失なし。職業・装備選択と各依頼は1回限り。', ['手帳を受け取る', '戻る']).show(p); if (r.canceled || r.selection === undefined)
    return; if (r.selection === 1)
    return showHome(p); withInventory(p, (inv, s, d) => { if (d.book)
    throw Error('支給済みです。紛失時は本とエメラルドでクラフトできます。'); give(inv, 'arpg:adventure_book', 1); d.book = true; }); }
export function cast(p) {
    const d = current(p), id = d.spell, spell = model.spellCheck(d, id, Date.now());
    let target;
    if (id === 'heal') {
        const h = p.getComponent('minecraft:health');
        if (!h || h.currentValue >= h.effectiveMax)
            throw Error('体力は満タンです。');
        const before = JSON.parse(JSON.stringify(d));
        tx(p, (s, d) => model.consumeSpell(d, id, Date.now()));
        try {
            h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + 6));
        }
        catch (e) {
            tx(p, (s, d) => { d.mana = before.mana; d.cooldowns = before.cooldowns; });
            throw e;
        }
    }
    else {
        const hit = p.getEntitiesFromViewDirection({ maxDistance: spell.range, ignoreBlockCollision: false }).find(h => HOSTILES.has(h.entity.typeId));
        target = hit?.entity;
        if (!target)
            throw Error('視線の先に対象の魔物がいません。');
        const loc = target.location;
        if (!model.mayBuild(store.state, p.id, target.dimension.id, loc.x, loc.z, p.hasTag('arpg.admin')))
            throw Error('他国領の魔物へ魔法を使用できません。');
        const before = JSON.parse(JSON.stringify(d));
        tx(p, (s, d) => model.consumeSpell(d, id, Date.now()));
        let accepted = false;
        try {
            accepted = target.applyDamage(spell.damage + Math.floor(d.level / 4), { cause: EntityDamageCause.magic, damagingEntity: p });
        }
        catch (e) {
            tx(p, (s, d) => { d.mana = before.mana; d.cooldowns = before.cooldowns; });
            throw e;
        }
        if (!accepted) {
            tx(p, (s, d) => { d.mana = before.mana; d.cooldowns = before.cooldowns; });
            throw Error('対象にダメージを与えられませんでした。');
        }
        if (id === 'frost' && target.isValid)
            target.addEffect('slowness', 80, { amplifier: 2, showParticles: true });
    }
    try {
        p.dimension.spawnParticle(id === 'heal' ? 'minecraft:heart_particle' : id === 'frost' ? 'minecraft:snowflake_particle' : 'minecraft:basic_flame_particle', target ? target.location : p.location);
    }
    catch { }
    tell(p, spell.name + 'を発動。');
}
function use(p, item) { if (item?.typeId !== 'arpg:adventure_book' && item?.typeId !== 'arpg:oak_staff')
    return; const t = system.currentTick; if (t - (lastUse.get(p.id) ?? -100) < 4)
    return; lastUse.set(p.id, t); run(p, () => item.typeId === 'arpg:adventure_book' ? showHome(p) : cast(p)); }
export function killed(e) {
    if (!store)
        return;
    const p = e.damageSource?.damagingEntity;
    if (p?.typeId === 'minecraft:player') {
        try {
            current(p);
            tx(p, (s, d) => model.creditKill(d, e.deadEntity.typeId, HOSTILES));
        }
        catch (err) {
            tell(p, String(err.message ?? err));
        }
    }
    const kingdom = Object.values(store.state.kingdoms).find(k => k.raid?.mobs.includes(e.deadEntity.id))?.id;
    if (kingdom) {
        try {
            store.transaction(s => model.raidDeath(s, String(kingdom), e.deadEntity.id));
        }
        catch (err) {
            console.warn('[ARPG] ' + err);
        }
    }
}
export function protection(e) {
    if (!store) {
        e.cancel = true;
        return;
    }
    const loc = e.block.location;
    const allowed = (x, z) => model.mayBuild(store.state, e.player.id, e.player.dimension.id, x, z, e.player.hasTag('arpg.admin'));
    // Check the clicked face as well as the block to stop placement across claim boundaries.
    const offsets = { East: [1, 0], West: [-1, 0], North: [0, -1], South: [0, 1], Up: [0, 0], Down: [0, 0] };
    const adjacent = offsets[e.blockFace] ?? [0, 0];
    if (!allowed(loc.x, loc.z) || !allowed(loc.x + adjacent[0], loc.z + adjacent[1])) {
        e.cancel = true;
        system.run(() => tell(e.player, 'この領地の操作は国民に許可されています。'));
    }
}
export function heartbeat() {
    if (!store)
        return;
    const online = world.getPlayers();
    try {
        if (online.some(p => { const d = store.state.players[p.id]; return d && d.mana < model.maxMana(d); }))
            store.transaction(s => { for (const p of online) {
                const d = s.players[p.id];
                if (d)
                    d.mana = Math.min(model.maxMana(d), d.mana + 1);
            } });
    }
    catch (e) {
        console.warn('[ARPG] MP保存失敗: ' + e);
    }
    for (const k of Object.values(store.state.kingdoms)) {
        const r = k.raid;
        if (!r || r.spawned >= 3)
            continue;
        const owner = online.find(p => p.id === k.owner && p.dimension.id === r.dimension && Math.hypot(p.location.x - r.x, p.location.z - r.z) < 48);
        if (!owner)
            continue;
        let entity;
        try {
            const dim = world.getDimension(r.dimension), angle = r.spawned * Math.PI * 2 / 3;
            const x = Math.floor(r.x + Math.cos(angle) * 7), z = Math.floor(r.z + Math.sin(angle) * 7);
            let y = r.y;
            for (let test = r.y + 4; test >= r.y - 4; test--) {
                const b = dim.getBlock({ x, y: test - 1, z });
                const a = dim.getBlock({ x, y: test, z });
                const head = dim.getBlock({ x, y: test + 1, z });
                if (b && !b.isAir && !b.isLiquid && a?.isAir && head?.isAir) {
                    y = test;
                    break;
                }
                if (test === r.y - 4)
                    throw Error('敵の出現場所に平坦な地面が必要です。');
            }
            entity = dim.spawnEntity('arpg:raider', { x: x + 0.5, y, z: z + 0.5 });
            entity.triggerEvent('arpg:raid');
            entity.setDynamicProperty('arpg:raid', k.id);
            store.transaction(s => { const raid = s.kingdoms[k.id].raid; if (!raid)
                throw Error('防衛戦が終了しました。'); raid.mobs.push(entity.id); raid.spawned++; });
        }
        catch (e) {
            try {
                entity?.remove();
            }
            catch { }
            tell(owner, '防衛戦の敵を出現できません: ' + String(e.message ?? e));
        }
    }
}
system.run(() => { try {
    store = new Store(world);
}
catch (e) {
    console.error('[ARPG] 保存の読み込みに失敗。データを変更しません。' + e);
} });
world.afterEvents.itemUse.subscribe(e => use(e.source, e.itemStack));
world.afterEvents.playerInteractWithBlock.subscribe(e => use(e.player, e.itemStack));
system.afterEvents.scriptEventReceive.subscribe(e => { if (e.id === 'arpg:menu' && e.sourceEntity?.typeId === 'minecraft:player')
    run(e.sourceEntity, () => showHome(e.sourceEntity)); });
world.afterEvents.playerSpawn.subscribe(e => { if (!e.initialSpawn)
    return; system.runTimeout(() => run(e.player, () => { current(e.player); const d = current(e.player); if (!d.book)
    withInventory(e.player, (inv, s, p) => { give(inv, 'arpg:adventure_book', 1); p.book = true; }); tell(e.player, '冒険者手帳を使って人物・魔法・依頼・王国を確認できます。'); }), 40); });
world.afterEvents.entityDie.subscribe(killed);
world.beforeEvents.playerBreakBlock.subscribe(protection);
world.beforeEvents.playerInteractWithBlock.subscribe(protection);
world.beforeEvents.explosion.subscribe(e => { if (!store) {
    e.cancel = true;
    return;
} e.setImpactedBlocks(e.getImpactedBlocks().filter(b => !model.claimAt(store.state, e.dimension.id, b.location.x, b.location.z))); });
system.runInterval(heartbeat, 20);
system.runInterval(() => { if (!store)
    return; for (const p of world.getPlayers()) {
    const d = store.state.players[p.id];
    if (!d)
        continue;
    try {
        const h = p.getComponent('minecraft:health'), k = model.claimAt(store.state, p.dimension.id, p.location.x, p.location.z);
        p.onScreenDisplay.setActionBar(`§c♥ ${Math.ceil(h?.currentValue ?? 20)} §bMP ${d.mana}/${model.maxMana(d)} §eLv.${d.level} §6${d.gold}G§r\n${SPELLS[d.spell].name}  |  ${k?.name ?? '未開拓地'}`);
    }
    catch { }
} }, 10);
