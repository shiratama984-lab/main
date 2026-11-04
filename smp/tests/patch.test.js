import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encoded } from '../behavior_pack/scripts/chest.js';
import { texture } from '../behavior_pack/scripts/textures.js';
import { give, protectMenus } from '../behavior_pack/scripts/items.js';
import { ItemStack, Inventory, player } from './mock-server.js';
import { showHome } from '../behavior_pack/scripts/main.js';
import { forms, responses } from './mock-ui.js';
import { SHOP } from '../behavior_pack/scripts/data.js';
test('count header preserves 1, 2, 10, 64, 100 and 999 independently from durability and tooltip', () => {
    for (const count of [1, 2, 10, 64, 100, 999]) {
        const text = encoded('品物 stack#  1', count, 75);
        assert.equal(text.slice(6, 9).trim(), String(count));
        assert.equal(text.slice(13, 15), '75');
        assert.equal(text.slice(15), '§r品物 stack#  1');
    }
    const ui = JSON.parse(fs.readFileSync('resource_pack/ui/chest_server_form.json'));
    const amount = ui.inventory_button_amount.controls[0].item_amount;
    assert.equal(amount.bindings.at(-1).source_property_name, "(('%.9s' * #form_button_text) - ('%.6s' * #form_button_text))");
});
test('new and existing menu items are locked and retained without overwriting occupied hotbar slots', () => {
    const p = player('patch-lock'), inv = p.inventory;
    give(inv, 'smp:menu', 1);
    let menu = inv.slots.find(i => i?.typeId === 'smp:menu');
    assert.equal(menu.lockMode, 'slot'); assert.equal(menu.keepOnDeath, true);
    menu.lockMode = 'none'; menu.keepOnDeath = false;
    inv.setItem(8, new ItemStack('minecraft:diamond', 64));
    protectMenus(inv, true);
    assert.equal(inv.getItem(8).amount, 64);
    menu = inv.slots.find(i => i?.typeId === 'smp:menu');
    assert.equal(menu.lockMode, 'slot'); assert.equal(menu.keepOnDeath, true);
    inv.setItem(8, undefined); protectMenus(inv, true);
    assert.equal(inv.getItem(8).typeId, 'smp:menu');
    assert.equal(inv.slots.filter(i => i?.typeId === 'smp:menu').length, 1);
});
test('common missing item textures resolve to vanilla paths and shop buttons carry sold quantities', async () => {
    for (const id of ['golden_axe', 'diamond_shovel', 'iron_hoe', 'leather_helmet', 'water_bucket', 'red_wool', 'jungle_planks', 'mace'])
        assert.notEqual(texture('minecraft:' + id), 'textures/smp/parcel', id);
    responses.push({ selection: 12 }, { canceled: true });
    await showHome(player('patch-shop'));
    const shop = forms.at(-1);
    SHOP.forEach((g, i) => assert.equal(shop.buttons[10 + i].text.slice(6, 9).trim(), String(g.count)));
});
