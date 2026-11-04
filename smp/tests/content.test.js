import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';
import { iconTexture } from '../behavior_pack/scripts/textures.js';
import { COMMODITIES, SHOP } from '../behavior_pack/scripts/data.js';
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
test('all auction commodities and shop products exist in the official item catalog', () => {
    const ids = new Set(Object.values(MinecraftItemTypes));
    for (const id of COMMODITIES)
        assert.ok(ids.has(id), id);
    for (const g of SHOP) {
        assert.ok(ids.has(g.item));
        assert.ok(COMMODITIES.has(g.item));
        assert.ok(g.sell < g.buy);
    }
});
test('manifests use stable APIs, all JSON parses, and resource dependency links correctly', () => {
    for (const p of [...files('behavior_pack'), ...files('resource_pack')].filter(p => p.endsWith('.json')))
        assert.doesNotThrow(() => JSON.parse(fs.readFileSync(p)), p);
    const bp = JSON.parse(fs.readFileSync('behavior_pack/manifest.json')), rp = JSON.parse(fs.readFileSync('resource_pack/manifest.json'));
    assert.ok(bp.dependencies.some(d => d.uuid === rp.header.uuid));
    assert.ok(bp.dependencies.every(d => d.version !== 'beta'));
    const ids = [bp.header.uuid, rp.header.uuid, ...bp.modules.map(m => m.uuid), ...rp.modules.map(m => m.uuid)];
    assert.equal(new Set(ids).size, ids.length);
});
test('native V3 chest binds 54 cells, 36 inventory previews, count and durability metadata', () => { const f = JSON.parse(fs.readFileSync('resource_pack/ui/chest_server_form.json')); assert.deepEqual(f.chest_panel.controls[1]['54@smp_native.smp_native_template']?.$grid_size ?? f.chest_panel.controls[1][Object.keys(f.chest_panel.controls[1])[0]].$grid_size, [9, 6]); const text = JSON.stringify(f); assert.match(text, /hover_text_renderer/); assert.match(text, /stack_size/); assert.match(text, /clip_ratio/); const inv = JSON.parse(fs.readFileSync('resource_pack/ui/chest_inventory_system.json')); assert.equal(inv.hotbar_items.$start_index, '$smp_slot_count'); assert.equal(inv.hotbar_items.controls.length, 9); assert.equal(inv.inventory_items.controls.length, 3); const standard = JSON.parse(fs.readFileSync('resource_pack/subpacks/standard/ui/server_form.json')); assert.ok(!JSON.stringify(standard).includes('#visible')); });
test('all hardcoded menu icons and shop icons are supplied as PNG files', () => {
    const source = fs.readFileSync('behavior_pack/scripts/main.js', 'utf8');
    const requested = [...source.matchAll(/\.slot\([^\n]*?,\s*'([a-z]+)'\s*,/g)].map(m => m[1]);
    assert.ok(requested.length > 10);
    for (const id of new Set([...requested, ...SHOP.map(g => g.icon), 'parcel', 'empty'])) {
        const texture = iconTexture(id);
        if (!texture.startsWith('textures/smp/')) {
            assert.ok(texture.startsWith('textures/'));
            continue;
        }
        const p = 'resource_pack/' + texture + '.png';
        assert.ok(fs.existsSync(p), p);
        const b = fs.readFileSync(p);
        assert.equal(b.subarray(1, 4).toString(), 'PNG');
    }
});
test('all 51 user reference files are recorded and every slot-machine animation bone exists', () => { const audit = JSON.parse(fs.readFileSync('vendor/REFERENCE_V3_AUDIT.json')); assert.equal(audit.files.length, 51); assert.equal(audit.files.filter(x => x.file.endsWith('.js')).length, 14); assert.ok(audit.files.every(x => x.sha256.length === 64)); const geo = JSON.parse(fs.readFileSync('resource_pack/models/entity/slot_machine.geo.json'))['minecraft:geometry'][0]; const bones = new Set(geo.bones.map(b => b.name)); const anim = JSON.parse(fs.readFileSync('resource_pack/animations/slot_machine.anim.json')); for (const a of Object.values(anim.animations))
    for (const name of Object.keys(a.bones ?? {}))
        assert.ok(bones.has(name), name); const client = JSON.parse(fs.readFileSync('resource_pack/entity/slot_machine.ce.json'))['minecraft:client_entity'].description; const controllers = JSON.parse(fs.readFileSync('resource_pack/animation_controllers/slot_machine.ac.json')).animation_controllers; for (const id of Object.values(client.animations))
    assert.ok(anim.animations[id] || controllers[id], id); });
