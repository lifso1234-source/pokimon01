SET search_path TO poke, public;

BEGIN;

-- =====================================================================
-- 1. TYPE EFFECTIVENESS (Full 18x18 Matrix)
-- =====================================================================
INSERT INTO poke.type_effectiveness (attacking, defending, multiplier)
SELECT a.t, d.t, 1.00
FROM unnest(enum_range(NULL::poke.creature_type)) AS a(t)
CROSS JOIN unnest(enum_range(NULL::poke.creature_type)) AS d(t)
ON CONFLICT DO NOTHING;

-- Update non-1.00 matchups
WITH overrides(atk, def, mult) AS (
    VALUES
    -- Normal
    ('normal','rock',0.5),('normal','ghost',0),('normal','steel',0.5),
    -- Fire
    ('fire','fire',0.5),('fire','water',0.5),('fire','grass',2),('fire','ice',2),('fire','bug',2),('fire','rock',0.5),('fire','dragon',0.5),('fire','steel',2),
    -- Water
    ('water','fire',2),('water','water',0.5),('water','grass',0.5),('water','ground',2),('water','rock',2),('water','dragon',0.5),
    -- Electric
    ('electric','water',2),('electric','electric',0.5),('electric','grass',0.5),('electric','ground',0),('electric','flying',2),('electric','dragon',0.5),
    -- Grass
    ('grass','fire',0.5),('grass','water',2),('grass','grass',0.5),('grass','poison',0.5),('grass','ground',2),('grass','flying',0.5),('grass','bug',0.5),('grass','rock',2),('grass','dragon',0.5),('grass','steel',0.5),
    -- Ice
    ('ice','fire',0.5),('ice','water',0.5),('ice','grass',2),('ice','ice',0.5),('ice','ground',2),('ice','flying',2),('ice','dragon',2),('ice','steel',0.5),
    -- Fighting
    ('fighting','normal',2),('fighting','ice',2),('fighting','poison',0.5),('fighting','flying',0.5),('fighting','psychic',0.5),('fighting','bug',0.5),('fighting','rock',2),('fighting','ghost',0),('fighting','dark',2),('fighting','steel',2),('fighting','fairy',0.5),
    -- Poison
    ('poison','grass',2),('poison','poison',0.5),('poison','ground',0.5),('poison','rock',0.5),('poison','ghost',0.5),('poison','steel',0),('poison','fairy',2),
    -- Ground
    ('ground','fire',2),('ground','electric',2),('ground','grass',0.5),('ground','poison',2),('ground','flying',0),('ground','bug',0.5),('ground','rock',2),('ground','steel',2),
    -- Flying
    ('flying','electric',0.5),('flying','grass',2),('flying','fighting',2),('flying','bug',2),('flying','rock',0.5),('flying','steel',0.5),
    -- Psychic
    ('psychic','fighting',2),('psychic','poison',2),('psychic','psychic',0.5),('psychic','dark',0),('psychic','steel',0.5),
    -- Bug
    ('bug','fire',0.5),('bug','grass',2),('bug','fighting',0.5),('bug','poison',0.5),('bug','flying',0.5),('bug','psychic',2),('bug','ghost',0.5),('bug','dark',2),('bug','steel',0.5),('bug','fairy',0.5),
    -- Rock
    ('rock','fire',2),('rock','ice',2),('rock','fighting',0.5),('rock','ground',0.5),('rock','flying',2),('rock','bug',2),('rock','steel',0.5),
    -- Ghost
    ('ghost','normal',0),('ghost','psychic',2),('ghost','ghost',2),('ghost','dark',0.5),
    -- Dragon
    ('dragon','dragon',2),('dragon','steel',0.5),('dragon','fairy',0),
    -- Dark
    ('dark','fighting',0.5),('dark','psychic',2),('dark','ghost',2),('dark','dark',0.5),('dark','fairy',0.5),
    -- Steel
    ('steel','fire',0.5),('steel','water',0.5),('steel','electric',0.5),('steel','ice',2),('steel','rock',2),('steel','steel',0.5),('steel','fairy',2),
    -- Fairy
    ('fairy','fire',0.5),('fairy','fighting',2),('fairy','poison',0.5),('fairy','dragon',2),('fairy','dark',2),('fairy','steel',0.5)
)
UPDATE poke.type_effectiveness te
SET multiplier = o.mult::numeric(3,2)
FROM overrides o
WHERE te.attacking = o.atk::poke.creature_type
  AND te.defending = o.def::poke.creature_type;

