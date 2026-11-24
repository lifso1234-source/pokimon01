SET search_path TO poke, public;

BEGIN;

-- =====================================================================
-- 1. INSERT ALL 77 NPCs AT EXACT WALKABLE COORDINATES FROM world_map_500x300.sql
-- =====================================================================
WITH npc_seed(name, role, pos_x, pos_y, facing, sight_range, dialogue, reward_money, can_rebattle) AS (
    VALUES
    -- Snow & mountains
    ('Frost Outpost Keeper', 'healer',     22,  48, 'down',  0, '{"greeting": "Warm yourself by the fire! Let me heal your team."}', 0, false),
    ('Lodge Innkeeper',      'healer',     149, 34, 'down',  0, '{"greeting": "Welcome to Frost Lodge. Rest up before climbing the peaks."}', 0, false),
    ('Rock Climber',         'trainer',    36,  100,'right', 4, '{"intro": "These cliffs test every muscle!", "win": "You scaled right past me!"}', 600, true),
    ('Avalanche Scout',      'trainer',    120, 60, 'down',  5, '{"intro": "Watch out for falling snow!", "win": "A blizzard of skill!"}', 850, true),
    ('Snow Wanderer',        'trainer',    45,  25, 'right', 4, '{"intro": "Few trainers brave the far northwest!", "win": "You have the heart of a glacier."}', 900, true),
    ('Blizzard Trainer',     'trainer',    250, 30, 'down',  5, '{"intro": "Can your team handle sub-zero temperatures?", "win": "Frozen in awe!"}', 1100, true),
    ('Peak Watcher',         'trainer',    330, 60, 'left',  4, '{"intro": "From up here I see everything!", "win": "I did not see that defeat coming."}', 1050, true),
    ('Snow Ranger',          'trainer',    395, 35, 'left',  5, '{"intro": "I patrol the eastern snowfields.", "win": "You are cleared to pass!"}', 1150, true),
    ('Mountain Guide',       'generic',    200, 70, 'down',  0, '{"greeting": "Keep to the trails unless you are prepared for wild Rock types."}', 0, false),
    ('Rock Collector',       'trainer',    240, 75, 'down',  3, '{"intro": "Look at these rare stones I found!", "win": "My rocks got crushed!"}', 750, true),
    ('River Guide',          'generic',    280, 95, 'left',  0, '{"greeting": "All five great rivers begin in these northern peaks."}', 0, false),
    ('Cave Guard',           'generic',    289, 76, 'down',  0, '{"greeting": "Frostpeak Cavern lies just north. Bring Ice or Fighting moves!"}', 0, false),
    ('Cave Hermit',          'trainer',    291, 64, 'down',  3, '{"intro": "You disturbed my meditation in the dark!", "win": "Your spirit shines bright."}', 1400, true),
    ('Highridge Keeper',     'shopkeeper', 380, 62, 'down',  0, '{"greeting": "Stock up on supplies before heading down the mountain!"}', 0, false),

    -- City (Crossroads)
    ('Nurse Joy',            'healer',     260, 134,'down',  0, '{"greeting": "Welcome to the Crossroads Healing Center! Your team is fully restored."}', 0, false),
    ('Gym Leader',           'trainer',    260, 150,'up',    4, '{"intro": "I am the Crossroads Gym Leader! Show me your resolve!", "win": "Remarkable! You have proven yourself a true master."}', 5000, true),
    ('Town Elder',           'generic',    260, 142,'down',  0, '{"greeting": "Crossroads connects all four corners of the realm."}', 0, false),
    ('North Gate Guard',     'generic',    260, 120,'up',    0, '{"greeting": "The northern road leads into the treacherous Frostpeak mountains."}', 0, false),
    ('South Gate Guard',     'generic',    260, 164,'down',  0, '{"greeting": "South lies Wheatfield and the Great Inland Lake."}', 0, false),
    ('Merchant',             'shopkeeper', 244, 142,'right', 0, '{"greeting": "Welcome to the Crossroads General Store!"}', 0, false),
    ('Collector',            'shopkeeper', 276, 142,'left',  0, '{"greeting": "Looking for rare evolutionary stones and TMs?"}', 0, false),
    ('Street Musician',      'generic',    250, 127,'down',  0, '{"greeting": "♪ Traveling down the cobblestone ring road... ♪"}', 0, false),

    -- Northern & central plains
    ('Snowmelt Mayor',       'generic',    205, 108,'down',  0, '{"greeting": "Welcome to Snowmelt! Our wells are fed by pure mountain runoff."}', 0, false),
    ('Elmwatch Elder',       'generic',    155, 125,'down',  0, '{"greeting": "Elmwatch has stood beside the western woods for generations."}', 0, false),
    ('Forest Ranger',        'trainer',    160, 95, 'down',  4, '{"intro": "Halt! Let me check if your team is strong enough for the north trail.", "win": "You are more than ready!"}', 700, true),
    ('Bug Catcher',          'trainer',    215, 125,'left',  4, '{"intro": "Check out the rare bugs I caught!", "win": "Aw, my bugs got squashed!"}', 320, true),
    ('Traveler',             'generic',    210, 143,'up',    0, '{"greeting": "Crossroads is just east down this highway."}', 0, false),
    ('Angler',               'trainer',    205, 162,'up',    3, '{"intro": "Do not scare the fish! Battle me instead!", "win": "You hooked a clean victory!"}', 550, true),
    ('Ranger',               'trainer',    300, 150,'left',  4, '{"intro": "Nature thrives when trainers respect it!", "win": "You fight in harmony with your team."}', 800, true),
    ('Pond Fisherman',       'trainer',    318, 158,'up',    3, '{"intro": "Nothing beats pond fishing—except battling!", "win": "Back to the rod for me."}', 550, true),

    -- West
    ('Riverbend Mayor',      'generic',    75,  131,'down',  0, '{"greeting": "Riverbend sits between the forest and the western peaks."}', 0, false),
    ('Herb Gatherer',        'shopkeeper', 66,  108,'right', 0, '{"greeting": "Fresh medicinal herbs and potions gathered right from the woods!"}', 0, false),
    ('Burrow Hermit',        'trainer',    26,  121,'right', 3, '{"intro": "How did you find Westwatch Burrow?!", "win": "Keep this cave a secret!"}', 1300, true),
    ('Forest Ranger West',   'trainer',    56,  160,'right', 5, '{"intro": "The western forest is thick—stay sharp!", "win": "You know your way around the woods."}', 720, true),
    ('Berry Picker',         'generic',    30,  175,'right', 0, '{"greeting": "The trees here bear sweet berries all year round."}', 0, false),
    ('Hiker',                'trainer',    92,  170,'up',    4, '{"intro": "Walking from Bayview to Riverbend builds stamina!", "win": "I need a breather!"}', 640, true),
    ('Bridge Keeper',        'generic',    97,  136,'down',  0, '{"greeting": "Safe travels across the river bridge!"}', 0, false),
    ('Hedgeford Mayor',      'generic',    130, 150,'down',  0, '{"greeting": "Hedgeford is the gateway between Crossroads and the western forest."}', 0, false),
    ('Shell Collector',      'generic',    12,  200,'right', 0, '{"greeting": "The western shore washes up all sorts of treasures."}', 0, false),

    -- South-west bay
    ('Harbor Master',        'shopkeeper', 122, 192,'down',  0, '{"greeting": "Bayview Harbor! Grab Poke Balls and supplies before setting sail."}', 0, false),
    ('Pier Fisherman',       'trainer',    118, 224,'down',  3, '{"intro": "I just reeled in a feisty catch!", "win": "You reeled me right in!"}', 620, true),
    ('Beachcomber',          'generic',    95,  208,'down',  0, '{"greeting": "Follow the sandy coast west to reach Driftwood."}', 0, false),
    ('Driftwood Mayor',      'generic',    35,  215,'down',  0, '{"greeting": "Life moves slow and peaceful here in Driftwood."}', 0, false),
    ('Driftwood Fisherman',  'trainer',    35,  238,'down',  3, '{"intro": "The deep bay waters hide strong creatures!", "win": "What a splash!"}', 680, true),
    ('Swimmer',              'trainer',    62,  216,'down',  4, '{"intro": "The bay water is warm today! Let us battle!", "win": "I am all washed up!"}', 580, true),
    ('Surf Instructor',      'trainer',    148, 224,'left',  4, '{"intro": "Ride the wave of battle!", "win": "Total wipeout!"}', 760, true),
    ('Picnicker',            'trainer',    160, 208,'down',  4, '{"intro": "Want to battle before lunch?", "win": "Now I really worked up an appetite!"}', 500, true),

    -- South & farms
    ('Farmer West',          'generic',    200, 186,'down',  0, '{"greeting": "Golden wheat as far as the eye can see!"}', 0, false),
    ('Wheatfield Mayor',     'healer',     245, 190,'down',  0, '{"greeting": "Rest your weary feet in Wheatfield. I will patch up your team."}', 0, false),
    ('Farmer East',          'generic',    284, 185,'down',  0, '{"greeting": "Watch out for wild creatures hiding in the tall wheat!"}', 0, false),
    ('Farm Hand',            'trainer',    270, 180,'left',  3, '{"intro": "Chores are done—time for a quick match!", "win": "Back to tending the fields!"}', 480, true),
    ('Camper',               'trainer',    160, 214,'right', 4, '{"intro": "Camping near the coast is the best!", "win": "My tent is not the only thing folding!"}', 520, true),
    ('Shore Beachcomber',    'generic',    272, 246,'down',  0, '{"greeting": "The southern pier juts right out into deep water."}', 0, false),
    ('Shore Fisherman',      'trainer',    272, 258,'down',  3, '{"intro": "Only serious anglers come to the end of the south pier!", "win": "You out-fished me!"}', 820, true),
    ('Lighthouse Keeper',    'generic',    290, 236,'down',  0, '{"greeting": "My beacon guides ships away from the delta sandbars."}', 0, false),

    -- East & south-east
    ('Cave Researcher',      'trainer',    353, 123,'left',  3, '{"intro": "Emberstone Hollow radiates intense geothermal energy!", "win": "Fascinating battle data!"}', 1350, true),
    ('Cave Mouth Miner',     'generic',    348, 123,'left',  0, '{"greeting": "Watch your step entering Emberstone Hollow."}', 0, false),
    ('Mine Foreman',         'generic',    329, 207,'up',    0, '{"greeting": "South Mine is rich in iron and evolution stones."}', 0, false),
    ('Miner',                'trainer',    329, 212,'up',    3, '{"intro": "Let us test our strength underground!", "win": "You hit harder than my pickaxe!"}', 950, true),
    ('Pine Hollow Mayor',    'generic',    365, 165,'down',  0, '{"greeting": "Pine Hollow sits right by the eastern sea pier."}', 0, false),
    ('Pier Fisherman East',  'trainer',    404, 165,'right', 3, '{"intro": "The eastern currents bring rare sea creatures!", "win": "What a catch!"}', 880, true),
    ('Causeway Guard',       'generic',    390, 130,'left',  0, '{"greeting": "This stone causeway leads to the Island Fortress. Only the strongest survive."}', 0, false),
    ('Fortress Gate Guard',  'trainer',    427, 130,'left',  4, '{"intro": "None pass the Fortress outer gate without proving their might!", "win": "You may enter the maze..."}', 1800, true),
    ('Fortress Lord',        'trainer',    448, 134,'down',  4, '{"intro": "You navigated my nested walls. Now face the Lord of the Island Fortress!", "win": "Unbelievable! You reign supreme over the eastern seas!"}', 10000, true),
    ('Island Hermit',        'generic',    448, 106,'down',  0, '{"greeting": "The Fortress Lord has never been bested... until perhaps today."}', 0, false),
    ('NE Island Castaway',   'trainer',    478, 26, 'down',  4, '{"intro": "A visitor on my secret northern isle?! Let us battle!", "win": "You truly explored every corner of the map!"}', 2500, true),
    ('SE Island Castaway',   'trainer',    484, 198,'left',  4, '{"intro": "You crossed the delta sandbars to reach me!", "win": "A legendary effort!"}', 2500, true),

    -- Snow towns
    ('Glacier Hollow Mayor', 'generic',    80,  30, 'down',  0, '{"greeting": "Glacier Hollow endures the fiercest northern winds."}', 0, false),
    ('Northwind Mayor',      'healer',     200, 26, 'down',  0, '{"greeting": "Let us warm and heal your team here in Northwind."}', 0, false),
    ('Frostpeak Mayor',      'generic',    300, 24, 'down',  0, '{"greeting": "Frostpeak Village sits at the roof of the world."}', 0, false),
    ('Whiteout Mayor',       'generic',    390, 24, 'down',  0, '{"greeting": "Whiteout is the easternmost settlement in the snow range."}', 0, false),
    ('Sled Courier',         'trainer',    105, 29, 'left',  4, '{"intro": "Delivering mail across the snow roads keeps my team fast!", "win": "You outpaced my sled team!"}', 920, true),
    ('Yeti Hunter',          'trainer',    250, 25, 'down',  4, '{"intro": "I have been tracking a legendary Ice bird in these peaks!", "win": "Your team is stronger than any legend!"}', 1250, true),
    ('Skier',                'trainer',    340, 24, 'down',  4, '{"intro": "Watch my slalom technique!", "win": "I wiped out on that turn!"}', 980, true),

    -- Big lake + fishing island
    ('Lake Hermit',          'healer',     208, 231,'down',  0, '{"greeting": "Welcome to Fishing Island! Let me heal your team before you cast your line."}', 0, false),
    ('Dock Fisherman',       'trainer',    226, 231,'right', 3, '{"intro": "Deep lake waters hold giants!", "win": "You tamed the deep!"}', 900, true),
    ('Lakeshore Camper',     'trainer',    170, 205,'down',  4, '{"intro": "The view of the lake island is unbeatable!", "win": "And so is your team!"}', 650, true)
),
inserted_npcs AS (
    INSERT INTO poke.npcs (name, role, pos_x, pos_y, facing, sight_range, dialogue, reward_money, can_rebattle)
    SELECT name, role::poke.npc_role, pos_x, pos_y, facing, sight_range, dialogue::jsonb, reward_money, can_rebattle
    FROM npc_seed
    RETURNING id, name
),
-- =====================================================================
-- 2. ASSIGN PARTIES TO ALL TRAINER NPCs (1 to 6 creatures each)
-- =====================================================================
party_seed(npc_name, slot, sp_name, lvl) AS (
    VALUES
    -- Snow & Mountain Trainers
    ('Rock Climber',      1, 'Geodude',    18), ('Rock Climber',      2, 'Machop',     19),
    ('Avalanche Scout',   1, 'Swinub',     22), ('Avalanche Scout',   2, 'Seel',       23),
    ('Snow Wanderer',     1, 'Swinub',     24), ('Snow Wanderer',     2, 'Vulpix',     24), ('Snow Wanderer',     3, 'Dewgong',    26),
    ('Blizzard Trainer',  1, 'Seel',       28), ('Blizzard Trainer',  2, 'Swinub',     29), ('Blizzard Trainer',  3, 'Lapras',     31),
    ('Peak Watcher',      1, 'Pidgeot',    28), ('Peak Watcher',      2, 'Onix',       29),
    ('Snow Ranger',       1, 'Dewgong',    30), ('Snow Ranger',       2, 'Ninetales',  31), ('Snow Ranger',       3, 'Lapras',     32),
    ('Rock Collector',    1, 'Geodude',    20), ('Rock Collector',    2, 'Geodude',    21), ('Rock Collector',    3, 'Onix',       23),
    ('Cave Hermit',       1, 'Golbat',     32), ('Cave Hermit',       2, 'Golem',      34), ('Cave Hermit',       3, 'Gengar',     35),

    -- Crossroads Gym Leader (Full 5-creature Boss Team)
    ('Gym Leader',        1, 'Pidgeot',    36),
    ('Gym Leader',        2, 'Alakazam',   38),
    ('Gym Leader',        3, 'Arcanine',   39),
    ('Gym Leader',        4, 'Gyarados',   40),
    ('Gym Leader',        5, 'Dragonite',  42),

    -- Northern & Central Plains Trainers
    ('Forest Ranger',     1, 'Bulbasaur',  16), ('Forest Ranger',     2, 'Pidgey',     17),
    ('Bug Catcher',       1, 'Caterpie',   10), ('Bug Catcher',       2, 'Butterfree', 13),
    ('Angler',            1, 'Magikarp',   14), ('Angler',            2, 'Krabby',     16),
    ('Ranger',            1, 'Ivysaur',    22), ('Ranger',            2, 'Pidgeot',    23), ('Ranger',            3, 'Growlithe',  23),
    ('Pond Fisherman',    1, 'Seel',       18), ('Pond Fisherman',    2, 'Krabby',     19),

    -- West Trainers
    ('Burrow Hermit',     1, 'Sandslash',  30), ('Burrow Hermit',     2, 'Golbat',     31), ('Burrow Hermit',     3, 'Onix',       32),
    ('Forest Ranger West',1, 'Butterfree', 19), ('Forest Ranger West',2, 'Pikachu',    20), ('Forest Ranger West',3, 'Ivysaur',    21),
    ('Hiker',             1, 'Geodude',    17), ('Hiker',             2, 'Machop',     18),

    -- South-West Bay Trainers
    ('Pier Fisherman',    1, 'Krabby',     18), ('Pier Fisherman',    2, 'Wartortle',  20),
    ('Driftwood Fisherman',1,'Seel',       20), ('Driftwood Fisherman',2,'Gyarados',   22),
    ('Swimmer',           1, 'Squirtle',   16), ('Swimmer',           2, 'Seel',       17),
    ('Surf Instructor',   1, 'Wartortle',  22), ('Surf Instructor',   2, 'Vaporeon',   24),
    ('Picnicker',         1, 'Clefairy',   16), ('Picnicker',         2, 'Eevee',      17),

    -- South & Farm Trainers
    ('Farm Hand',         1, 'Rattata',    15), ('Farm Hand',         2, 'Growlithe',  16),
    ('Camper',            1, 'Sandshrew',  16), ('Camper',            2, 'Charmander', 17),
    ('Shore Fisherman',   1, 'Krabby',     23), ('Shore Fisherman',   2, 'Lapras',     25),

    -- East & South-East Trainers
    ('Cave Researcher',   1, 'Charmeleon', 30), ('Cave Researcher',   2, 'Golem',      32), ('Cave Researcher',   3, 'Arcanine',   33),
    ('Miner',             1, 'Geodude',    24), ('Miner',             2, 'Onix',       26),
    ('Pier Fisherman East',1,'Gyarados',   25), ('Pier Fisherman East',2,'Dewgong',    26),
    ('Fortress Gate Guard',1,'Machamp',    38), ('Fortress Gate Guard',2,'Golem',      39), ('Fortress Gate Guard',3,'Lucario',    40),

    -- Fortress Lord (Endgame 6-creature Boss Team)
    ('Fortress Lord',     1, 'Gengar',     46),
    ('Fortress Lord',     2, 'Alakazam',   47),
    ('Fortress Lord',     3, 'Machamp',    48),
    ('Fortress Lord',     4, 'Gyarados',   49),
    ('Fortress Lord',     5, 'Charizard',  50),
    ('Fortress Lord',     6, 'Dragonite',  52),

    -- Hidden Island Castaways
    ('NE Island Castaway',1, 'Articuno',   45), ('NE Island Castaway',2, 'Lapras',     44), ('NE Island Castaway',3, 'Blastoise',  45),
    ('SE Island Castaway',1, 'Moltres',    45), ('SE Island Castaway',2, 'Dragonite',  45), ('SE Island Castaway',3, 'Venusaur',   45),

    -- Snow Town Trainers
    ('Sled Courier',      1, 'Swinub',     25), ('Sled Courier',      2, 'Jolteon',    27),
    ('Yeti Hunter',       1, 'Dewgong',    32), ('Yeti Hunter',       2, 'Machamp',    34), ('Yeti Hunter',       3, 'Snorlax',    35),
    ('Skier',             1, 'Seel',       26), ('Skier',             2, 'Dewgong',    28),

    -- Big Lake Trainers
    ('Dock Fisherman',    1, 'Gyarados',   26), ('Dock Fisherman',    2, 'Lapras',     28),
    ('Lakeshore Camper',  1, 'Pikachu',    19), ('Lakeshore Camper',  2, 'Ivysaur',    20)
)
INSERT INTO poke.npc_party (npc_id, slot, species_id, level)
SELECT n.id, ps.slot, s.id, ps.lvl
FROM party_seed ps
JOIN inserted_npcs n ON n.name = ps.npc_name
JOIN poke.species s ON s.name = ps.sp_name;

