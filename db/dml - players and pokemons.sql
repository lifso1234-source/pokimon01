-- ================================================================
-- POKE RPG: COMPLETE STARTER-WORLD SEED (DML)
-- For the schema in Pasted text(3).txt
-- PostgreSQL 13+
--
-- Seeds every table in schema poke:
-- type_effectiveness, species, moves, species_moves, items, evolutions,
-- map_tiles, encounters, npcs, npc_party, npc_shop_items, players,
-- player_npc_defeats, creatures, creature_moves, inventory, hotbar_slots,
-- battles, battle_creatures, catch_history.
--
-- Safe to re-run for the seeded natural keys. Existing unrelated data
-- is not deleted. The demo player's password_hash is deliberately a
-- placeholder: replace it with a real hash from your authentication app.
-- ================================================================

BEGIN;

-- ------------------------------------------------
-- 1) SPECIES
-- ------------------------------------------------
INSERT INTO poke.species
    (dex_number, name, type1, type2, base_hp, base_attack, base_defense,
     base_sp_attack, base_sp_defense, base_speed, catch_rate, base_exp_yield, sprite_url)
VALUES
(1,'Sproutle','grass',NULL,45,49,49,65,65,45,180,64,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'),
(2,'Floraconda','grass',NULL,60,62,63,80,80,60,90,142,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png'),
(3,'Bloomadon','grass','poison',80,82,83,100,100,80,45,236,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png'),
(4,'Embercub','fire',NULL,39,52,43,60,50,65,180,62,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png'),
(5,'Pyrolion','fire',NULL,58,64,58,80,65,80,90,142,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/5.png'),
(6,'Blazewing','fire','flying',78,84,78,109,85,100,45,240,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png'),
(7,'Bubbloon','water',NULL,44,48,65,50,64,43,180,63,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png'),
(8,'Tortide','water',NULL,59,63,80,65,80,58,90,142,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/8.png'),
(9,'Tsunamurai','water',NULL,79,83,100,85,105,78,45,239,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png'),
(10,'Voltkit','electric',NULL,40,45,40,65,40,65,190,60,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png'),
(11,'Thunderlynx','electric',NULL,65,75,60,95,70,115,75,160,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/11.png'),
(12,'Pebblit','rock',NULL,50,60,95,30,45,25,200,58,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/12.png'),
(13,'Cragoyle','rock','ground',80,95,120,45,65,35,60,165,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/13.png'),
(14,'Frostowl','ice','flying',55,45,50,85,75,75,90,145,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/14.png'),
(15,'Mossmoth','bug','grass',50,45,50,70,60,65,150,90,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/15.png'),
(16,'Shadepup','dark',NULL,45,60,40,50,40,65,120,88,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/16.png'),
(17,'Mindrake','psychic',NULL,60,45,55,105,95,90,75,160,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/17.png'),
(18,'Fairibun','fairy',NULL,70,45,48,60,65,55,150,95,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/18.png')
ON CONFLICT (dex_number) DO UPDATE SET
 name=EXCLUDED.name, type1=EXCLUDED.type1, type2=EXCLUDED.type2,
 base_hp=EXCLUDED.base_hp, base_attack=EXCLUDED.base_attack,
 base_defense=EXCLUDED.base_defense, base_sp_attack=EXCLUDED.base_sp_attack,
 base_sp_defense=EXCLUDED.base_sp_defense, base_speed=EXCLUDED.base_speed,
 catch_rate=EXCLUDED.catch_rate, base_exp_yield=EXCLUDED.base_exp_yield,
 sprite_url=EXCLUDED.sprite_url;

-- ------------------------------------------------
-- 2) MOVES + SPECIES LEARNSETS
-- ------------------------------------------------
INSERT INTO poke.moves (name,type,category,power,accuracy,max_pp,effect) VALUES
('Tackle','normal','physical',40,100,35,'{}'),
('Quick Strike','normal','physical',40,100,30,'{}'),
('Vine Lash','grass','physical',45,100,25,'{}'),
('Leaf Burst','grass','special',60,100,20,'{}'),
('Seed Mend','grass','status',0,NULL,10,'{"heal_fraction":0.25}'),
('Ember','fire','special',40,100,25,'{"chance_burn":0.1}'),
('Flame Arc','fire','special',65,100,15,'{"chance_burn":0.1}'),
('Water Jet','water','special',40,100,25,'{}'),
('Tidal Crash','water','special',65,100,15,'{}'),
('Static','electric','special',40,100,25,'{"chance_paralysis":0.1}'),
('Thunderbolt','electric','special',90,100,15,'{"chance_paralysis":0.1}'),
('Rock Toss','rock','physical',50,90,15,'{}'),
('Stone Wall','rock','status',0,NULL,15,'{"defense_stage":1}'),
('Ice Shard','ice','physical',40,100,30,'{}'),
('Bug Bite','bug','physical',50,100,20,'{}'),
('Shadow Sneak','dark','physical',40,100,25,'{}'),
('Mind Pulse','psychic','special',65,100,20,'{}'),
('Sparkle','fairy','special',50,100,25,'{}'),
('Poison Sting','poison','physical',35,100,25,'{"chance_poison":0.2}'),
('Wing Gust','flying','special',45,100,25,'{}')
ON CONFLICT (name) DO UPDATE SET
 type=EXCLUDED.type, category=EXCLUDED.category, power=EXCLUDED.power,
 accuracy=EXCLUDED.accuracy, max_pp=EXCLUDED.max_pp, effect=EXCLUDED.effect;

INSERT INTO poke.species_moves(species_id,move_id,level)
SELECT s.id,m.id,v.level
FROM (VALUES
 ('Sproutle','Tackle',1),('Sproutle','Vine Lash',5),('Sproutle','Seed Mend',9),
 ('Floraconda','Tackle',1),('Floraconda','Vine Lash',1),('Floraconda','Leaf Burst',12),
 ('Bloomadon','Vine Lash',1),('Bloomadon','Leaf Burst',18),('Bloomadon','Poison Sting',22),
 ('Embercub','Tackle',1),('Embercub','Ember',5),('Embercub','Flame Arc',14),
 ('Pyrolion','Tackle',1),('Pyrolion','Ember',1),('Pyrolion','Flame Arc',18),
 ('Blazewing','Flame Arc',1),('Blazewing','Wing Gust',12),
 ('Bubbloon','Tackle',1),('Bubbloon','Water Jet',5),('Bubbloon','Tidal Crash',14),
 ('Tortide','Water Jet',1),('Tortide','Stone Wall',10),('Tortide','Tidal Crash',18),
 ('Tsunamurai','Tidal Crash',1),('Tsunamurai','Water Jet',1),
 ('Voltkit','Tackle',1),('Voltkit','Static',5),('Voltkit','Thunderbolt',15),
 ('Thunderlynx','Static',1),('Thunderlynx','Thunderbolt',12),('Thunderlynx','Quick Strike',18),
 ('Pebblit','Tackle',1),('Pebblit','Rock Toss',6),('Pebblit','Stone Wall',12),
 ('Cragoyle','Rock Toss',1),('Cragoyle','Stone Wall',1),
 ('Frostowl','Ice Shard',1),('Frostowl','Wing Gust',8),
 ('Mossmoth','Bug Bite',1),('Mossmoth','Leaf Burst',12),
 ('Shadepup','Tackle',1),('Shadepup','Shadow Sneak',8),
 ('Mindrake','Mind Pulse',1),('Mindrake','Quick Strike',8),
 ('Fairibun','Tackle',1),('Fairibun','Sparkle',8)
) AS v(species_name,move_name,level)
JOIN poke.species s ON s.name=v.species_name
JOIN poke.moves m ON m.name=v.move_name
ON CONFLICT (species_id,move_id) DO UPDATE SET level=EXCLUDED.level;

-- ------------------------------------------------
-- 3) ITEMS + EVOLUTIONS
-- ------------------------------------------------
INSERT INTO poke.items(name,category,description,buy_price,sell_price,effect,teaches_move_id)
VALUES
('Basic Ball','ball','A basic device for catching wild creatures.',200,100,'{"catch_multiplier":1.0}',NULL),
('Great Ball','ball','A stronger catching device.',600,300,'{"catch_multiplier":1.5}',NULL),
('Potion','medicine','Restores 20 HP.',300,150,'{"heal_hp":20}',NULL),
('Super Potion','medicine','Restores 50 HP.',700,350,'{"heal_hp":50}',NULL),
('Antidote','medicine','Cures poison.',200,100,'{"cure_status":"poison"}',NULL),
('Revive','medicine','Revives a fainted creature with half HP.',1500,750,'{"revive_fraction":0.5}',NULL),
('Attack Charm','battle','Raises attack for one battle.',500,250,'{"attack_stage":1}',NULL),
('Everstone','held','Prevents evolution.',1000,500,'{"prevents_evolution":true}',NULL),
('Field Pass','key','A pass for the old forest gate.',NULL,NULL,'{"key":"forest_gate"}',NULL),
('TM Leaf Burst','tm','Teaches Leaf Burst.',1200,600,'{}',(SELECT id FROM poke.moves WHERE name='Leaf Burst')),
('TM Thunderbolt','tm','Teaches Thunderbolt.',3000,1500,'{}',(SELECT id FROM poke.moves WHERE name='Thunderbolt')),
('Berry','misc','A small berry. Restores 10 HP.',80,40,'{"heal_hp":10}',NULL)
ON CONFLICT (name) DO UPDATE SET
 category=EXCLUDED.category, description=EXCLUDED.description,
 buy_price=EXCLUDED.buy_price, sell_price=EXCLUDED.sell_price,
 effect=EXCLUDED.effect, teaches_move_id=EXCLUDED.teaches_move_id;

INSERT INTO poke.evolutions(from_species_id,to_species_id,min_level,item_id)
SELECT a.id,b.id,lv.level,NULL
FROM (VALUES ('Sproutle','Floraconda',16),('Floraconda','Bloomadon',32),
             ('Embercub','Pyrolion',16),('Pyrolion','Blazewing',36),
             ('Bubbloon','Tortide',16),('Tortide','Tsunamurai',36),
             ('Voltkit','Thunderlynx',24),('Pebblit','Cragoyle',28)) lv(a_name,b_name,level)
JOIN poke.species a ON a.name=lv.a_name
JOIN poke.species b ON b.name=lv.b_name
ON CONFLICT (from_species_id,to_species_id) DO UPDATE SET min_level=EXCLUDED.min_level;

-- ------------------------------------------------
-- 4) MAP: 100 x 100 organic starter region
--    River, lakes, bridges, forests, snowy mountains, three villages.
-- ------------------------------------------------
WITH grid AS (
 SELECT x,y,
   (sin(x*0.17+y*0.11)*0.50 + cos(x*0.07-y*0.19)*0.30
    + sin((x+y)*0.05)*0.20) AS n,
   (50 + sin(y*0.10)*10 + sin(y*0.035)*4.5) AS river_x,
   (x-16)*(x-16)/100.0 + (y-28)*(y-28)/81.0 AS lake1,
   (x-78)*(x-78)/121.0 + (y-74)*(y-74)/144.0 AS lake2,
   (x-43)*(x-43)/49.0 + (y-14)*(y-14)/64.0 AS lake3,
   (x-12)*(x-12)/196.0 + (y-55)*(y-55)/529.0 AS m1,
   (x-58)*(x-58)/225.0 + (y-12)*(y-12)/196.0 AS m2,
   (x-89)*(x-89)/144.0 + (y-52)*(y-52)/400.0 AS m3,
   sqrt((x-20)*(x-20)+(y-76)*(y-76)) AS v1,
   sqrt((x-50)*(x-50)+(y-50)*(y-50)) AS v2,
   sqrt((x-80)*(x-80)+(y-25)*(y-25)) AS v3
 FROM generate_series(0,99) AS xx(x)
 CROSS JOIN generate_series(0,99) AS yy(y)
),
terrain AS (
 SELECT x,y,
 CASE
   -- NPC / player landing and village service positions remain safe.
   WHEN (x,y) IN ((18,76),(21,76),(19,79),(48,50),(51,50),(50,53),
                  (78,25),(81,25),(80,28),(20,75),(50,49),(80,24))
     THEN 'path'::poke.terrain

   -- Bridges over the winding river.
   WHEN abs(x-river_x)<2.1 AND
        (abs(y-35)<1.6 OR abs(y-68)<1.6 OR abs(y-87)<1.6)
     THEN 'path'::poke.terrain

   -- Main river and three lakes.
   WHEN (abs(x-river_x)<1.25+abs(n)*0.35 AND lake1>1.25 AND lake2>1.25 AND lake3>1.25)
        OR lake1<0.92 OR lake2<0.92 OR lake3<0.92
     THEN 'water'::poke.terrain

   -- Shores.
   WHEN abs(x-river_x)<2.35 OR lake1<1.28 OR lake2<1.28 OR lake3<1.28
     THEN 'sand'::poke.terrain

   -- Mountain caps, slopes and foothills.
   WHEN m1<0.38 OR m2<0.38 OR m3<0.38 THEN 'snow'::poke.terrain
   WHEN m1<1.00 OR m2<1.00 OR m3<1.00 THEN 'wall'::poke.terrain
   WHEN m1<1.55 OR m2<1.55 OR m3<1.55 THEN 'cave'::poke.terrain

   -- Village roads.
   WHEN (v1<8 OR v2<8 OR v3<8)
        AND mod(abs(x*3+y*5),7)<3 THEN 'path'::poke.terrain

   -- Buildings around village centers.
   WHEN (v1<6 OR v2<6 OR v3<6)
        AND mod(abs(x*7+y*11),13)<3 THEN 'building'::poke.terrain

   -- Crop plots around settlements.
   WHEN (v1<12 OR v2<12 OR v3<12)
        AND mod(abs(x*3+y*5),17)<4 THEN 'wheat'::poke.terrain

   -- Broken forest patches.
   WHEN (sin(x*0.31+y*0.17)+cos(x*0.13-y*0.27)+n)>1.12
     THEN 'tree'::poke.terrain

   ELSE 'grass'::poke.terrain
 END AS terrain
 FROM grid
)
INSERT INTO poke.map_tiles(x,y,terrain,is_walkable)
SELECT x,y,terrain,(terrain NOT IN ('water','wall','building'))
FROM terrain
ON CONFLICT (x,y) DO UPDATE SET
 terrain=EXCLUDED.terrain, is_walkable=EXCLUDED.is_walkable;

-- ------------------------------------------------
-- 5) NPCS: three villages with trainers, shopkeepers, healers and locals
-- ------------------------------------------------
INSERT INTO poke.npcs(name,role,sprite_url,pos_x,pos_y,facing,sight_range,dialogue,reward_money,can_rebattle)
SELECT v.name,v.role::poke.npc_role,v.sprite_url,v.x,v.y,v.facing,v.sight,v.dialogue::jsonb,v.reward,v.rebattle
FROM (VALUES
 ('Mira','trainer','',18,76,'down',3,'{"intro":"Welcome to Meadow Village!","win":"Your team is growing stronger."}',250,true),
 ('Old Rowan','shopkeeper','',21,76,'left',0,'{"intro":"Need supplies for the road?","shop":"Welcome to my little shop."}',0,false),
 ('Nurse Fern','healer','',19,79,'up',0,'{"intro":"I can restore your team.","heal":"Your creatures are feeling great!"}',0,false),
 ('Tomas','generic','',23,73,'down',0,'{"intro":"The river bridge is the quickest way east."}',0,false),
 ('Kai','trainer','',48,50,'down',3,'{"intro":"Lets see what your team can do!","win":"Well battled!"}',400,true),
 ('Piper','shopkeeper','',51,50,'left',0,'{"intro":"Potions and balls, freshly stocked."}',0,false),
 ('Nurse Willow','healer','',50,53,'up',0,'{"intro":"Rest here before the mountain trail."}',0,false),
 ('Rin','generic','',54,48,'down',0,'{"intro":"Snow falls early near the northern peaks."}',0,false),
 ('Dax','trainer','',78,25,'down',3,'{"intro":"The highland route is no place for the unprepared."}',600,true),
 ('Moss','shopkeeper','',81,25,'left',0,'{"intro":"I carry supplies for mountain journeys."}',0,false),
 ('Nurse Skye','healer','',80,28,'up',0,'{"intro":"Take a moment to recover."}',0,false),
 ('Lina','generic','',84,23,'down',0,'{"intro":"There are rare creatures in the snowy woods."}',0,false)
) AS v(name,role,sprite_url,x,y,facing,sight,dialogue,reward,rebattle)
WHERE NOT EXISTS (SELECT 1 FROM poke.npcs n WHERE n.name=v.name);

-- Trainer teams
INSERT INTO poke.npc_party(npc_id,slot,species_id,level)
SELECT n.id,v.slot,s.id,v.level
FROM (VALUES
 ('Mira',1,'Sproutle',5),('Mira',2,'Bubbloon',4),
 ('Kai',1,'Pyrolion',14),('Kai',2,'Floraconda',13),
 ('Dax',1,'Thunderlynx',22),('Dax',2,'Cragoyle',21),('Dax',3,'Frostowl',20)
) v(npc_name,slot,species_name,level)
JOIN poke.npcs n ON n.name=v.npc_name
JOIN poke.species s ON s.name=v.species_name
ON CONFLICT(npc_id,slot) DO UPDATE SET species_id=EXCLUDED.species_id,level=EXCLUDED.level;

-- Shop stock
INSERT INTO poke.npc_shop_items(npc_id,item_id,price)
SELECT n.id,i.id,
 CASE WHEN n.name='Old Rowan' THEN
   CASE i.name WHEN 'Basic Ball' THEN 200 WHEN 'Potion' THEN 300 WHEN 'Antidote' THEN 200 ELSE 500 END
 ELSE
   CASE i.name WHEN 'Great Ball' THEN 600 WHEN 'Super Potion' THEN 700 WHEN 'Revive' THEN 1500 ELSE 300 END
 END
FROM poke.npcs n
CROSS JOIN poke.items i
WHERE n.name IN ('Old Rowan','Piper','Moss')
  AND i.name IN ('Basic Ball','Great Ball','Potion','Super Potion','Antidote','Revive','Berry')
ON CONFLICT(npc_id,item_id) DO UPDATE SET price=EXCLUDED.price;

-- ------------------------------------------------
-- 6) WILD ENCOUNTERS by terrain
-- ------------------------------------------------
INSERT INTO poke.encounters(terrain,species_id,min_level,max_level,weight)
SELECT v.terrain::poke.terrain,s.id,v.min_level,v.max_level,v.weight
FROM (VALUES
 ('grass','Sproutle',2,5,12),('grass','Embercub',2,5,8),
 ('grass','Bubbloon',2,5,10),('grass','Voltkit',3,6,7),
 ('grass','Mossmoth',3,7,8),('grass','Fairibun',3,6,4),
 ('tree','Mossmoth',4,8,12),('tree','Shadepup',5,9,5),
 ('tree','Mindrake',5,9,3),('wheat','Sproutle',3,6,10),
 ('wheat','Mossmoth',4,7,8),('sand','Pebblit',4,8,10),
 ('sand','Shadepup',5,9,4),('cave','Pebblit',7,12,12),
 ('cave','Cragoyle',9,14,5),('cave','Mindrake',8,12,3),
 ('snow','Frostowl',8,14,12),('snow','Bubbloon',7,11,3)
) v(terrain,species_name,min_level,max_level,weight)
JOIN poke.species s ON s.name=v.species_name
WHERE NOT EXISTS (
  SELECT 1 FROM poke.encounters e
  WHERE e.terrain=v.terrain::poke.terrain AND e.species_id=s.id
    AND e.min_level=v.min_level AND e.max_level=v.max_level
);

-- ------------------------------------------------
-- 7) DEMO PLAYER
--    IMPORTANT: replace password_hash with a real application-generated hash.
-- ------------------------------------------------
INSERT INTO poke.players
 (id,email,username,password_hash,trainer_name,money,pos_x,pos_y,respawn_x,respawn_y,last_login_at)
VALUES
 ('11111111-1111-4111-8111-111111111111',
  'demo@poke.local','demo',
  'REPLACE_WITH_REAL_PASSWORD_HASH',
  'Rookie',3000,20,75,19,79,now())
ON CONFLICT(id) DO UPDATE SET
 pos_x=EXCLUDED.pos_x,pos_y=EXCLUDED.pos_y,
 respawn_x=EXCLUDED.respawn_x,respawn_y=EXCLUDED.respawn_y;

-- Starter creature and a second creature in PC storage
INSERT INTO poke.creatures(id,owner_id,species_id,nickname,level,experience,current_hp,status,party_slot,storage_slot)
SELECT v.creature_id::uuid,p.id,s.id,v.nickname,v.level,v.xp,v.hp,'none',v.party_slot,v.storage_slot
FROM (VALUES
 ('22222222-2222-4222-8222-222222222221','Sproutle','Sprig',5,125,20,1,NULL),
 ('22222222-2222-4222-8222-222222222222','Bubbloon','Bubbles',4,64,18,NULL,1)
) v(creature_id,species_name,nickname,level,xp,hp,party_slot,storage_slot)
JOIN poke.players p ON p.id='11111111-1111-4111-8111-111111111111'
JOIN poke.species s ON s.name=v.species_name
ON CONFLICT(id) DO NOTHING;

-- Creature moves for the demo starter creatures
INSERT INTO poke.creature_moves(creature_id,slot,move_id,current_pp)
SELECT c.id,v.slot,m.id,v.pp
FROM (VALUES
 ('22222222-2222-4222-8222-222222222221',1,'Tackle',35),
 ('22222222-2222-4222-8222-222222222221',2,'Vine Lash',25),
 ('22222222-2222-4222-8222-222222222221',3,'Seed Mend',10),
 ('22222222-2222-4222-8222-222222222222',1,'Tackle',35),
 ('22222222-2222-4222-8222-222222222222',2,'Water Jet',25)
) v(creature_id,slot,move_name,pp)
JOIN poke.creatures c ON c.id=v.creature_id::uuid
JOIN poke.moves m ON m.name=v.move_name
ON CONFLICT(creature_id,slot) DO NOTHING;

-- Inventory and hotbar
INSERT INTO poke.inventory(player_id,item_id,quantity)
SELECT p.id,i.id,v.quantity
FROM (VALUES ('Basic Ball',10),('Potion',5),('Antidote',2),('Berry',3)) v(item_name,quantity)
JOIN poke.players p ON p.id='11111111-1111-4111-8111-111111111111'
JOIN poke.items i ON i.name=v.item_name
ON CONFLICT(player_id,item_id) DO UPDATE SET quantity=EXCLUDED.quantity;

INSERT INTO poke.hotbar_slots(player_id,slot,item_id)
SELECT p.id,v.slot,i.id
FROM (VALUES (1,'Basic Ball'),(2,'Potion'),(3,'Antidote'),(4,'Berry')) v(slot,item_name)
JOIN poke.players p ON p.id='11111111-1111-4111-8111-111111111111'
JOIN poke.items i ON i.name=v.item_name
ON CONFLICT(player_id,slot) DO UPDATE SET item_id=EXCLUDED.item_id;

-- ------------------------------------------------
-- 8) ALL TYPE MATCHUPS
--    Fill the matrix with neutral values, then apply standard key strengths.
-- ------------------------------------------------
INSERT INTO poke.type_effectiveness(attacking,defending,multiplier)
SELECT aa.attacking_type,dd.defending_type,1.00
FROM unnest(enum_range(NULL::poke.creature_type)) AS aa(attacking_type)
CROSS JOIN unnest(enum_range(NULL::poke.creature_type)) AS dd(defending_type)
ON CONFLICT(attacking,defending) DO NOTHING;

UPDATE poke.type_effectiveness SET multiplier=2.00
WHERE (attacking,defending) IN (
 ('fire','grass'),('fire','ice'),('fire','bug'),('fire','steel'),
 ('water','fire'),('water','ground'),('water','rock'),
 ('grass','water'),('grass','ground'),('grass','rock'),
 ('electric','water'),('electric','flying'),
 ('ice','grass'),('ice','ground'),('ice','flying'),('ice','dragon'),
 ('fighting','normal'),('fighting','ice'),('fighting','rock'),('fighting','dark'),('fighting','steel'),
 ('poison','grass'),('ground','fire'),('ground','electric'),('ground','poison'),('ground','rock'),('ground','steel'),
 ('flying','grass'),('flying','fighting'),('flying','bug'),
 ('psychic','fighting'),('psychic','poison'),
 ('bug','grass'),('bug','psychic'),('bug','dark'),
 ('rock','fire'),('rock','ice'),('rock','flying'),('rock','bug'),
 ('ghost','psychic'),('ghost','ghost'),
 ('dragon','dragon'),('dark','psychic'),('dark','ghost'),
 ('steel','ice'),('steel','rock'),('fairy','fighting'),('fairy','dragon'),('fairy','dark')
);

UPDATE poke.type_effectiveness SET multiplier=0.50
WHERE (attacking,defending) IN (
 ('fire','fire'),('fire','water'),('fire','rock'),('fire','dragon'),
 ('water','water'),('water','grass'),('water','dragon'),
 ('grass','fire'),('grass','grass'),('grass','poison'),('grass','flying'),('grass','bug'),('grass','dragon'),('grass','steel'),
 ('electric','electric'),('electric','grass'),('electric','dragon'),
 ('ice','fire'),('ice','water'),('ice','ice'),('ice','steel'),
 ('fighting','poison'),('fighting','flying'),('fighting','psychic'),('fighting','bug'),('fighting','fairy'),
 ('poison','poison'),('poison','ground'),('poison','rock'),('poison','ghost'),
 ('ground','grass'),('ground','bug'),
 ('flying','electric'),('flying','rock'),('flying','steel'),
 ('psychic','psychic'),('psychic','steel'),
 ('bug','fire'),('bug','fighting'),('bug','poison'),('bug','flying'),('bug','ghost'),('bug','steel'),('bug','fairy'),
 ('rock','fighting'),('rock','ground'),('rock','steel'),
 ('ghost','dark'),
 ('dragon','steel'),
 ('dark','fighting'),('dark','dark'),('dark','fairy'),
 ('steel','fire'),('steel','water'),('steel','electric'),('steel','steel'),
 ('fairy','fire'),('fairy','poison'),('fairy','steel')
);

UPDATE poke.type_effectiveness SET multiplier=0.00
WHERE (attacking,defending) IN (
 ('normal','ghost'),('electric','ground'),('fighting','ghost'),
 ('poison','steel'),('ground','flying'),('psychic','dark'),
 ('ghost','normal'),('dragon','fairy')
);

-- ------------------------------------------------
-- 9) NPC defeat progress, battle history, battle snapshots, catch history
-- ------------------------------------------------
INSERT INTO poke.player_npc_defeats(player_id,npc_id,times_defeated,last_defeated_at)
SELECT p.id,n.id,1,now()-interval '1 day'
FROM poke.players p
JOIN poke.npcs n ON n.name='Mira'
WHERE p.id='11111111-1111-4111-8111-111111111111'
ON CONFLICT(player_id,npc_id) DO NOTHING;

INSERT INTO poke.battles(id,player_id,kind,npc_id,status,turn_number,pos_x,pos_y,started_at,ended_at)
VALUES
 ('33333333-3333-4333-8333-333333333331',
  '11111111-1111-4111-8111-111111111111','wild',NULL,'won',3,20,75,now()-interval '2 days',now()-interval '2 days'+interval '2 minutes'),
 ('33333333-3333-4333-8333-333333333332',
  '11111111-1111-4111-8111-111111111111','npc',
  (SELECT id FROM poke.npcs WHERE name='Mira' LIMIT 1),
  'won',4,20,75,now()-interval '1 day',now()-interval '1 day'+interval '3 minutes')
ON CONFLICT(id) DO NOTHING;

INSERT INTO poke.battle_creatures
 (id,battle_id,side,party_position,creature_id,species_id,level,is_active,max_hp,current_hp,status,stat_stages,moves)
SELECT v.id::uuid,b.id,v.side,v.party_position,CASE WHEN v.side=1 THEN c.id ELSE NULL END,s.id,v.level,v.active,v.max_hp,v.hp,
       'none','{}'::jsonb,v.moves::jsonb
FROM (VALUES
 ('44444444-4444-4444-8444-444444444441','33333333-3333-4333-8333-333333333331',1,1,'Sproutle',5,20,18,true,'[{"move_id":1,"pp":32}]'),
 ('44444444-4444-4444-8444-444444444442','33333333-3333-4333-8333-333333333331',2,1,'Pebblit',3,15,0,true,'[{"move_id":1,"pp":35}]'),
 ('44444444-4444-4444-8444-444444444443','33333333-3333-4333-8333-333333333332',1,1,'Sproutle',5,20,15,true,'[{"move_id":1,"pp":30}]'),
 ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333332',2,1,'Sproutle',5,20,0,true,'[{"move_id":1,"pp":35}]')
) v(id,battle_id,side,party_position,species_name,level,max_hp,hp,active,moves)
JOIN poke.battles b ON b.id=v.battle_id::uuid
JOIN poke.species s ON s.name=v.species_name
LEFT JOIN poke.creatures c ON c.id='22222222-2222-4222-8222-222222222221'::uuid
ON CONFLICT(id) DO NOTHING;

INSERT INTO poke.catch_history
 (player_id,species_id,wild_level,outcome,miss_reason,balls_thrown,ball_item_id,creature_id,battle_id,pos_x,pos_y,created_at)
SELECT p.id,s.id,3,'caught',NULL,1,i.id,
       '22222222-2222-4222-8222-222222222222'::uuid,
       '33333333-3333-4333-8333-333333333331'::uuid,22,75,now()-interval '2 days'
FROM poke.players p
JOIN poke.species s ON s.name='Bubbloon'
JOIN poke.items i ON i.name='Basic Ball'
WHERE p.id='11111111-1111-4111-8111-111111111111'
AND NOT EXISTS (
 SELECT 1 FROM poke.catch_history h
 WHERE h.player_id=p.id AND h.species_id=s.id
   AND h.created_at > now()-interval '3 days'
);

-- ------------------------------------------------
-- 10) TYPE MATRIX CHECK + SEED SUMMARY
-- ------------------------------------------------
COMMIT;

SELECT 'map_tiles' AS table_name, COUNT(*) AS rows FROM poke.map_tiles
UNION ALL SELECT 'species', COUNT(*) FROM poke.species
UNION ALL SELECT 'moves', COUNT(*) FROM poke.moves
UNION ALL SELECT 'species_moves', COUNT(*) FROM poke.species_moves
UNION ALL SELECT 'items', COUNT(*) FROM poke.items
UNION ALL SELECT 'evolutions', COUNT(*) FROM poke.evolutions
UNION ALL SELECT 'type_effectiveness', COUNT(*) FROM poke.type_effectiveness
UNION ALL SELECT 'encounters', COUNT(*) FROM poke.encounters
UNION ALL SELECT 'npcs', COUNT(*) FROM poke.npcs
UNION ALL SELECT 'npc_party', COUNT(*) FROM poke.npc_party
UNION ALL SELECT 'npc_shop_items', COUNT(*) FROM poke.npc_shop_items
UNION ALL SELECT 'players', COUNT(*) FROM poke.players
UNION ALL SELECT 'player_npc_defeats', COUNT(*) FROM poke.player_npc_defeats
UNION ALL SELECT 'creatures', COUNT(*) FROM poke.creatures
UNION ALL SELECT 'creature_moves', COUNT(*) FROM poke.creature_moves
UNION ALL SELECT 'inventory', COUNT(*) FROM poke.inventory
UNION ALL SELECT 'hotbar_slots', COUNT(*) FROM poke.hotbar_slots
UNION ALL SELECT 'battles', COUNT(*) FROM poke.battles
UNION ALL SELECT 'battle_creatures', COUNT(*) FROM poke.battle_creatures
UNION ALL SELECT 'catch_history', COUNT(*) FROM poke.catch_history;

SELECT terrain, COUNT(*) AS tile_count
FROM poke.map_tiles
GROUP BY terrain
ORDER BY terrain;