-- =====================================================================
-- 2. MOVES (40 Core Moves across all types)
-- =====================================================================
INSERT INTO poke.moves (name, type, category, power, accuracy, max_pp, effect) VALUES
('Tackle',         'normal',   'physical', 40,  100, 35, '{}'),
('Quick Attack',   'normal',   'physical', 40,  100, 30, '{"priority": 1}'),
('Hyper Beam',     'normal',   'special',  150, 90,  5,  '{"recharge": true}'),
('Growl',          'normal',   'status',   0,   100, 40, '{"stat": "attack", "stages": -1}'),
('Ember',          'fire',     'special',  40,  100, 25, '{"status": "burn", "chance": 10}'),
('Flamethrower',   'fire',     'special',  90,  100, 15, '{"status": "burn", "chance": 10}'),
('Fire Blast',     'fire',     'special',  110, 85,  5,  '{"status": "burn", "chance": 10}'),
('Water Gun',      'water',    'special',  40,  100, 25, '{}'),
('Surf',           'water',    'special',  90,  100, 15, '{}'),
('Hydro Pump',     'water',    'special',  110, 80,  5,  '{}'),
('Vine Whip',      'grass',    'physical', 45,  100, 25, '{}'),
('Razor Leaf',     'grass',    'physical', 55,  95,  25, '{"high_crit": true}'),
('Solar Beam',     'grass',    'special',  120, 100, 10, '{"charge": true}'),
('Thunder Shock',  'electric', 'special',  40,  100, 30, '{"status": "paralysis", "chance": 10}'),
('Thunderbolt',    'electric', 'special',  90,  100, 15, '{"status": "paralysis", "chance": 10}'),
('Thunder Wave',   'electric', 'status',   0,   90,  20, '{"status": "paralysis", "chance": 100}'),
('Ice Beam',       'ice',      'special',  90,  100, 10, '{"status": "freeze", "chance": 10}'),
('Blizzard',       'ice',      'special',  110, 70,  5,  '{"status": "freeze", "chance": 10}'),
('Karate Chop',    'fighting', 'physical', 50,  100, 25, '{"high_crit": true}'),
('Close Combat',   'fighting', 'physical', 120, 100, 5,  '{"self_stat": ["defense", "sp_defense"], "stages": -1}'),
('Poison Sting',   'poison',   'physical', 15,  100, 35, '{"status": "poison", "chance": 30}'),
('Sludge Bomb',    'poison',   'special',  90,  100, 10, '{"status": "poison", "chance": 30}'),
('Mud-Slap',       'ground',   'special',  20,  100, 10, '{"stat": "accuracy", "stages": -1}'),
('Earthquake',     'ground',   'physical', 100, 100, 10, '{}'),
('Gust',           'flying',   'special',  40,  100, 35, '{}'),
('Air Slash',      'flying',   'special',  75,  95,  15, '{"flinch_chance": 30}'),
('Confusion',      'psychic',  'special',  50,  100, 25, '{"confuse_chance": 10}'),
('Psychic',        'psychic',  'special',  90,  100, 10, '{"stat": "sp_defense", "stages": -1, "chance": 10}'),
('Bug Bite',       'bug',      'physical', 60,  100, 20, '{}'),
('X-Scissor',      'bug',      'physical', 80,  100, 15, '{}'),
('Rock Throw',     'rock',     'physical', 50,  90,  15, '{}'),
('Stone Edge',     'rock',     'physical', 100, 80,  5,  '{"high_crit": true}'),
('Shadow Ball',    'ghost',    'special',  80,  100, 15, '{"stat": "sp_defense", "stages": -1, "chance": 20}'),
('Dragon Claw',    'dragon',   'physical', 80,  100, 15, '{}'),
('Draco Meteor',   'dragon',   'special',  130, 90,  5,  '{"self_stat": "sp_attack", "stages": -2}'),
('Bite',           'dark',     'physical', 60,  100, 25, '{"flinch_chance": 30}'),
('Crunch',         'dark',     'physical', 80,  100, 15, '{"stat": "defense", "stages": -1, "chance": 20}'),
('Iron Tail',      'steel',    'physical', 100, 75,  15, '{"stat": "defense", "stages": -1, "chance": 30}'),
('Flash Cannon',   'steel',    'special',  80,  100, 10, '{"stat": "sp_defense", "stages": -1, "chance": 10}'),
('Moonblast',      'fairy',    'special',  95,  100, 15, '{"stat": "sp_attack", "stages": -1, "chance": 30}');

