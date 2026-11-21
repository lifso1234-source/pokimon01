-- =====================================================================
-- FINALIZED MAP TILES & NPC LOCATIONS DML (49,000 Tiles: 280 x 175 Grid)
-- Matches Approved 4-Region Fantasy Map & 50,000 Tile API Fetch Limit
-- =====================================================================

SET search_path TO poke, public;

-- Ensure all custom terrain enum values exist
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'tree';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'snow';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'wheat';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'mountain';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'deep water';

BEGIN;

-- =====================================================================
-- 1. GENERATE 280 x 175 MAP TILES (49,000 Total Tiles)
-- =====================================================================
DO $$
DECLARE
    x_val int;
    y_val int;
    t poke.terrain;
    walk boolean;
    dist_island float;
    dist_pond float;
    river_x float;
BEGIN
    FOR x_val IN 0..279 LOOP
        FOR y_val IN 0..174 LOOP
            -- Default base terrain: grass
            t := 'grass';
            walk := true;

            -- 1. Outer Map Border Walls (2 tiles thick)
            IF x_val <= 1 OR x_val >= 278 OR y_val <= 1 OR y_val >= 173 THEN
                t := 'wall';
                walk := false;

            -- 2. Bottom-Left: Large Deep Water Lake, Beach, Central Island & Full Bridge Path
            -- Region: x in 2..120, y in 95..172
            ELSIF x_val BETWEEN 2 AND 120 AND y_val BETWEEN 95 AND 172 THEN
                dist_island := sqrt(power((x_val - 78.0) / 18.0, 2) + power((y_val - 138.0) / 14.0, 2));
                -- Central Island (Sand outer ring + Grass/Camp inner core)
                IF dist_island <= 0.72 THEN
                    t := 'grass';
                    walk := true;
                ELSIF dist_island <= 1.0 THEN
                    t := 'sand';
                    walk := true;
                -- Wooden Bridge Path connecting Mainland Village South Gate (x=48, y=95) directly onto the Island (x=62, y=138)
                ELSIF (x_val BETWEEN 46 AND 50 AND y_val BETWEEN 95 AND 138)
                   OR (y_val BETWEEN 136 AND 140 AND x_val BETWEEN 46 AND 64) THEN
                    t := 'path';
                    walk := true;
                -- Northern & Eastern Sandy Shoreline of the Lake
                ELSIF (y_val BETWEEN 95 AND 103 AND x_val BETWEEN 15 AND 112)
                   OR (x_val BETWEEN 112 AND 120 AND y_val BETWEEN 95 AND 155) THEN
                    t := 'sand';
                    walk := true;
                ELSE
                    t := 'deep water';
                    walk := false;
                END IF;

            -- 3. Central Cliff Wall & Winding River Separating Upper & Lower Regions
            ELSIF y_val BETWEEN 86 AND 94 AND x_val BETWEEN 2 AND 277 THEN
                -- Main Southbound Bridge Path from Village/Farm to Lake Beach (x: 46..50)
                IF x_val BETWEEN 46 AND 50 THEN
                    t := 'path';
                    walk := true;
                -- Main Bridge Crossing into Bottom-Right Snow & Mountain Region (x: 146..152)
                ELSIF x_val BETWEEN 146 AND 152 THEN
                    t := 'path';
                    walk := true;
                -- Central Cliff Wall (x: 95..145)
                ELSIF x_val BETWEEN 95 AND 145 THEN
                    t := 'wall';
                    walk := false;
                -- River flowing from East edge (x=277) westward to x=153
                ELSIF x_val >= 153 AND y_val BETWEEN 88 AND 93 THEN
                    t := 'deep water';
                    walk := false;
                ELSE
                    t := 'grass';
                    walk := true;
                END IF;

            -- 4. Bottom-Right: Accessible Snow Biome & Walkable Mountain Peaks (x >= 121, y >= 95)
            ELSIF x_val >= 121 AND y_val >= 95 THEN
                -- Lower River Channel splitting snow peninsula and southern bridge (y: 148..154)
                IF y_val BETWEEN 148 AND 154 AND x_val BETWEEN 121 AND 235 THEN
                    -- Wooden bridge over lower river channel (x: 146..152)
                    IF x_val BETWEEN 146 AND 152 THEN
                        t := 'path';
                        walk := true;
                    ELSE
                        t := 'deep water';
                        walk := false;
                    END IF;
                -- Accessible Mountain Peaks (Walkable = true so player can climb and explore!)
                ELSIF sqrt(power((x_val - 210.0) / 38.0, 2) + power((y_val - 122.0) / 18.0, 2)) <= 1.0 THEN
                    -- Winding mountain trail path up to the summit
                    IF abs((x_val - 172) - (132 - y_val) * 2) <= 2 AND x_val BETWEEN 172 AND 215 THEN
                        t := 'path';
                        walk := true;
                    ELSE
                        t := 'mountain';
                        walk := true;
                    END IF;
                -- Main Snow Trail connecting Bridge (149, 95) to Mountain Base & Southern Bridge
                ELSIF (x_val BETWEEN 146 AND 152 AND y_val BETWEEN 95 AND 147)
                   OR (y_val BETWEEN 126 AND 129 AND x_val BETWEEN 149 AND 185) THEN
                    t := 'path';
                    walk := true;
                -- Sparse snow pines along outer edges
                ELSIF ((x_val * 17 + y_val * 31) % 37 = 0) AND x_val > 245 THEN
                    t := 'tree';
                    walk := false;
                ELSE
                    t := 'snow';
                    walk := true;
                END IF;

            -- 5. Top-Left: Starter Village, Wheat Farm & Small Fishing Lake (x: 2..145, y: 2..85)
            ELSIF x_val BETWEEN 2 AND 145 AND y_val BETWEEN 2 AND 85 THEN
                dist_pond := sqrt(power((x_val - 92.0) / 18.0, 2) + power((y_val - 18.0) / 10.0, 2));
                -- Small Fishing Pond (x ~ 92, y ~ 18)
                IF dist_pond <= 1.0 THEN
                    -- Wooden Fishing Dock extending onto the pond
                    IF y_val BETWEEN 18 AND 20 AND x_val BETWEEN 74 AND 84 THEN
                        t := 'path';
                        walk := true;
                    ELSE
                        t := 'water';
                        walk := false;
                    END IF;
                -- Wheat Farm Patches (Next to Village & Pond: x: 78..126, y: 34..66)
                ELSIF (x_val BETWEEN 78 AND 126 AND y_val BETWEEN 34 AND 46)
                   OR (x_val BETWEEN 78 AND 126 AND y_val BETWEEN 52 AND 66) THEN
                    t := 'wheat';
                    walk := true;
                -- Village Buildings (Houses & Windmill)
                ELSIF (x_val BETWEEN 18 AND 28 AND y_val BETWEEN 18 AND 26)   -- House 1
                   OR (x_val BETWEEN 36 AND 46 AND y_val BETWEEN 14 AND 22)   -- House 2
                   OR (x_val BETWEEN 54 AND 64 AND y_val BETWEEN 18 AND 26)   -- House 3
                   OR (x_val BETWEEN 18 AND 28 AND y_val BETWEEN 46 AND 54)   -- House 4
                   OR (x_val BETWEEN 36 AND 46 AND y_val BETWEEN 52 AND 60)   -- House 5
                   OR (x_val BETWEEN 58 AND 68 AND y_val BETWEEN 46 AND 54)   -- Village Shop
                   OR (x_val BETWEEN 116 AND 124 AND y_val BETWEEN 42 AND 50) -- Farm Windmill
                THEN
                    t := 'building';
                    walk := true;
                -- Village Cobblestone / Dirt Roads & Main East-West Highway
                ELSIF (x_val BETWEEN 46 AND 50 AND y_val BETWEEN 22 AND 85)   -- North-South Village Main Street
                   OR (y_val BETWEEN 36 AND 39 AND x_val BETWEEN 22 AND 77)   -- Village Cross Street
                   OR (y_val BETWEEN 48 AND 50 AND x_val BETWEEN 48 AND 145)  -- Farm Road to East Crossroads
                   OR (x_val BETWEEN 64 AND 75 AND y_val BETWEEN 20 AND 37)   -- Path to Fishing Pond Dock
                   OR (x_val BETWEEN 143 AND 146 AND y_val BETWEEN 48 AND 85) -- Road South to Snow Bridge
                THEN
                    t := 'path';
                    walk := true;
                -- Light Border Trees framing the Top-Left Corner (much fewer trees!)
                ELSIF (x_val <= 10 OR y_val <= 7) AND ((x_val * 13 + y_val * 19) % 7 = 0) THEN
                    t := 'tree';
                    walk := false;
                END IF;

            -- 6. Top-Right: Dense Forest with Winding Trails & Central Cabin (x: 146..277, y: 2..85)
            ELSIF x_val BETWEEN 146 AND 277 AND y_val BETWEEN 2 AND 85 THEN
                -- Central Forest Cabin (x: 212..224, y: 34..44)
                IF x_val BETWEEN 212 AND 224 AND y_val BETWEEN 34 AND 44 THEN
                    t := 'building';
                    walk := true;
                -- Clearing around the Cabin
                ELSIF sqrt(power((x_val - 218.0) / 16.0, 2) + power((y_val - 40.0) / 12.0, 2)) <= 1.0 THEN
                    t := 'grass';
                    walk := true;
                -- Winding Forest Paths connecting West Entrance, Cabin, and South River Bridge
                ELSIF (y_val BETWEEN 48 AND 50 AND x_val BETWEEN 146 AND 185)
                   OR (x_val BETWEEN 183 AND 186 AND y_val BETWEEN 24 AND 72)
                   OR (y_val BETWEEN 24 AND 26 AND x_val BETWEEN 184 AND 218)
                   OR (x_val BETWEEN 217 AND 219 AND y_val BETWEEN 25 AND 34)
                   OR (y_val BETWEEN 70 AND 72 AND x_val BETWEEN 149 AND 245) THEN
                    t := 'path';
                    walk := true;
                -- Dense Forest Trees (clustered outside the paths & cabin clearing)
                ELSIF ((x_val * 7 + y_val * 13) % 3 = 0) AND ((x_val + y_val) % 2 = 0) THEN
                    t := 'tree';
                    walk := false;
                END IF;
            END IF;

            -- Insert tile into poke.map_tiles
            INSERT INTO poke.map_tiles (x, y, terrain, is_walkable)
            VALUES (x_val, y_val, t, walk)
            ON CONFLICT (x, y) DO UPDATE
            SET terrain = EXCLUDED.terrain,
                is_walkable = EXCLUDED.is_walkable;
        END LOOP;
    END LOOP;
