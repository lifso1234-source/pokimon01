-- =====================================================================
-- BLENDED & LIVING WORLD MAP DML (49,000 Tiles: 280 x 175 Grid)
-- Includes 4 One-Way-Entrance Caves (North, South, West, East entries)
-- =====================================================================

SET search_path TO poke, public;

-- Ensure all custom terrain enum values exist
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'grass';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'water';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'sand';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'cave';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'path';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'wall';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'building';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'tree';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'snow';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'wheat';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'mountain';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'deep water';

BEGIN;

-- =====================================================================
-- 1. GENERATE 280 x 175 BLENDED MAP TILES (49,000 Total Tiles)
-- =====================================================================
DO $$
DECLARE
    x_val int;
    y_val int;
    t poke.terrain;
    walk boolean;

    -- Organic noise & biome wave helpers
    n1 float;
    n2 float;
    noise float;
    mid_y float;
    east_west_x float;
    lower_split_x float;
    river_center_y float;
    lower_river_y float;

    -- Distance metrics for landmarks
    dist_island float;
    dist_pond float;
    dist_cabin float;
    dist_mountain float;
    dist_forest_pond float;

    -- Path & Bridge flags
    is_main_path boolean;
BEGIN
    FOR x_val IN 0..279 LOOP
        FOR y_val IN 0..174 LOOP
            -- Default base terrain: grass
            t := 'grass';
            walk := true;

            -- Deterministic smooth pseudo-noise (-1.0 to 1.0) for organic edges
            n1 := sin(x_val * 0.09 + cos(y_val * 0.11) * 1.6);
            n2 := cos(y_val * 0.13 - sin(x_val * 0.07) * 1.4);
            noise := (n1 + n2) * 0.5;

            -- Organic curved biome boundaries
            mid_y := 89.0 + sin(x_val * 0.045) * 4.5 + cos(x_val * 0.11) * 1.8;
            east_west_x := 144.0 + sin(y_val * 0.06) * 7.0 + cos(y_val * 0.14) * 2.5;
            lower_split_x := 124.0 + sin(y_val * 0.07) * 6.0 + noise * 3.0;

            -- Winding paths & bridges across the world
            is_main_path :=
                -- Village North-South Main Street & South Gate Bridge to Island (x ~ 48)
                (abs(x_val - (48.0 + sin(y_val * 0.08) * 1.3)) <= 1.8 AND y_val BETWEEN 22 AND 139)
                -- Island West Approach Bridge (x: 47..65, y ~ 138)
                OR (y_val BETWEEN 136 AND 140 AND x_val BETWEEN 47 AND 65)
                -- Village Cross Street (y ~ 37, x: 22..77)
                OR (abs(y_val - (37.0 + sin(x_val * 0.09) * 1.0)) <= 1.5 AND x_val BETWEEN 22 AND 77)
                -- Path to Fishing Pond Dock (x: 64..84, y: 18..37)
                OR (x_val BETWEEN 64 AND 74 AND y_val BETWEEN 19 AND 37)
                OR (y_val BETWEEN 18 AND 20 AND x_val BETWEEN 72 AND 84)
                -- East-West Highway from Village through Crossroads into Forest (y ~ 49, x: 48..186)
                OR (abs(y_val - (49.0 + sin(x_val * 0.05) * 1.6)) <= 1.6 AND x_val BETWEEN 48 AND 186)
                -- Crossroads Southbound Road to Highland Bridge (x ~ 149, y: 49..156)
                OR (abs(x_val - (149.0 + sin(y_val * 0.07) * 1.8)) <= 2.2 AND y_val BETWEEN 49 AND 156)
                -- Forest North Trail to Cabin (x ~ 185 -> 218, y ~ 25..71)
                OR (abs(x_val - (185.0 + cos(y_val * 0.09) * 1.5)) <= 1.6 AND y_val BETWEEN 25 AND 71)
                OR (abs(y_val - (25.0 + sin(x_val * 0.1) * 1.2)) <= 1.5 AND x_val BETWEEN 184 AND 219)
                OR (x_val BETWEEN 217 AND 219 AND y_val BETWEEN 25 AND 35)
                -- Forest Southern Trail (y ~ 71, x: 149..245)
                OR (abs(y_val - (71.0 + sin(x_val * 0.06) * 1.5)) <= 1.5 AND x_val BETWEEN 149 AND 245)
                -- Trail spur leading to Whispering Woods Hollow (West entrance at x=254, y=51)
                OR (y_val BETWEEN 50 AND 52 AND x_val BETWEEN 225 AND 253)
                -- Highland Trail to Mountain Base & Summit Ascent (y ~ 128, x: 149..208)
                OR (abs(y_val - (128.0 + sin(x_val * 0.08) * 1.4)) <= 1.7 AND x_val BETWEEN 149 AND 185)
                OR (abs((x_val - 175) - (132 - y_val) * 2.2) <= 2.2 AND x_val BETWEEN 175 AND 206);

            -- =========================================================
            -- 0. ONE-WAY-ENTRANCE CAVES (Highest Priority Landmarks)
            -- =========================================================
            -- CAVE 1: CLIFFSIDE GROTTO (x: 112..118, y: 80..85)
            -- Accessible ONLY from the NORTH (walk down through x: 114..116, y: 80)
            IF x_val BETWEEN 112 AND 118 AND y_val BETWEEN 80 AND 85 THEN
                IF y_val = 80 AND x_val NOT BETWEEN 114 AND 116 THEN
                    t := 'wall';
                    walk := false;
                ELSIF x_val IN (112, 118) OR y_val = 85 THEN
                    t := 'wall';
                    walk := false;
                ELSE
                    t := 'cave';
                    walk := true;
                END IF;

            -- CAVE 2: SUMMIT CAVERN (x: 207..213, y: 113..118)
            -- Accessible ONLY from the SOUTH (walk up through x: 209..211, y: 118)
            ELSIF x_val BETWEEN 207 AND 213 AND y_val BETWEEN 113 AND 118 THEN
                IF y_val = 118 AND x_val NOT BETWEEN 209 AND 211 THEN
                    t := 'wall';
                    walk := false;
                ELSIF x_val IN (207, 213) OR y_val = 113 THEN
                    t := 'wall';
                    walk := false;
                ELSE
                    t := 'cave';
                    walk := true;
                END IF;

            -- CAVE 3: WHISPERING WOODS HOLLOW (x: 254..260, y: 48..54)
            -- Accessible ONLY from the WEST (walk right through x: 254, y: 50..52)
            ELSIF x_val BETWEEN 254 AND 260 AND y_val BETWEEN 48 AND 54 THEN
                IF x_val = 254 AND y_val NOT BETWEEN 50 AND 52 THEN
                    t := 'wall';
                    walk := false;
                ELSIF y_val IN (48, 54) OR x_val = 260 THEN
                    t := 'wall';
                    walk := false;
                ELSE
                    t := 'cave';
                    walk := true;
                END IF;

            -- CAVE 4: SUNKEN ISLAND GROTTO (x: 68..73, y: 135..141)
            -- Accessible ONLY from the EAST (walk left through x: 73, y: 137..139)
            ELSIF x_val BETWEEN 68 AND 73 AND y_val BETWEEN 135 AND 141 THEN
                IF x_val = 73 AND y_val NOT BETWEEN 137 AND 139 THEN
                    t := 'wall';
                    walk := false;
                ELSIF y_val IN (135, 141) OR x_val = 68 THEN
                    t := 'wall';
                    walk := false;
                ELSE
                    t := 'cave';
                    walk := true;
                END IF;

            -- =========================================================
            -- 1. OUTER MAP BORDER WALLS (Organic jagged cliff rim)
            -- =========================================================
            ELSIF x_val <= 1 OR x_val >= 278 OR y_val <= 1 OR y_val >= 173
               OR (x_val <= 3 AND noise > 0.35)
               OR (x_val >= 276 AND noise > 0.35)
               OR (y_val <= 3 AND noise > 0.4)
               OR (y_val >= 171 AND noise > 0.4) THEN
                t := 'wall';
                walk := false;

            -- =========================================================
            -- 2. CENTRAL DIVIDING RIVER & CLIFF RIDGE (Blended Belt)
            -- =========================================================
            ELSIF abs(y_val - mid_y) <= 4.5 THEN
                river_center_y := mid_y + sin(x_val * 0.08) * 1.2;

                -- Bridges always cross safely
                IF is_main_path THEN
                    t := 'path';
                    walk := true;

                -- Central Rocky Cliff Wall (x: 92..142) with foothill transitions
                ELSIF x_val BETWEEN 92 AND 142 THEN
                    IF abs(y_val - mid_y) <= 2.3 + noise * 0.8 THEN
                        t := 'wall';
                        walk := false;
                    ELSE
                        t := 'mountain';
                        walk := true;
                    END IF;

                -- Winding East River (x >= 143) with shallow water & sandy banks
                ELSIF x_val >= 143 THEN
                    IF abs(y_val - river_center_y) <= 1.8 THEN
                        t := 'deep water';
                        walk := false;
                    ELSIF abs(y_val - river_center_y) <= 3.1 THEN
                        t := 'water';
                        walk := false;
                    ELSE
                        t := 'sand';
                        walk := true;
                    END IF;

                -- Western Meadow Transition between Village and Lake Beach (x < 92)
                ELSE
                    IF y_val > mid_y + 1.5 AND x_val BETWEEN 14 AND 92 THEN
                        t := 'sand';
                        walk := true;
                    ELSIF noise > 0.55 AND x_val < 42 THEN
                        t := 'tree';
                        walk := false;
                    ELSE
                        t := 'grass';
                        walk := true;
                    END IF;
                END IF;

            -- =========================================================
            -- 3. BOTTOM-LEFT: DEEP LAKE, SHALLOWS, BEACHES & SANCTUARY ISLAND
            -- =========================================================
            ELSIF y_val > mid_y AND x_val < lower_split_x THEN
                dist_island := sqrt(
                    power((x_val - 78.0) / (19.0 + noise * 2.2), 2) +
                    power((y_val - 138.0) / (15.0 + n2 * 1.8), 2)
                );

                IF is_main_path THEN
                    t := 'path';
                    walk := true;

                -- Sanctuary Island Core (Grass + Shade Trees + Sandy Shore)
                ELSIF dist_island <= 0.68 THEN
                    -- Keep clear apron immediately east of Cave 4 entrance (x: 74..75, y: 136..140)
                    IF x_val BETWEEN 74 AND 75 AND y_val BETWEEN 136 AND 140 THEN
                        t := 'grass';
                        walk := true;
                    ELSIF ((x_val * 19 + y_val * 23) % 29 = 0)
                       AND sqrt(power(x_val - 78.0, 2) + power(y_val - 138.0, 2)) > 4.5 THEN
                        t := 'tree';
                        walk := false;
                    ELSE
                        t := 'grass';
                        walk := true;
                    END IF;
                ELSIF dist_island <= 0.96 THEN
                    t := 'sand';
                    walk := true;
                -- Shallow water ring around the island
                ELSIF dist_island <= 1.18 THEN
                    t := 'water';
                    walk := false;

                -- Main Lake Northern & Eastern Sandy Beaches
                ELSIF (y_val <= mid_y + 11.0 + noise * 3.0 AND x_val >= 12)
                   OR (x_val >= lower_split_x - 11.0 - noise * 3.0 AND y_val <= 156) THEN
                    IF (y_val >= mid_y + 8.5 + noise * 2.5 AND x_val < lower_split_x - 11.0)
                       OR (x_val <= lower_split_x - 8.5 - noise * 2.5 AND y_val > mid_y + 8.5) THEN
                        t := 'water';
                        walk := false;
                    ELSE
                        IF y_val < mid_y + 6.0 AND noise > 0.68 AND x_val NOT BETWEEN 43 AND 60 THEN
                            t := 'tree';
                            walk := false;
                        ELSE
                            t := 'sand';
                            walk := true;
                        END IF;
                    END IF;

                -- Western shoreline strip
                ELSIF x_val <= 8 + noise * 2.5 THEN
                    IF x_val <= 5 + noise * 1.5 THEN
                        t := 'sand';
                        walk := true;
                    ELSE
                        t := 'water';
                        walk := false;
                    END IF;

                -- Open Deep Water Lake
                ELSE
                    t := 'deep water';
                    walk := false;
                END IF;

            -- =========================================================
            -- 4. BOTTOM-RIGHT: GRASSY HIGHLANDS, ROCKY MOUNTAINS & SNOWY PEAKS
            --    Elevation progression: Sand -> Grass -> Mountain -> Snow
            -- =========================================================
            ELSIF y_val > mid_y AND x_val >= lower_split_x THEN
                lower_river_y := 151.0 + sin(x_val * 0.07) * 2.2;
                dist_mountain := sqrt(
                    power((x_val - 210.0) / (46.0 + noise * 4.5), 2) +
                    power((y_val - 122.0) / (24.0 + n2 * 3.0), 2)
                );

                -- Lower Winding River Channel (y ~ 151, x < 238) with sandy riverbanks
                IF abs(y_val - lower_river_y) <= 4.5 AND x_val <= 238 THEN
                    IF is_main_path THEN
                        t := 'path';
                        walk := true;
                    ELSIF abs(y_val - lower_river_y) <= 1.8 THEN
                        t := 'deep water';
                        walk := false;
                    ELSIF abs(y_val - lower_river_y) <= 3.1 THEN
                        t := 'water';
                        walk := false;
                    ELSE
                        t := 'sand';
                        walk := true;
                    END IF;

                -- Main Trail up to Mountain & South Bridge
                ELSIF is_main_path THEN
                    t := 'path';
                    walk := true;

                -- High-Altitude Snow Cap (strictly on top of the mountain peaks!)
                ELSIF dist_mountain <= 0.66 + noise * 0.07 THEN
                    t := 'snow';
                    walk := true;

                -- Snow-to-Rock Alpine Tree-Line Blend
                ELSIF dist_mountain <= 0.78 + noise * 0.07 THEN
                    IF noise > 0.05 THEN
                        t := 'snow';
                        walk := true;
                    ELSE
                        t := 'mountain';
                        walk := true;
                    END IF;

                -- Rocky Mountain Slopes (buffers the snow from the grassy lowlands)
                ELSIF dist_mountain <= 1.06 + noise * 0.07 THEN
                    t := 'mountain';
                    walk := true;

                -- Foothill Transition (Grass & Mountain rock outcroppings)
                ELSIF dist_mountain <= 1.22 + noise * 0.08 THEN
                    IF noise > 0.15 THEN
                        t := 'mountain';
                        walk := true;
                    ELSE
                        t := 'grass';
                        walk := true;
                    END IF;

                -- Western Beach-to-Meadow Transition (Sand only right next to the lake)
                ELSIF x_val <= lower_split_x + 4.5 + noise * 2.0 THEN
                    t := 'sand';
                    walk := true;

                -- Lush Highland Valley & Pine Groves around the mountain base
                ELSIF (sin(x_val * 0.21) + cos(y_val * 0.23) + noise) > 1.45
                      AND x_val > lower_split_x + 10.0 THEN
                    t := 'tree';
                    walk := false;

                ELSE
                    t := 'grass';
                    walk := true;
                END IF;

            -- =========================================================
            -- 5. TOP-LEFT: STARTER VILLAGE, WHEAT FIELDS & FISHING POND
            -- =========================================================
            ELSIF y_val <= mid_y AND x_val < east_west_x THEN
                dist_pond := sqrt(
                    power((x_val - 92.0) / (19.0 + noise * 2.0), 2) +
                    power((y_val - 18.0) / (10.5 + n2 * 1.5), 2)
                );

                -- Village Buildings & Farm Windmill
                IF (x_val BETWEEN 18 AND 28 AND y_val BETWEEN 18 AND 26)      -- House 1
                   OR (x_val BETWEEN 36 AND 46 AND y_val BETWEEN 14 AND 22)   -- House 2
                   OR (x_val BETWEEN 54 AND 64 AND y_val BETWEEN 18 AND 26)   -- House 3
                   OR (x_val BETWEEN 18 AND 28 AND y_val BETWEEN 46 AND 54)   -- House 4
                   OR (x_val BETWEEN 36 AND 46 AND y_val BETWEEN 52 AND 60)   -- House 5
                   OR (x_val BETWEEN 58 AND 68 AND y_val BETWEEN 46 AND 54)   -- Village Shop
                   OR (x_val BETWEEN 116 AND 124 AND y_val BETWEEN 42 AND 50) -- Farm Windmill
                THEN
                    t := 'building';
                    walk := true;

                -- Roads & Wooden Fishing Dock
                ELSIF is_main_path THEN
                    t := 'path';
                    walk := true;

                -- Small Fishing Pond (Deep center, shallow water edge, sandy bank)
                ELSIF dist_pond <= 0.62 THEN
                    t := 'deep water';
                    walk := false;
                ELSIF dist_pond <= 0.96 THEN
                    t := 'water';
                    walk := false;
                ELSIF dist_pond <= 1.12 + noise * 0.06 THEN
                    t := 'sand';
                    walk := true;

                -- Organic Wheat Farm Patches with grassy hedgerow borders
                ELSIF ((x_val BETWEEN 78 AND 126 AND y_val BETWEEN 34 AND 45)
                    OR (x_val BETWEEN 78 AND 126 AND y_val BETWEEN 53 AND 66))
                   AND (abs(sin(x_val * 0.15) + cos(y_val * 0.18)) > 0.18) THEN
                    t := 'wheat';
                    walk := true;

                -- Clear grassy approach north of Cave 1 entrance (x: 113..117, y: 77..79)
                ELSIF x_val BETWEEN 113 AND 117 AND y_val BETWEEN 77 AND 79 THEN
                    t := 'grass';
                    walk := true;

                -- Blended Forest Edge transitioning into Top-Right Woods (x > 132)
                ELSIF x_val >= east_west_x - 10.0 AND (sin(x_val * 0.25) + cos(y_val * 0.23) + noise) > 1.15 THEN
                    t := 'tree';
                    walk := false;

                -- Natural Border Groves framing Top & West Village Edges
                ELSIF (x_val <= 11 + noise * 3.0 OR y_val <= 8 + noise * 2.5)
                      AND (sin(x_val * 0.31) + cos(y_val * 0.29)) > 0.65 THEN
                    t := 'tree';
                    walk := false;

                -- Scattered decorative trees near village paths
                ELSIF x_val < 74 AND ((x_val * 29 + y_val * 37) % 67 = 0) THEN
                    t := 'tree';
                    walk := false;

                ELSE
                    t := 'grass';
                    walk := true;
                END IF;

            -- =========================================================
            -- 6. TOP-RIGHT: LUSH FOREST, WOODLAND POND, CLEARINGS & CABIN
            -- =========================================================
            ELSE
                dist_cabin := sqrt(
                    power((x_val - 218.0) / (17.0 + noise * 2.5), 2) +
                    power((y_val - 40.0) / (13.0 + n2 * 2.0), 2)
                );
                dist_forest_pond := sqrt(
                    power((x_val - 246.0) / (11.0 + noise * 1.5), 2) +
                    power((y_val - 22.0) / (7.5 + n2 * 1.2), 2)
                );

                -- Central Forest Cabin
                IF x_val BETWEEN 212 AND 224 AND y_val BETWEEN 34 AND 44 THEN
                    t := 'building';
                    walk := true;

                -- Winding Forest Trails
                ELSIF is_main_path THEN
                    t := 'path';
                    walk := true;

                -- Hidden Woodland Spring Pond (x ~ 246, y ~ 22)
                ELSIF dist_forest_pond <= 0.85 THEN
                    t := 'water';
                    walk := false;
                ELSIF dist_forest_pond <= 1.08 THEN
                    t := 'sand';
                    walk := true;

                -- Open Meadow Clearing around Cabin
                ELSIF dist_cabin <= 1.0 THEN
                    t := 'grass';
                    walk := true;

                -- Clear grassy approach west of Cave 3 entrance (x: 251..253, y: 49..53)
                ELSIF x_val BETWEEN 251 AND 253 AND y_val BETWEEN 49 AND 53 THEN
                    t := 'grass';
                    walk := true;

                -- Natural Forest Glades & Organic Dense Tree Canopies
                ELSE
                    IF (sin(x_val * 0.14) + cos(y_val * 0.15) + noise * 0.8) > 0.35
                       AND ((x_val * 11 + y_val * 17) % 5 <> 0) THEN
                        t := 'tree';
                        walk := false;
                    ELSE
                        t := 'grass';
                        walk := true;
                    END IF;
                END IF;
            END IF;

            -- Insert / Update tile in poke.map_tiles
            INSERT INTO poke.map_tiles (x, y, terrain, is_walkable)
            VALUES (x_val, y_val, t, walk)
            ON CONFLICT (x, y) DO UPDATE
            SET terrain = EXCLUDED.terrain,
                is_walkable = EXCLUDED.is_walkable;
        END LOOP;
    END LOOP;

    -- =================================================================
    -- 2. GUARANTEE WALKABLE CLEARANCE FOR ALL 13 NPCs (+ 1-TILE BUFFER)
    -- =================================================================
    UPDATE poke.map_tiles mt
    SET is_walkable = true,
        terrain = CASE
            WHEN mt.terrain IN ('tree', 'wall', 'water', 'deep water') THEN
                CASE
                    WHEN mt.x <= 120 AND mt.y BETWEEN 92 AND 105 THEN 'sand'::poke.terrain
                    ELSE 'grass'::poke.terrain
                END
            ELSE mt.terrain
        END
    FROM (
        VALUES
            (32, 37), (63, 55), (48, 30), (102, 49), (83, 19),
            (54, 98), (78, 138), (184, 49), (218, 45), (202, 71),
            (149, 102), (210, 122), (156, 128)
    ) AS npc(nx, ny)
    WHERE mt.x BETWEEN npc.nx - 1 AND npc.nx + 1
      AND mt.y BETWEEN npc.ny - 1 AND npc.ny + 1;

END $$;

COMMIT;