-- =====================================================================
-- 3. SPECIES (55 Creatures across all biomes & evolution lines)
-- =====================================================================
INSERT INTO poke.species (dex_number, name, type1, type2, base_hp, base_attack, base_defense, base_sp_attack, base_sp_defense, base_speed, catch_rate, base_exp_yield) VALUES
(1,   'Bulbasaur',   'grass',    'poison',   45,  49,  49,  65,  65,  45,  45,  64),
(2,   'Ivysaur',     'grass',    'poison',   60,  62,  63,  80,  80,  60,  45,  142),
(3,   'Venusaur',    'grass',    'poison',   80,  82,  83,  100, 100, 80,  45,  236),
(4,   'Charmander',  'fire',     NULL,       39,  52,  43,  60,  50,  65,  45,  62),
(5,   'Charmeleon',  'fire',     NULL,       58,  64,  58,  80,  65,  80,  45,  142),
(6,   'Charizard',   'fire',     'flying',   78,  84,  78,  109, 85,  100, 45,  240),
(7,   'Squirtle',    'water',    NULL,       44,  48,  65,  50,  64,  43,  45,  63),
(8,   'Wartortle',   'water',    NULL,       59,  63,  80,  65,  80,  58,  45,  142),
(9,   'Blastoise',   'water',    NULL,       79,  83,  100, 85,  105, 78,  45,  239),
(10,  'Caterpie',    'bug',      NULL,       45,  30,  35,  20,  20,  45,  255, 39),
(12,  'Butterfree',  'bug',      'flying',   60,  45,  50,  90,  80,  70,  45,  178),
(16,  'Pidgey',      'normal',   'flying',   40,  45,  40,  35,  35,  56,  255, 50),
(18,  'Pidgeot',     'normal',   'flying',   83,  80,  75,  70,  70,  101, 45,  216),
(19,  'Rattata',     'normal',   NULL,       30,  56,  35,  25,  35,  72,  255, 51),
(25,  'Pikachu',     'electric', NULL,       35,  55,  40,  50,  50,  90,  190, 112),
(26,  'Raichu',      'electric', NULL,       60,  90,  55,  90,  80,  110, 75,  218),
(27,  'Sandshrew',   'ground',   NULL,       50,  75,  85,  20,  30,  40,  255, 60),
(28,  'Sandslash',   'ground',   NULL,       75,  100, 110, 45,  55,  65,  90,  158),
(35,  'Clefairy',    'fairy',    NULL,       70,  45,  48,  60,  65,  35,  150, 113),
(36,  'Clefable',    'fairy',    NULL,       95,  70,  73,  95,  90,  60,  25,  217),
(37,  'Vulpix',      'fire',     NULL,       38,  41,  40,  50,  65,  65,  190, 60),
(38,  'Ninetales',   'fire',     NULL,       73,  76,  75,  81,  100, 100, 75,  177),
(41,  'Zubat',       'poison',   'flying',   40,  45,  35,  30,  40,  55,  255, 49),
(42,  'Golbat',      'poison',   'flying',   75,  80,  70,  65,  75,  90,  90,  159),
(58,  'Growlithe',   'fire',     NULL,       55,  70,  45,  70,  50,  60,  190, 70),
(59,  'Arcanine',    'fire',     NULL,       90,  110, 80,  100, 80,  95,  75,  194),
(63,  'Abra',        'psychic',  NULL,       25,  20,  15,  105, 55,  90,  200, 62),
(65,  'Alakazam',    'psychic',  NULL,       55,  50,  45,  135, 95,  120, 50,  225),
(66,  'Machop',      'fighting', NULL,       70,  80,  50,  35,  35,  35,  180, 61),
(68,  'Machamp',     'fighting', NULL,       90,  130, 80,  65,  85,  55,  45,  227),
(74,  'Geodude',     'rock',     'ground',   40,  80,  100, 30,  30,  20,  255, 60),
(76,  'Golem',       'rock',     'ground',   80,  120, 130, 55,  65,  45,  45,  223),
(86,  'Seel',        'water',    NULL,       65,  45,  55,  45,  70,  45,  190, 65),
(87,  'Dewgong',     'water',    'ice',      90,  70,  80,  70,  95,  70,  75,  166),
(92,  'Gastly',      'ghost',    'poison',   30,  35,  30,  100, 35,  80,  190, 62),
(94,  'Gengar',      'ghost',    'poison',   60,  65,  60,  130, 75,  110, 45,  225),
(95,  'Onix',        'rock',     'ground',   35,  45,  160, 30,  45,  70,  45,  77),
(98,  'Krabby',      'water',    NULL,       30,  105, 90,  25,  25,  50,  225, 65),
(129, 'Magikarp',    'water',    NULL,       20,  10,  55,  15,  20,  80,  255, 40),
(130, 'Gyarados',    'water',    'flying',   95,  125, 79,  60,  100, 81,  45,  189),
(131, 'Lapras',      'water',    'ice',      130, 85,  80,  85,  95,  60,  45,  187),
(133, 'Eevee',       'normal',   NULL,       55,  55,  50,  45,  65,  55,  45,  65),
(134, 'Vaporeon',    'water',    NULL,       130, 65,  60,  110, 95,  65,  45,  184),
(135, 'Jolteon',     'electric', NULL,       65,  65,  60,  110, 95,  130, 45,  184),
(136, 'Flareon',     'fire',     NULL,       65,  130, 60,  95,  110, 65,  45,  184),
(143, 'Snorlax',     'normal',   NULL,       160, 110, 65,  65,  110, 30,  25,  189),
(144, 'Articuno',    'ice',      'flying',   90,  85,  100, 95,  125, 85,  3,   261),
(145, 'Zapdos',      'electric', 'flying',   90,  90,  85,  125, 90,  100, 3,   261),
(146, 'Moltres',     'fire',     'flying',   90,  100, 90,  125, 85,  90,  3,   261),
(147, 'Dratini',     'dragon',   NULL,       41,  64,  45,  50,  50,  50,  45,  60),
(148, 'Dragonair',   'dragon',   NULL,       61,  84,  65,  70,  70,  70,  45,  147),
(149, 'Dragonite',   'dragon',   'flying',   91,  134, 95,  100, 100, 80,  45,  270),
(150, 'Mewtwo',      'psychic',  NULL,       106, 110, 90,  154, 90,  130, 3,   306),
(220, 'Swinub',      'ice',      'ground',   50,  50,  40,  30,  30,  50,  225, 50),
(448, 'Lucario',     'fighting', 'steel',    70,  110, 70,  115, 70,  90,  45,  184);

