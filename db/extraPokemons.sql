-- =====================================================================
-- ADDITIVE SPECIES (DEX #19–#42) & STAT-SCALED BIOME ENCOUNTERS
-- Preserves all existing poke.species & poke.encounters rows untouched
-- =====================================================================

SET search_path TO poke, public;

BEGIN;

INSERT INTO poke.species
    (dex_number, name, type1, type2, base_hp, base_attack, base_defense,
     base_sp_attack, base_sp_defense, base_speed, catch_rate, base_exp_yield, sprite_url)
SELECT v.dex_number, v.name, v.type1::poke.creature_type, v.type2::poke.creature_type,
       v.base_hp, v.base_attack, v.base_defense,
       v.base_sp_attack, v.base_sp_defense, v.base_speed, v.catch_rate, v.base_exp_yield, v.sprite_url
FROM (VALUES
    -- Wheat & Meadow Line (Normal / Grass) — BST: 285 -> 455
    (19, 'Grainling',   'normal',  'grass',   50, 55, 45, 40, 45, 50, 210,  58, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/19.png'),
    (20, 'Harvesthorn', 'normal',  'grass',   80, 92, 75, 55, 70, 83,  85, 155, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/20.png'),

    -- Desert & Shoreline Line (Ground / Water) — BST: 300 -> 475
    (21, 'Duneshell',   'ground',  NULL,      52, 62, 68, 35, 45, 38, 195,  62, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/27.png'),
    (22, 'Duneclaw',    'ground',  'steel',   78, 102, 110, 45, 65, 75, 75, 168, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/28.png'),

    -- Lake & River Line (Water / Dragon) — BST: 310 -> 445 -> 550
    (23, 'Dewdrop',     'water',   NULL,      48, 45, 50, 62, 55, 50, 190,  64, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png'),
    (24, 'Tidefin',     'water',   'psychic', 72, 68, 70, 92, 78, 65,  85, 152, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/55.png'),
    (25, 'Abyssalord',  'water',   'dragon',  95, 95, 90, 115, 90, 65, 40, 242, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png'),

    -- Mountain & Volcanic Cavern Line (Fire / Rock) — BST: 315 -> 450 -> 545
    (26, 'Flintling',   'fire',    'rock',    50, 65, 65, 55, 40, 40, 185,  65, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png'),
    (27, 'Magmacore',   'fire',    'rock',    70, 90, 95, 75, 60, 60,  80, 158, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/75.png'),
    (28, 'Magmardon',   'fire',    'ground',  95, 120, 115, 85, 75, 55, 40, 240, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/76.png'),

    -- Alpine Snow Line (Ice / Ground) — BST: 315 -> 530
    (29, 'Glacipup',    'ice',     NULL,      55, 65, 50, 55, 50, 40, 180,  66, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/220.png'),
    (30, 'Avalanchar',  'ice',     'ground',  105, 115, 85, 70, 70, 85, 45, 232, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/473.png'),

    -- Sky & Highland Wind Line (Flying / Electric) — BST: 295 -> 470
    (31, 'Breezepuff',  'flying',  'normal',  45, 50, 40, 52, 43, 65, 200,  60, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/16.png'),
    (32, 'Stormhawk',   'flying',  'electric',75, 85, 65, 85, 65, 95,  75, 165, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/18.png'),

    -- Forest & Pollinator Line (Bug / Electric) — BST: 290 -> 445
    (33, 'Sparkfly',    'bug',     'electric',45, 45, 45, 60, 45, 50, 195,  61, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/595.png'),
    (34, 'Voltarach',   'bug',     'electric',70, 75, 60, 95, 60, 85,  80, 154, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/596.png'),

    -- Deep Cave Shadow & Crystal Line (Ghost / Poison & Rock / Fairy) — BST: 310 -> 495 & 520
    (35, 'Gloomite',    'ghost',   'poison',  40, 40, 40, 75, 50, 65, 180,  64, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/92.png'),
    (36, 'Phantasmog',  'ghost',   'poison',  65, 65, 60, 120, 75, 110, 50, 225, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png'),
    (37, 'Crystagon',   'rock',    'fairy',   70, 80, 130, 85, 110, 45, 45, 230, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/703.png'),

    -- Enchanted Glade & Dark Evolution Line — BST: 465 & 480
    (38, 'Duskwolf',    'dark',    NULL,      75, 105, 70, 65, 65, 85,  70, 166, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/262.png'),
    (39, 'Sylphlora',   'fairy',   'grass',   85, 60, 75, 105, 95, 60, 65, 175, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/549.png'),

    -- Additional Mid-Tier Biome Varieties (Poison, Fighting, Steel, Dragon)
    (40, 'Bogtoad',     'poison',  'water',   68, 72, 62, 70, 62, 56, 120, 125, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/453.png'),
    (41, 'Ironram',     'steel',   'rock',    70, 95, 105, 45, 65, 55,  85, 152, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/305.png'),
    (42, 'Drakelet',    'dragon',  'flying',  62, 82, 65, 75, 65, 76,  60, 148, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/371.png')
) AS v(dex_number, name, type1, type2, base_hp, base_attack, base_defense,
       base_sp_attack, base_sp_defense, base_speed, catch_rate, base_exp_yield, sprite_url)
WHERE NOT EXISTS (
    SELECT 1 FROM poke.species s WHERE s.name = v.name OR s.dex_number = v.dex_number
);
-- =====================================================================
-- 2. INSERT STAT-BALANCED ENCOUNTERS ACROSS ALL BIOMES
--    - High weight (8–14): Low-BST Stage-1 species (Lv. 2–7)
--    - Medium weight (4–7): Mid-BST Stage-2 & specialists (Lv. 6–14)
--    - Low weight (1–3): High-BST Final Evolutions & Apex rares (Lv. 12–22)
-- =====================================================================
INSERT INTO poke.encounters (terrain, species_id, min_level, max_level, weight)
SELECT v.terrain::poke.terrain, s.id, v.min_level, v.max_level, v.weight
FROM (VALUES
    -- GRASS (Starter Meadows, Forest Glades & Highland Valleys)
    ('grass', 'Grainling',   2,  5, 12),
    ('grass', 'Breezepuff',  2,  5, 11),
    ('grass', 'Sparkfly',    3,  6,  9),
    ('grass', 'Floraconda',  7, 11,  4),
    ('grass', 'Harvesthorn', 8, 12,  4),
    ('grass', 'Sylphlora',  11, 15,  2),

    -- WHEAT (Farm Fields outside Starter Village)
    ('wheat', 'Grainling',   2,  5, 14),
    ('wheat', 'Breezepuff',  3,  6, 10),
    ('wheat', 'Sparkfly',    3,  6,  9),
    ('wheat', 'Fairibun',    4,  7,  6),
    ('wheat', 'Harvesthorn', 7, 11,  5),
    ('wheat', 'Voltarach',   8, 12,  3),

    -- SAND (Lake Beaches, Island Shores & Riverbanks)
    ('sand', 'Duneshell',    3,  7, 12),
    ('sand', 'Dewdrop',      3,  7, 10),
    ('sand', 'Bogtoad',      5,  9,  7),
    ('sand', 'Tortide',      8, 12,  4),
    ('sand', 'Duneclaw',     9, 14,  4),
    ('sand', 'Tidefin',     10, 14,  3),

    -- MOUNTAIN (Rocky Foothills & High Slopes)
    ('mountain', 'Pebblit',    5,  9, 12),
    ('mountain', 'Flintling',  6, 10, 10),
    ('mountain', 'Breezepuff', 5,  8,  8),
    ('mountain', 'Ironram',    9, 14,  6),
    ('mountain', 'Cragoyle',  10, 15,  5),
    ('mountain', 'Magmacore', 10, 15,  5),
    ('mountain', 'Stormhawk', 11, 16,  4),
    ('mountain', 'Drakelet',  12, 17,  3),
    ('mountain', 'Blazewing', 16, 21,  1),
    ('mountain', 'Magmardon', 16, 22,  1),

    -- CAVE (One-Way-Entrance Caverns: Cliffside, Summit, Woods & Island)
    ('cave', 'Gloomite',     6, 10, 11),
    ('cave', 'Flintling',    7, 11,  9),
    ('cave', 'Duneshell',    6, 10,  8),
    ('cave', 'Ironram',     10, 14,  6),
    ('cave', 'Duskwolf',    10, 15,  5),
    ('cave', 'Phantasmog',  14, 19,  2),
    ('cave', 'Crystagon',   15, 20,  2),
    ('cave', 'Drakelet',    13, 18,  2),

    -- SNOW (High-Altitude Alpine Peaks)
    ('snow', 'Glacipup',     8, 12, 12),
    ('snow', 'Pebblit',      8, 12,  7),
    ('snow', 'Ironram',     11, 15,  5),
    ('snow', 'Stormhawk',   12, 16,  4),
    ('snow', 'Avalanchar',  15, 21,  2),
    ('snow', 'Crystagon',   15, 20,  1),

    -- PATH (Occasional roadside ambushes)
    ('path', 'Grainling',    2,  4, 10),
    ('path', 'Breezepuff',   2,  5, 10),
    ('path', 'Voltkit',      3,  6,  6),
    ('path', 'Duskwolf',     9, 13,  2),

    -- TREE & WATER (Included in case SPAWNABLE_TERRAINS enables them)
    ('tree', 'Sparkfly',     4,  8, 11),
    ('tree', 'Voltarach',    8, 12,  5),
    ('tree', 'Duskwolf',     9, 13,  4),
    ('tree', 'Sylphlora',   11, 15,  2),
    ('tree', 'Bloomadon',   15, 20,  1),

    ('water', 'Dewdrop',     3,  7, 13),
    ('water', 'Bubbloon',    3,  7, 11),
    ('water', 'Bogtoad',     6, 10,  7),
    ('water', 'Tortide',     8, 13,  5),
    ('water', 'Tidefin',     9, 14,  4),
    ('water', 'Tsunamurai', 15, 20,  1),
    ('water', 'Abyssalord', 16, 22,  1)
) AS v(terrain, species_name, min_level, max_level, weight)
JOIN poke.species s ON s.name = v.species_name
WHERE NOT EXISTS (
    SELECT 1 FROM poke.encounters e
    WHERE e.terrain = v.terrain::poke.terrain
      AND e.species_id = s.id
      AND e.min_level = v.min_level
      AND e.max_level = v.max_level
);

COMMIT;

rollback;