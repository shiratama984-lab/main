import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';
import { GOODS, SPELLS } from '../behavior_pack/scripts/data.js';
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const bp = JSON.parse(fs.readFileSync('behavior_pack/manifest.json')), rp = JSON.parse(fs.readFileSync('resource_pack/manifest.json'));
test('packs have unique identities, stable API dependencies and complete JSON', () => { const ids = [bp.header.uuid, rp.header.uuid, ...bp.modules.map(m => m.uuid), ...rp.modules.map(m => m.uuid)]; assert.equal(new Set(ids).size, ids.length); assert.ok(bp.dependencies.every(d => d.version !== 'beta')); assert.ok(bp.dependencies.some(d => d.uuid === rp.header.uuid)); for (const p of [...files('behavior_pack'), ...files('resource_pack')].filter(p => p.endsWith('.json')))
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(p)), p); });
test('market goods exist in official vanilla item catalog or supplied custom items', () => { const known = new Set(Object.values(MinecraftItemTypes)); for (const p of files('behavior_pack/items'))
    known.add(JSON.parse(fs.readFileSync(p))['minecraft:item'].description.identifier); for (const g of GOODS) {
    assert.ok(known.has(g.item), g.item);
    assert.ok(fs.existsSync('resource_pack/textures/arpg/' + g.icon + '.png'));
} for (const s of Object.values(SPELLS))
    assert.ok(fs.existsSync('resource_pack/textures/arpg/' + s.icon + '.png')); });
test('custom home and market use 6 and 9 cells; native fallback is available', () => { const f = JSON.parse(fs.readFileSync('resource_pack/ui/arpg_forms.json')); for (const [page, rows] of [['home', 2], ['market', 3]]) {
    const grid = f[page + '_content'].controls.find(c => c.grid).grid;
    assert.deepEqual(grid.grid_dimensions, [3, rows]);
    assert.equal(grid.collection_name, 'form_buttons');
} const normal = JSON.parse(fs.readFileSync('resource_pack/subpacks/standard/ui/server_form.json')); const panel = normal.long_form.controls[0]['normal@common_dialogs.main_panel_no_buttons']; assert.equal(panel.$child_control, 'server_form.long_form_panel'); assert.equal(panel.bindings, undefined); });
test('monster client textures and geometry exist; raids can make natural mobs persistent', () => { for (const name of ['raider', 'shade']) {
    const s = JSON.parse(fs.readFileSync('behavior_pack/entities/' + name + '.json'))['minecraft:entity'];
    assert.ok(s.components['minecraft:despawn']);
    assert.ok(s.events['arpg:raid']);
    const p = JSON.parse(fs.readFileSync('resource_pack/entity/' + name + '.entity.json'))['minecraft:client_entity'].description;
    assert.ok(fs.existsSync('resource_pack/' + p.textures.default + '.png'));
    const png = fs.readFileSync('resource_pack/' + p.textures.default + '.png');
    assert.equal(png.readUInt32BE(16), 64);
    assert.equal(png.readUInt32BE(20), 32);
    assert.equal(p.geometry.default, 'geometry.arpg.humanoid');
} });
