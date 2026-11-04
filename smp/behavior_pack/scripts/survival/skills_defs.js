// Data adapted from the user-provided SMP_Addon_v3.mcaddon.
export const SKILL_DEFS = [
    // ─── 採掘系 ────────────────────────────────────────────────
    { id: "mine_haste1", track: "mine", name: "⛏ 採掘速度I", desc: "ツルハシ使用中 ハーストI付与", cost: 1, minLv: 10, req: null },
    { id: "mine_night", track: "mine", name: "🌑 暗視", desc: "常時ナイトビジョン", cost: 1, minLv: 15, req: null },
    { id: "mine_silk", track: "mine", name: "🔬 シルクタッチ感知", desc: "鉱石破壊時 10%で+1ドロップ", cost: 2, minLv: 25, req: "mine_night" },
    { id: "mine_haste2", track: "mine", name: "⛏ 採掘速度II", desc: "ツルハシ使用中 ハーストII付与", cost: 2, minLv: 35, req: "mine_haste1" },
    { id: "mine_fortune", track: "mine", name: "💎 幸運採掘", desc: "鉱石採掘時 25%で追加素材1個", cost: 3, minLv: 50, req: "mine_haste2" },
    { id: "mine_xray", track: "mine", name: "🪨 地脈感知", desc: "100tick毎に周囲鉱石をパーティクル", cost: 3, minLv: 65, req: "mine_silk" },
    // ─── 戦闘系 ────────────────────────────────────────────────
    { id: "combat_str1", track: "combat", name: "⚔ 攻撃強化I", desc: "常時 ストレングスI", cost: 1, minLv: 10, req: null },
    { id: "combat_res", track: "combat", name: "🛡 防護本能", desc: "HP30%以下で耐性I", cost: 1, minLv: 20, req: null },
    { id: "combat_life", track: "combat", name: "🩸 生命力強奪", desc: "敵を倒すと少量HP回復", cost: 2, minLv: 30, req: "combat_str1" },
    { id: "combat_str2", track: "combat", name: "⚔ 攻撃強化II", desc: "常時 ストレングスII", cost: 2, minLv: 45, req: "combat_str1" },
    { id: "combat_burst", track: "combat", name: "💨 緊急回避", desc: "ダメージ時 Speed II (3秒)", cost: 2, minLv: 55, req: "combat_res" },
    { id: "combat_thorns", track: "combat", name: "🔱 反射の棘", desc: "20%の確率で被ダメージの30%を反射", cost: 3, minLv: 70, req: "combat_str2" },
    // ─── 農業系 ────────────────────────────────────────────────
    { id: "farm_sat", track: "farm", name: "🌾 豊作の恵み", desc: "食事の後に満腹を少し回復", cost: 1, minLv: 10, req: null },
    { id: "farm_regen", track: "farm", name: "🌿 緑の指", desc: "農業XP獲得時に少量HP回復", cost: 2, minLv: 25, req: "farm_sat" },
    { id: "farm_luck", track: "farm", name: "🍀 豊穣の加護", desc: "農業XP取得時 10%で2倍XP", cost: 2, minLv: 40, req: "farm_regen" },
    // ─── 探索系 ────────────────────────────────────────────────
    { id: "exp_speed1", track: "explore", name: "👣 旅人の足", desc: "常時 スピードI", cost: 1, minLv: 10, req: null },
    { id: "exp_health", track: "explore", name: "💪 体力強化", desc: "常時 HealthBoostI（HP+4）", cost: 1, minLv: 20, req: null },
    { id: "exp_feather", track: "explore", name: "🪶 落下軽減", desc: "常時 低速落下I", cost: 1, minLv: 25, req: "exp_health" },
    { id: "exp_speed2", track: "explore", name: "🏃 俊足", desc: "常時 スピードII", cost: 2, minLv: 45, req: "exp_speed1" },
    { id: "exp_saturation", track: "explore", name: "🍖 腹持ち", desc: "常時 Saturation（満腹維持）", cost: 2, minLv: 55, req: "exp_speed2" },
];