-- =====================================================================
-- 4. SPECIES MOVES (Learnsets)
-- =====================================================================
INSERT INTO poke.species_moves (species_id, move_id, level)
SELECT s.id, m.id, v.lvl
FROM (VALUES
    ('Bulbasaur','Tackle',1),('Bulbasaur','Growl',1),('Bulbasaur','Vine Whip',7),('Bulbasaur','Razor Leaf',15),('Bulbasaur','Sludge Bomb',25),
    ('Ivysaur','Tackle',1),('Ivysaur','Vine Whip',7),('Ivysaur','Razor Leaf',15),('Ivysaur','Sludge Bomb',25),
    ('Venusaur','Vine Whip',1),('Venusaur','Razor Leaf',15),('Venusaur','Sludge Bomb',25),('Venusaur','Solar Beam',36),
    ('Charmander','Tackle',1),('Charmander','Growl',1),('Charmander','Ember',7),('Charmander','Flamethrower',24),
    ('Charmeleon','Ember',1),('Charmeleon','Bite',14),('Charmeleon','Flamethrower',24),
    ('Charizard','Flamethrower',1),('Charizard','Air Slash',28),('Charizard','Dragon Claw',34),('Charizard','Fire Blast',42),
    ('Squirtle','Tackle',1),('Squirtle','Water Gun',7),('Squirtle','Bite',15),('Squirtle','Surf',25),
    ('Wartortle','Water Gun',1),('Wartortle','Bite',15),('Wartortle','Surf',25),
    ('Blastoise','Surf',1),('Blastoise','Ice Beam',28),('Blastoise','Flash Cannon',34),('Blastoise','Hydro Pump',42),
    ('Caterpie','Tackle',1),('Caterpie','Bug Bite',6),
    ('Butterfree','Confusion',10),('Butterfree','Gust',12),('Butterfree','Bug Bite',16),('Butterfree','Air Slash',24),
    ('Pidgey','Tackle',1),('Pidgey','Gust',5),('Pidgey','Quick Attack',11),('Pidgey','Air Slash',25),
    ('Pidgeot','Quick Attack',1),('Pidgeot','Air Slash',25),('Pidgeot','Hyper Beam',40),
    ('Rattata','Tackle',1),('Rattata','Quick Attack',4),('Rattata','Bite',10),('Rattata','Crunch',22),
    ('Pikachu','Thunder Shock',1),('Pikachu','Quick Attack',6),('Pikachu','Thunder Wave',10),('Pikachu','Thunderbolt',22),('Pikachu','Iron Tail',30),
    ('Raichu','Thunder Shock',1),('Raichu','Quick Attack',1),('Raichu','Thunderbolt',22),('Raichu','Iron Tail',30),
    ('Sandshrew','Tackle',1),('Sandshrew','Mud-Slap',6),('Sandshrew','Earthquake',28),
    ('Sandslash','Mud-Slap',1),('Sandslash','X-Scissor',20),('Sandslash','Earthquake',28),
    ('Clefairy','Tackle',1),('Clefairy','Growl',1),('Clefairy','Moonblast',26),
    ('Clefable','Moonblast',1),('Clefable','Psychic',28),('Clefable','Ice Beam',32),
    ('Vulpix','Ember',1),('Vulpix','Quick Attack',9),('Vulpix','Flamethrower',24),
    ('Ninetales','Flamethrower',1),('Ninetales','Fire Blast',36),('Ninetales','Solar Beam',38),
    ('Zubat','Poison Sting',1),('Zubat','Bite',10),('Zubat','Air Slash',22),
    ('Golbat','Bite',1),('Golbat','Air Slash',22),('Golbat','Sludge Bomb',30),
    ('Growlithe','Bite',1),('Growlithe','Ember',6),('Growlithe','Flamethrower',24),
    ('Arcanine','Flamethrower',1),('Arcanine','Crunch',28),('Arcanine','Close Combat',36),('Arcanine','Fire Blast',40),
    ('Abra','Confusion',1),
    ('Alakazam','Confusion',1),('Alakazam','Psychic',24),('Alakazam','Shadow Ball',30),
    ('Machop','Karate Chop',1),('Machop','Close Combat',32),
    ('Machamp','Karate Chop',1),('Machamp','Earthquake',28),('Machamp','Close Combat',32),('Machamp','Stone Edge',36),
    ('Geodude','Tackle',1),('Geodude','Rock Throw',8),('Geodude','Earthquake',26),
    ('Golem','Rock Throw',1),('Golem','Earthquake',26),('Golem','Stone Edge',36),
    ('Seel','Water Gun',1),('Seel','Ice Beam',24),
    ('Dewgong','Surf',1),('Dewgong','Ice Beam',24),('Dewgong','Blizzard',38),
    ('Gastly','Confusion',1),('Gastly','Shadow Ball',22),
    ('Gengar','Shadow Ball',1),('Gengar','Sludge Bomb',28),('Gengar','Psychic',32),
    ('Onix','Tackle',1),('Onix','Rock Throw',10),('Onix','Iron Tail',24),('Onix','Stone Edge',34),
    ('Krabby','Water Gun',1),('Krabby','Mud-Slap',12),('Krabby','Surf',26),
    ('Magikarp','Tackle',1),
    ('Gyarados','Bite',1),('Gyarados','Surf',22),('Gyarados','Crunch',28),('Gyarados','Hydro Pump',38),
    ('Lapras','Water Gun',1),('Lapras','Ice Beam',22),('Lapras','Surf',28),('Lapras','Blizzard',38),
    ('Eevee','Tackle',1),('Eevee','Quick Attack',8),('Eevee','Bite',16),
    ('Vaporeon','Water Gun',1),('Vaporeon','Surf',24),('Vaporeon','Ice Beam',30),('Vaporeon','Hydro Pump',38),
    ('Jolteon','Thunder Shock',1),('Jolteon','Quick Attack',8),('Jolteon','Thunderbolt',24),('Jolteon','Shadow Ball',32),
    ('Flareon','Ember',1),('Flareon','Bite',16),('Flareon','Flamethrower',24),('Flareon','Fire Blast',38),
    ('Snorlax','Tackle',1),('Snorlax','Crunch',24),('Snorlax','Earthquake',32),('Snorlax','Hyper Beam',40),
    ('Articuno','Ice Beam',1),('Articuno','Air Slash',25),('Articuno','Blizzard',40),
    ('Zapdos','Thunderbolt',1),('Zapdos','Air Slash',25),('Zapdos','Thunder Wave',30),
    ('Moltres','Flamethrower',1),('Moltres','Air Slash',25),('Moltres','Fire Blast',40),
    ('Dratini','Tackle',1),('Dratini','Thunder Wave',10),('Dratini','Dragon Claw',24),
    ('Dragonair','Dragon Claw',1),('Dragonair','Surf',28),('Dragonair','Ice Beam',32),
    ('Dragonite','Dragon Claw',1),('Dragonite','Earthquake',34),('Dragonite','Draco Meteor',45),('Dragonite','Hyper Beam',50),
    ('Mewtwo','Psychic',1),('Mewtwo','Shadow Ball',30),('Mewtwo','Ice Beam',35),('Mewtwo','Hyper Beam',50),
    ('Swinub','Tackle',1),('Swinub','Mud-Slap',8),('Swinub','Ice Beam',22),('Swinub','Earthquake',30),
    ('Lucario','Quick Attack',1),('Lucario','Close Combat',28),('Lucario','Flash Cannon',32),('Lucario','Dragon Claw',36)
) AS v(sp_name, mv_name, lvl)
JOIN poke.species s ON s.name = v.sp_name
JOIN poke.moves m ON m.name = v.mv_name;

