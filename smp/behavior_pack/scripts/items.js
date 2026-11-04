import { ItemStack } from '@minecraft/server';
import { COMMODITIES } from './data.js';
import { check } from './model.js';
export function plain(item) { if (!item || !COMMODITIES.has(item.typeId) || !item.isStackable || item.nameTag || item.keepOnDeath || item.lockMode !== 'none' || item.getLore().length || item.getDynamicPropertyIds().length || item.getCanDestroy().length || item.getCanPlaceOn().length)
    return false; return item.isStackableWith(new ItemStack(item.typeId, 1)); }
export function snapshot(item, n) { check(plain(item), '初版では通常の素材・食料・ブロックのみ出品できます。名前・説明・特殊データ付き、装備・本の内容・容器・独自アイテムは対象外です。'); check(Number.isSafeInteger(n) && n > 0 && n <= item.amount, '出品個数を確認してください。'); return { id: item.typeId, count: n }; }
export function takeSlot(inv, slot, expected, n) { const item = inv.getItem(slot); check(item?.typeId === expected, '選択したスロットのアイテムが変わりました。'); const data = snapshot(item, n); if (item.amount === n)
    inv.setItem(slot, undefined);
else {
    item.amount -= n;
    inv.setItem(slot, item);
} return data; }
export function removePlain(inv, id, n) { let available = 0; for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (item?.typeId === id && plain(item))
        available += item.amount;
} check(available >= n, '通常のアイテムが足りません。名前や説明のあるアイテムは売却しません。'); for (let i = 0; i < inv.size && n; i++) {
    const item = inv.getItem(i);
    if (item?.typeId !== id || !plain(item))
        continue;
    const take = Math.min(n, item.amount);
    n -= take;
    if (take === item.amount)
        inv.setItem(i, undefined);
    else {
        item.amount -= take;
        inv.setItem(i, item);
    }
} }
export function give(inv, id, n) { while (n) {
    const item = new ItemStack(id, 1), size = Math.min(n, item.maxAmount);
    item.amount = size;
    check(!inv.addItem(item), 'インベントリに空きを作ってください。');
    n -= size;
} }
export function atomicInventory(inv, operation) { const before = Array.from({ length: inv.size }, (_, i) => inv.getItem(i)); try {
    return operation();
}
catch (e) {
    for (let i = 0; i < inv.size; i++)
        inv.setItem(i, before[i]);
    throw e;
} }