END $$;


-- =====================================================================
-- 2. NPC LOCATIONS (Scattered Across Village, Farm, Pond, Island,
--    Dense Forest Cabin, and Accessible Snow Mountains)
-- =====================================================================

INSERT INTO poke.npcs (id, name, role, sprite_url, pos_x, pos_y, facing, sight_range, dialogue, reward_money, can_rebattle)
OVERRIDING SYSTEM VALUE VALUES
-- [TOP-LEFT: STARTER VILLAGE]
(1, 'Nurse Joy', 'healer', 'https://example.com/npcs/nurse_joy.png', 32, 37, 'down', 0,
 '{"welcome": "Welcome to Oakvale Village! Let me heal your team.", "healed": "Your party is refreshed and ready to explore!"}'::jsonb, 0, false),

(2, 'Merchant Ben', 'shopkeeper', 'https://example.com/npcs/merchant_ben.png', 63, 55, 'down', 0,
 '{"greeting": "Stock up on Poke Balls and Potions before heading to the mountains!"}'::jsonb, 0, false),

(3, 'Mayor Alden', 'generic', 'https://example.com/npcs/mayor_alden.png', 48, 30, 'down', 0,
 '{"chat": "North-east lies the Deep Woods cabin, and south-east are the snowy peaks!"}'::jsonb, 0, false),