-- =====================================================================
-- 5. ITEMS & EVOLUTIONS
-- =====================================================================
INSERT INTO poke.items (name, category, description, buy_price, sell_price, effect, teaches_move_id) VALUES
('Poke Ball',    'ball',     'A device for catching wild creatures.',         200,  100, '{"catch_multiplier": 1.0}', NULL),
('Great Ball',   'ball',     'A high-performance Ball with higher catch rate.', 600,  300, '{"catch_multiplier": 1.5}', NULL),
('Ultra Ball',   'ball',     'An ultra-performance Ball.',                    1200, 600, '{"catch_multiplier": 2.0}', NULL),
('Master Ball',  'ball',     'The best Ball. Never fails to catch.',          NULL, 0,   '{"catch_multiplier": 255.0}', NULL),
('Potion',       'medicine', 'Restores 20 HP.',                               300,  150, '{"heal_hp": 20}', NULL),
('Super Potion', 'medicine', 'Restores 50 HP.',                               700,  350, '{"heal_hp": 50}', NULL),
('Hyper Potion', 'medicine', 'Restores 200 HP.',                              1200, 600, '{"heal_hp": 200}', NULL),
('Full Restore', 'medicine', 'Fully restores HP and cures all status.',       3000, 1500,'{"heal_hp": 9999, "cure_status": true}', NULL),
('Antidote',     'medicine', 'Cures poison.',                                 100,  50,  '{"cure_status": "poison"}', NULL),
('Paralyze Heal','medicine', 'Cures paralysis.',                              200,  100, '{"cure_status": "paralysis"}', NULL),
('Fire Stone',   'misc',     'Makes certain species evolve.',                 2100, 1050,'{"evolution_stone": "fire"}', NULL),
('Water Stone',  'misc',     'Makes certain species evolve.',                 2100, 1050,'{"evolution_stone": "water"}', NULL),
('Thunder Stone','misc',     'Makes certain species evolve.',                 2100, 1050,'{"evolution_stone": "thunder"}', NULL),
('Moon Stone',   'misc',     'Makes certain species evolve.',                 NULL, 1500,'{"evolution_stone": "moon"}', NULL),
('TM24 Thunderbolt','tm',    'Teaches Thunderbolt.',                          5000, 2500,'{}', (SELECT id FROM poke.moves WHERE name = 'Thunderbolt')),
('TM26 Earthquake', 'tm',    'Teaches Earthquake.',                           5000, 2500,'{}', (SELECT id FROM poke.moves WHERE name = 'Earthquake'));

