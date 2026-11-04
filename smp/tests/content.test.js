import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';
import { COMMODITIES, SHOP } from '../behavior_pack/scripts/data.js';
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
test('all auction commodities and shop products exist in the official item catalog', () => { const ids = new Set(Object.values(MinecraftItemTypes)); for (const id of COMMODITIES)
    assert.ok(ids.has(id), id); for (const g of SHOP) {
    assert.ok(ids.has(g.item));
    assert.ok(COMMODITIES.has(g.item));
    assert.ok(g.sell < g.buy);
} });
test('manifests use stable APIs, all JSON parses, and resource dependency links correctly', () => { for (const p of [...files('behavior_pack'), ...files('resource_pack')].filter(p => p.endsWith('.json')))
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(p)), p); const bp = JSON.parse(fs.readFileSync('behavior_pack/manifest.json')), rp = JSON.parse(fs.readFileSync('resource_pack/manifest.json')); assert.ok(bp.dependencies.some(d => d.uuid === rp.header.uuid)); assert.ok(bp.dependencies.every(d => d.version !== 'beta')); const ids = [bp.header.uuid, rp.header.uuid, ...bp.modules.map(m => m.uuid), ...rp.modules.map(m => m.uuid)]; assert.equal(new Set(ids).size, ids.length); });
test('custom chest has 54 fixed cells, bound icons and hover details, plus native fallback', () => { const f = JSON.parse(fs.readFileSync('resource_pack/ui/smp_chest.json')); const grid = f.content.controls.find(c => c.grid).grid; assert.deepEqual(grid.grid_dimensions, [9, 6]); assert.equal(grid.collection_name, 'form_buttons'); const text = JSON.stringify(f); assert.match(text, /hover_text_renderer/); assert.match(text, /#form_button_texture/); const standard = JSON.parse(fs.readFileSync('resource_pack/subpacks/standard/ui/server_form.json')); assert.ok(!JSON.stringify(standard).includes('#visible')); });
test('all hardcoded menu icons and shop icons are supplied as PNG files', () => { const source = fs.readFileSync('behavior_pack/scripts/main.js', 'utf8'); const requested = [...source.matchAll(/\.slot\([^\n]*?,\s*'([a-z]+)'\s*,/g)].map(m => m[1]); assert.ok(requested.length > 10); for (const id of new Set([...requested, ...SHOP.map(g => g.icon), 'parcel', 'empty'])) {
    const p = 'resource_pack/textures/smp/' + id + '.png';
    assert.ok(fs.existsSync(p), p);
    const b = fs.readFileSync(p);
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
} });
