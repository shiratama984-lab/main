export function count(inv, id) { let n = 0; for (let i = 0; i < inv.size; i++) {
    const s = inv.getItem(i);
    if (s?.typeId === id)
        n += s.amount;
} return n; }
export function remove(inv, id, n) { if (count(inv, id) < n)
    throw Error('必要なアイテムが足りません。'); for (let i = 0; i < inv.size && n; i++) {
    const s = inv.getItem(i);
    if (s?.typeId !== id)
        continue;
    const take = Math.min(n, s.amount);
    n -= take;
    if (take === s.amount)
        inv.setItem(i, undefined);
    else {
        s.amount -= take;
        inv.setItem(i, s);
    }
} }
// Restores every slot if a state write or inventory operation fails. No awaits inside a transaction.
export function inventoryTransaction(inv, operation) { const before = Array.from({ length: inv.size }, (_, i) => inv.getItem(i)); try {
    return operation();
}
catch (e) {
    for (let i = 0; i < inv.size; i++)
        inv.setItem(i, before[i]);
    throw e;
} }
export function add(inv, item) { if (inv.addItem(item))
    throw Error('インベントリに空きを作ってください。'); }