INSERT INTO poke.evolutions (from_species_id, to_species_id, min_level, item_id)
SELECT f.id, t.id, v.lvl, i.id
FROM (VALUES
    ('Bulbasaur',  'Ivysaur',    16,   NULL),
    ('Ivysaur',    'Venusaur',   32,   NULL),
    ('Charmander', 'Charmeleon', 16,   NULL),
    ('Charmeleon', 'Charizard',  36,   NULL),
    ('Squirtle',   'Wartortle',  16,   NULL),
    ('Wartortle',  'Blastoise',  36,   NULL),
    ('Caterpie',   'Butterfree', 10,   NULL),
    ('Pidgey',     'Pidgeot',    18,   NULL),
    ('Pikachu',    'Raichu',     NULL, 'Thunder Stone'),
    ('Sandshrew',  'Sandslash',  22,   NULL),
    ('Clefairy',   'Clefable',   NULL, 'Moon Stone'),
    ('Vulpix',     'Ninetales',  NULL, 'Fire Stone'),
    ('Zubat',      'Golbat',     22,   NULL),
    ('Growlithe',  'Arcanine',   NULL, 'Fire Stone'),
    ('Abra',       'Alakazam',   16,   NULL),
    ('Machop',     'Machamp',    28,   NULL),
    ('Geodude',    'Golem',      25,   NULL),
    ('Seel',       'Dewgong',    34,   NULL),
    ('Gastly',     'Gengar',     25,   NULL),
    ('Magikarp',   'Gyarados',   20,   NULL),
    ('Eevee',      'Vaporeon',   NULL, 'Water Stone'),
    ('Eevee',      'Jolteon',    NULL, 'Thunder Stone'),
    ('Eevee',      'Flareon',    NULL, 'Fire Stone'),
    ('Dratini',    'Dragonair',  30,   NULL),
    ('Dragonair',  'Dragonite',  55,   NULL)
) AS v(from_name, to_name, lvl, item_name)
JOIN poke.species f ON f.name = v.from_name
JOIN poke.species t ON t.name = v.to_name
LEFT JOIN poke.items i ON i.name = v.item_name;