-- =====================================================================
-- 3. ASSIGN SHOP INVENTORIES TO ALL SHOPKEEPER NPCs
-- =====================================================================
WITH shop_seed(npc_name, item_name, price) AS (
    VALUES
    -- Crossroads General Merchant
    ('Merchant',         'Poke Ball',       200),
    ('Merchant',         'Great Ball',      600),
    ('Merchant',         'Ultra Ball',      1200),
    ('Merchant',         'Potion',          300),
    ('Merchant',         'Super Potion',    700),
    ('Merchant',         'Hyper Potion',    1200),
    ('Merchant',         'Full Restore',    3000),
    ('Merchant',         'Antidote',        100),
    ('Merchant',         'Paralyze Heal',   200),
    -- Crossroads Specialty Collector
    ('Collector',        'Fire Stone',      2100),
    ('Collector',        'Water Stone',     2100),
    ('Collector',        'Thunder Stone',   2100),
    ('Collector',        'TM24 Thunderbolt',5000),
    ('Collector',        'TM26 Earthquake', 5000),
    -- Highridge Mountain Shopkeeper
    ('Highridge Keeper', 'Great Ball',      600),
    ('Highridge Keeper', 'Ultra Ball',      1200),
    ('Highridge Keeper', 'Super Potion',    700),
    ('Highridge Keeper', 'Hyper Potion',    1200),
    -- West Forest Herb Gatherer
    ('Herb Gatherer',    'Potion',          250),
    ('Herb Gatherer',    'Super Potion',    650),
    ('Herb Gatherer',    'Antidote',        90),
    ('Herb Gatherer',    'Paralyze Heal',   180),
    -- Bayview Harbor Master
    ('Harbor Master',    'Poke Ball',       200),
    ('Harbor Master',    'Great Ball',      600),
    ('Harbor Master',    'Super Potion',    700),
    ('Harbor Master',    'Water Stone',     2100)
)
INSERT INTO poke.npc_shop_items (npc_id, item_id, price)
SELECT n.id, i.id, ss.price
FROM shop_seed ss
JOIN poke.npcs n ON n.name = ss.npc_name
JOIN poke.items i ON i.name = ss.item_name;

COMMIT;