-- [TOP-LEFT: WHEAT FARM & FISHING POND]
(4, 'Farmer Miller', 'generic', 'https://example.com/npcs/farmer_miller.png', 102, 49, 'left', 0,
 '{"chat": "Our windmill grinds golden wheat all day. Watch out for wild Grass creatures in the crops!"}'::jsonb, 0, false),

(5, 'Angler Finn', 'trainer', 'https://example.com/npcs/angler_finn.png', 83, 19, 'right', 2,
 '{"intro": "Shh! You are scaring the fish—let us settle this with a battle!", "defeat": "Hook, line, and sinker! You beat me."}'::jsonb, 250, true),

-- [BOTTOM-LEFT: LARGE LAKE & ISLAND]
(6, 'Beachcomber Sara', 'generic', 'https://example.com/npcs/sara.png', 54, 98, 'down', 0,
 '{"chat": "The long wooden bridge leads straight across the lake to Castaway Island."}'::jsonb, 0, false),

(7, 'Island Chief Kaito', 'trainer', 'https://example.com/npcs/chief_kaito.png', 78, 138, 'left', 4,
 '{"intro": "You crossed the great lake bridge to reach my island camp! Show me your strength!", "defeat": "Magnificent! You have conquered Castaway Island."}'::jsonb, 750, true),