-- =====================================================================
-- 6. WILD ENCOUNTERS (Mapped to all walkable map terrains)
-- =====================================================================
INSERT INTO poke.encounters (terrain, species_id, min_level, max_level, weight)
SELECT v.ter::poke.terrain, s.id, v.min_l, v.max_l, v.w
FROM (VALUES
    -- Grass
    ('grass', 'Pidgey',     3,  12, 30),
    ('grass', 'Rattata',    3,  12, 30),
    ('grass', 'Caterpie',   3,  9,  20),
    ('grass', 'Pikachu',    5,  15, 10),
    ('grass', 'Bulbasaur',  5,  14, 5),
    ('grass', 'Growlithe',  8,  18, 10),
    ('grass', 'Eevee',      10, 20, 5),
    -- Wheat (Farms)
    ('wheat', 'Rattata',    6,  14, 35),
    ('wheat', 'Pidgey',     6,  14, 30),
    ('wheat', 'Vulpix',     10, 18, 15),
    ('wheat', 'Abra',       10, 16, 10),
    ('wheat', 'Snorlax',    25, 35, 3),
    -- Water & Deep Water (Fishing / Surfing)
    ('water',      'Magikarp',  3,  15, 45),
    ('water',      'Squirtle',  5,  15, 10),
    ('water',      'Seel',      12, 24, 25),
    ('water',      'Krabby',    10, 22, 20),
    ('deep water', 'Gyarados',  20, 35, 15),
    ('deep water', 'Lapras',    22, 35, 10),
    ('deep water', 'Dewgong',   25, 36, 20),
    ('deep water', 'Dratini',   15, 28, 8),
    -- Sand (Beaches & Delta)
    ('sand', 'Krabby',     8,  20, 35),
    ('sand', 'Sandshrew',  8,  20, 30),
    ('sand', 'Squirtle',   8,  18, 10),
    ('sand', 'Dratini',    18, 28, 5),
    -- Cave (The 4 Caverns)
    ('cave', 'Zubat',      10, 22, 40),
    ('cave', 'Geodude',    10, 22, 35),
    ('cave', 'Onix',       15, 28, 15),
    ('cave', 'Clefairy',   12, 24, 10),
    ('cave', 'Gastly',     14, 26, 15),
    -- Mountain (Foothills & Peaks)
    ('mountain', 'Geodude',    14, 26, 30),
    ('mountain', 'Machop',     14, 26, 25),
    ('mountain', 'Charmander', 12, 22, 10),
    ('mountain', 'Onix',       18, 30, 15),
    ('mountain', 'Moltres',    45, 50, 1),
    ('mountain', 'Zapdos',     45, 50, 1),
    -- Snow (Northern Range)
    ('snow', 'Swinub',     15, 28, 40),
    ('snow', 'Seel',       16, 28, 30),
    ('snow', 'Dewgong',    26, 38, 15),
    ('snow', 'Lapras',     25, 38, 10),
    ('snow', 'Articuno',   45, 50, 1)
) AS v(ter, sp_name, min_l, max_l, w)
JOIN poke.species s ON s.name = v.sp_name;