-- [TOP-RIGHT: DENSE FOREST & CENTRAL CABIN]
(8, 'Ranger Elena', 'trainer', 'https://example.com/npcs/ranger_elena.png', 184, 49, 'left', 4,
 '{"intro": "These dense woods are easy to get lost in. Are you prepared?", "defeat": "You know your way around the forest! Keep heading east to reach the cabin."}'::jsonb, 500, true),

(9, 'Woodsman Thorne', 'healer', 'https://example.com/npcs/thorne.png', 218, 45, 'down', 0,
 '{"welcome": "Welcome to my forest cabin! Rest by the fireplace and heal your creatures."}'::jsonb, 0, false),

(10, 'Bug Catcher Leo', 'trainer', 'https://example.com/npcs/leo.png', 202, 71, 'up', 3,
 '{"intro": "The rarest forest creatures hide deep under these canopies!", "defeat": "Whoa, your team is tough!"}'::jsonb, 400, true),

-- [BOTTOM-RIGHT: ACCESSIBLE SNOW & MOUNTAINS]
(11, 'Bridge Guard Nadia', 'trainer', 'https://example.com/npcs/nadia.png', 149, 102, 'up', 4,
 '{"intro": "Beyond this bridge lie the freezing snowfields and jagged peaks!", "defeat": "You are ready for the mountain climb. Stay warm!"}'::jsonb, 850, true),

(12, 'Summit Master Ryu', 'trainer', 'https://example.com/npcs/master_ryu.png', 210, 122, 'down', 5,
 '{"intro": "Few trainers reach the highest snow peak! Face the guardian of the summit!", "defeat": "Incredible! You stand victorious atop the mountain!"}'::jsonb, 1500, true),

(13, 'Hiker Boris', 'shopkeeper', 'https://example.com/npcs/hiker_boris.png', 156, 128, 'right', 0,
 '{"greeting": "Need Hyper Potions or Ultra Balls for the summit climb? I have got you covered!"}'::jsonb, 0, false)

ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    role = EXCLUDED.role,
    pos_x = EXCLUDED.pos_x,
    pos_y = EXCLUDED.pos_y,
    facing = EXCLUDED.facing,
    sight_range = EXCLUDED.sight_range,
    dialogue = EXCLUDED.dialogue,
    reward_money = EXCLUDED.reward_money,
    can_rebattle = EXCLUDED.can_rebattle;

-- Reset the identity sequence so future NPC inserts do not collide
SELECT setval(pg_get_serial_sequence('poke.npcs', 'id'), (SELECT MAX(id) FROM poke.npcs));

COMMIT;