-- =====================================================================
-- 7. PLAYER USER ("Red" standing in Crossroads Plaza)
-- =====================================================================
WITH new_player AS (
    INSERT INTO poke.players (email, username, password_hash, trainer_name, money, pos_x, pos_y, respawn_x, respawn_y, last_login_at)
    VALUES (
        'red@pokeworld.local',
        'ash_ketchum',
        '$2b$12$ExampleHashedPasswordStringForLocalDevOnly12345',
        'Red',
        25000,
        260, 140,   -- Crossroads Central Plaza (walkable)
        260, 135,   -- Right beside Nurse Joy (260, 134)
        now()
    )
    RETURNING id
),
-- Give Player Inventory & Hotbar
inv AS (
    INSERT INTO poke.inventory (player_id, item_id, quantity)
    SELECT p.id, i.id, v.qty
    FROM new_player p
    CROSS JOIN (VALUES
        ('Poke Ball',    25),
        ('Great Ball',   15),
        ('Ultra Ball',   10),
        ('Master Ball',  1),
        ('Potion',       15),
        ('Super Potion', 10),
        ('Hyper Potion', 5),
        ('Full Restore', 3),
        ('Antidote',     5),
        ('Paralyze Heal',5),
        ('Fire Stone',   2),
        ('Water Stone',  2),
        ('Thunder Stone',2)
    ) AS v(item_name, qty)
    JOIN poke.items i ON i.name = v.item_name
    RETURNING player_id, item_id
),
hb AS (
    INSERT INTO poke.hotbar_slots (player_id, slot, item_id)
    SELECT p.id, v.slot, i.id
    FROM new_player p
    CROSS JOIN (VALUES
        (1, 'Poke Ball'),
        (2, 'Great Ball'),
        (3, 'Ultra Ball'),
        (4, 'Master Ball'),
        (5, 'Potion'),
        (6, 'Super Potion'),
        (7, 'Hyper Potion'),
        (8, 'Full Restore')
    ) AS v(slot, item_name)
    JOIN poke.items i ON i.name = v.item_name
),
-- =====================================================================
-- 8. PLAYER CREATURES: 6 Party + 30 PC Storage (36 Total)
-- =====================================================================
creature_seed(party_slot, storage_slot, sp_name, nickname, lvl, exp, hp) AS (
    VALUES
    -- Active Party (Slots 1-6)
    (1, NULL, 'Charizard',  'Blaze',     42, 74088,  135),
    (2, NULL, 'Pikachu',    'Sparky',    38, 54872,  92),
    (3, NULL, 'Blastoise',  'Shellshock',40, 64000,  132),
    (4, NULL, 'Venusaur',   'Flora',     40, 64000,  134),
    (5, NULL, 'Dragonite',  'Draco',     48, 110592, 165),
    (6, NULL, 'Lucario',    'Aura',      41, 68921,  125),
    -- PC Storage (Slots 1-30)
    (NULL, 1,  'Gengar',     'Shadow',    36, 46656,  105),
    (NULL, 2,  'Alakazam',   'Houdini',   37, 50653,  102),
    (NULL, 3,  'Machamp',    'Titan',     38, 54872,  135),
    (NULL, 4,  'Gyarados',   'Leviathan', 35, 42875,  128),
    (NULL, 5,  'Lapras',     'Nessie',    36, 46656,  156),
    (NULL, 6,  'Snorlax',    'Chonky',    35, 42875,  172),
    (NULL, 7,  'Arcanine',   'Fang',      39, 59319,  136),
    (NULL, 8,  'Vaporeon',   'Aqua',      32, 32768,  138),
    (NULL, 9,  'Jolteon',    'Bolt',      32, 32768,  98),
    (NULL, 10, 'Flareon',    'Pyro',      32, 32768,  98),
    (NULL, 11, 'Golem',      'Boulder',   34, 39304,  114),
    (NULL, 12, 'Ninetales',  'Kitsune',   33, 35937,  106),
    (NULL, 13, 'Pidgeot',    'Gustav',    36, 46656,  122),
    (NULL, 14, 'Butterfree', 'Flutter',   28, 21952,  84),
    (NULL, 15, 'Sandslash',  'Spikes',    30, 27000,  98),
    (NULL, 16, 'Clefable',   'Luna',      31, 29791,  114),
    (NULL, 17, 'Golbat',     'Screech',   29, 24389,  95),
    (NULL, 18, 'Dewgong',    'Frosty',    34, 39304,  120),
    (NULL, 19, 'Onix',       'Rocky',     27, 19683,  72),
    (NULL, 20, 'Eevee',      'Fluff',     18, 5832,   54),
    (NULL, 21, 'Bulbasaur',  NULL,        12, 1728,   38),
    (NULL, 22, 'Charmander', NULL,        12, 1728,   35),
    (NULL, 23, 'Squirtle',   NULL,        12, 1728,   37),
    (NULL, 24, 'Dratini',    'Noodle',    22, 10648,  62),
    (NULL, 25, 'Dragonair',  'Mystic',    38, 54872,  108),
    (NULL, 26, 'Swinub',     'Truffle',   19, 6859,   56),
    (NULL, 27, 'Articuno',   'Subzero',   50, 125000, 165),
    (NULL, 28, 'Zapdos',     'Thunder',   50, 125000, 165),
    (NULL, 29, 'Moltres',    'Phoenix',   50, 125000, 165),
    (NULL, 30, 'Mewtwo',     'Genesis',   70, 343000, 245)
),
inserted_creatures AS (
    INSERT INTO poke.creatures (owner_id, species_id, nickname, level, experience, current_hp, party_slot, storage_slot)
    SELECT p.id, s.id, cs.nickname, cs.lvl, cs.exp, cs.hp, cs.party_slot, cs.storage_slot
    FROM new_player p
    CROSS JOIN creature_seed cs
    JOIN poke.species s ON s.name = cs.sp_name
    RETURNING id, owner_id, species_id, level
)
-- Assign up to 4 learned moves per creature based on their species_moves & level
INSERT INTO poke.creature_moves (creature_id, slot, move_id, current_pp)
SELECT ic.id, ranked.rn, ranked.move_id, m.max_pp
FROM inserted_creatures ic
JOIN LATERAL (
    SELECT sm.move_id,
           row_number() OVER (ORDER BY sm.level DESC, sm.move_id ASC) AS rn
    FROM poke.species_moves sm
    WHERE sm.species_id = ic.species_id
      AND sm.level <= ic.level
    LIMIT 4
) ranked ON true
JOIN poke.moves m ON m.id = ranked.move_id;

-- Populate Catch History (Pokedex records for all 36 owned creatures + a few missed encounters)
INSERT INTO poke.catch_history (player_id, species_id, wild_level, outcome, miss_reason, balls_thrown, ball_item_id, creature_id, pos_x, pos_y)
SELECT c.owner_id,
       c.species_id,
       greatest(1, c.level - 5)::smallint,
       'caught'::poke.catch_outcome,
       NULL,
       2,
       (SELECT id FROM poke.items WHERE name = 'Ultra Ball'),
       c.id,
       260, 140
FROM poke.creatures c
WHERE c.owner_id = (SELECT id FROM poke.players WHERE username = 'ash_ketchum');

COMMIT;