-- =====================================================================
-- POKE WORLD MAP DML  (500 x 300 grid = 150,000 tiles)
--
-- Layout (inspired by the reference map):
--   NORTH      Snow range -> rocky foothills -> grass (blended). Snow towns:
--              Frost Outpost, Glacier Hollow, Northwind, Frostpeak Village,
--              Whiteout + Frost Lodge, Highridge, Frostpeak Cavern
--   CENTRE     Walled city "Crossroads" (3 rings, 4 gates), 5 rivers flowing
--              from the mountains to the sea, ponds, wheat farms
--   WEST       Big forest, hamlets, Westwatch Burrow cave
--   SOUTH-WEST Wide bay with beaches + piers (Bayview, Driftwood)
--   SOUTH      BIG INLAND LAKE fed by two rivers, with a fishing island
--              (house + fishing dock, reachable by a wooden bridge)
--   SOUTH-EAST Sandy river delta, South Mine cave
--   EAST       Small mountain + Emberstone Hollow cave, long causeway to the
--              Island Fortress (nested walls), 2 small hidden islands
--
-- 4 one-way-entrance caves:
--   Frostpeak Cavern (enter from SOUTH)   Emberstone Hollow (enter from WEST)
--   South Mine       (enter from NORTH)   Westwatch Burrow  (enter from EAST)
--
-- 14 walled hamlets + 1 city + 1 fortress, 76 NPCs spread over the map.
-- Everything is deterministic (no random()), so re-running gives the same map.
-- =====================================================================

SET search_path TO poke, public;

-- Ensure all custom terrain enum values exist (must run outside the transaction)
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
-- 0. TEMPORARY HELPER FUNCTIONS (live only in this session)
-- =====================================================================

-- Smooth 0..1 bump (used for forests, mountains, coast bites)
CREATE OR REPLACE FUNCTION pg_temp.gauss(px float8, py float8, cx float8, cy float8, rx float8, ry float8)
RETURNS float8 LANGUAGE sql IMMUTABLE AS $$
    SELECT exp(-(power((px - cx) / rx, 2) + power((py - cy) / ry, 2)))
$$;

-- Distance from a point to a line segment (used for roads)
CREATE OR REPLACE FUNCTION pg_temp.seg_dist(px float8, py float8, ax float8, ay float8, bx float8, by float8)
RETURNS float8 LANGUAGE sql IMMUTABLE AS $$
    SELECT sqrt(power(px - (ax + q.k * (bx - ax)), 2) + power(py - (ay + q.k * (by - ay)), 2))
    FROM (
        SELECT CASE
                 WHEN (bx - ax) * (bx - ax) + (by - ay) * (by - ay) = 0 THEN 0
                 ELSE greatest(0, least(1,
                        ((px - ax) * (bx - ax) + (py - ay) * (by - ay))
                        / ((bx - ax) * (bx - ax) + (by - ay) * (by - ay))))
               END AS k
    ) q
$$;

-- Rectangular wall ring with gates.
-- returns: 0 = outside, 1 = wall, 2 = gate, 3 = inside
-- sides = which sides have a gate, e.g. 'NSEW', 'NS', 'WE'
CREATE OR REPLACE FUNCTION pg_temp.ring_zone(px int, py int, cx int, cy int, hw int, hh int, thick int, gate int, sides text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN abs(px - cx) > hw OR abs(py - cy) > hh THEN 0
        WHEN abs(px - cx) > hw - thick OR abs(py - cy) > hh - thick THEN
            CASE
                WHEN (py - cy < -(hh - thick) AND abs(px - cx) <= gate AND position('N' in sides) > 0)
                  OR (py - cy >  (hh - thick) AND abs(px - cx) <= gate AND position('S' in sides) > 0)
                  OR (px - cx < -(hw - thick) AND abs(py - cy) <= gate AND position('W' in sides) > 0)
                  OR (px - cx >  (hw - thick) AND abs(py - cy) <= gate AND position('E' in sides) > 0)
                THEN 2 ELSE 1
            END
        ELSE 3
    END
$$;

-- Small walled hamlet: hedge wall + 4 gates + cross street + 4 houses.
-- returns: 0 outside, 1 wall, 2 gate, 3 house, 4 street, 5 open ground
CREATE OR REPLACE FUNCTION pg_temp.hamlet_zone(px int, py int, cx int, cy int, hw int, hh int)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN abs(px - cx) > hw OR abs(py - cy) > hh THEN 0
        WHEN abs(px - cx) = hw OR abs(py - cy) = hh THEN
            CASE
                WHEN (abs(px - cx) <= 1 AND abs(py - cy) = hh)
                  OR (abs(py - cy) <= 1 AND abs(px - cx) = hw) THEN 2
                ELSE 1
            END
        WHEN abs(px - cx) <= 1 OR abs(py - cy) <= 1 THEN 4
        WHEN abs(px - cx) BETWEEN hw - 6 AND hw - 3
         AND abs(py - cy) BETWEEN hh - 4 AND hh - 2 THEN 3
        ELSE 5
    END
$$;

-- One-way cave: walls + a single gap on one side + a short path apron outside.
-- side = N/S/W/E, g0..g1 = gap range along that side
-- returns: 0 none, 1 wall, 2 cave floor (incl. gap), 3 apron (path)
CREATE OR REPLACE FUNCTION pg_temp.cave_zone(px int, py int, x0 int, y0 int, x1 int, y1 int, side text, g0 int, g1 int)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN px BETWEEN x0 AND x1 AND py BETWEEN y0 AND y1 THEN
            CASE
                WHEN (side = 'N' AND py = y0 AND px BETWEEN g0 AND g1)
                  OR (side = 'S' AND py = y1 AND px BETWEEN g0 AND g1)
                  OR (side = 'W' AND px = x0 AND py BETWEEN g0 AND g1)
                  OR (side = 'E' AND px = x1 AND py BETWEEN g0 AND g1) THEN 2
                WHEN px IN (x0, x1) OR py IN (y0, y1) THEN 1
                ELSE 2
            END
        WHEN side = 'N' AND py BETWEEN y0 - 3 AND y0 - 1 AND px BETWEEN g0 - 1 AND g1 + 1 THEN 3
        WHEN side = 'S' AND py BETWEEN y1 + 1 AND y1 + 3 AND px BETWEEN g0 - 1 AND g1 + 1 THEN 3
        WHEN side = 'W' AND px BETWEEN x0 - 3 AND x0 - 1 AND py BETWEEN g0 - 1 AND g1 + 1 THEN 3
        WHEN side = 'E' AND px BETWEEN x1 + 1 AND x1 + 3 AND py BETWEEN g0 - 1 AND g1 + 1 THEN 3
        ELSE 0
    END
$$;

-- =====================================================================
-- 1. THE TILE CLASSIFIER: (x, y) -> terrain + walkable
--    Priority order: caves > border > city > hamlets > fortress > islands
--    > sea/beach > rivers > mountains > ponds > farms > forests > grass
-- =====================================================================
CREATE OR REPLACE FUNCTION pg_temp.classify_tile(x int, y int, OUT t poke.terrain, OUT walk boolean)
LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
    n1 float8; n2 float8; n3 float8; noise float8; hsh int;
    z int; z2 int; z3 int;
    x_coast float8; y_coast float8; d_sea float8;
    snow_bot float8; rock_bot float8; m2 float8; m3 float8;
    dr float8; w float8; dp float8; p float8; d_isl float8; d_lake float8;
    hm int[]; bd int[]; isl int[]; rv float8[]; fm float8[]; pd float8[];

    -- Hamlets: {centre x, centre y, half width, half height}
    hamlets int[] := ARRAY[
        [75,131,11,9],   -- H1 Riverbend
        [130,150,11,9],  -- H2 Hedgeford
        [155,125,10,8],  -- H3 Elmwatch
        [22,48,9,6],     -- H4 Frost Outpost (snow)
        [122,192,9,7],   -- H5 Bayview (harbour)
        [365,165,9,7],   -- H6 Pine Hollow
        [245,190,9,7],   -- H7 Wheatfield
        [205,108,10,7],  -- H8 Snowmelt
        [35,215,8,6],    -- H9 Driftwood (harbour)
        [380,62,8,6],    -- H10 Highridge
        [80,30,10,7],    -- H11 Glacier Hollow (snow)
        [200,26,11,8],   -- H12 Northwind (snow)
        [300,24,10,7],   -- H13 Frostpeak Village (snow)
        [390,24,9,6]     -- H14 Whiteout (snow)
    ];

    -- City buildings {x0, y0, x1, y1}
    city_blds int[] := ARRAY[
        [240,119,244,123],[276,119,280,123],[240,161,244,165],[276,161,280,165],
        [240,131,243,136],[240,148,243,153],[277,131,280,136],[277,148,280,153],
        [250,119,256,123],[264,119,270,123],[250,161,256,165],[264,161,270,165]
    ];
    inner_blds int[] := ARRAY[
        [252,133,258,137],[264,133,270,137],[252,147,258,151],[264,147,270,151]
    ];

    -- Islands {cx, cy, rx, ry}
    islands int[] := ARRAY[[448,130,34,36],[478,26,15,11],[484,198,11,15]];

    -- Vertical rivers {x0, amplitude, freq, phase, half width, y start, y end}
    rivers float8[] := ARRAY[
        [98,9,0.045,0.0,1.3,78,262],
        [178,4,0.05,1.2,1.3,75,222],   -- flows into the lake
        [228,3,0.06,2.0,1.3,70,222],   -- flows into the lake
        [52,4,0.05,0.5,1.3,80,262]
    ]::float8[];

    -- Ponds {cx, cy, rx, ry}
    ponds float8[] := ARRAY[[205,155,8,5],[318,150,7,5]]::float8[];

    -- Forest blobs {cx, cy, rx, ry, weight}
    forests float8[] := ARRAY[
        [60,160,52,30,1.0],[190,108,55,13,0.7],[365,148,26,38,0.8],[125,215,45,16,0.7],
        [300,150,20,22,0.6],[245,235,70,16,0.6],[20,200,18,35,0.8],[120,105,40,12,0.6]
    ]::float8[];
BEGIN
    t := 'grass';
    walk := true;

    -- Deterministic organic noise (-1..1) + hash (0..99)
    n1 := sin(x * 0.09 + cos(y * 0.11) * 1.6);
    n2 := cos(y * 0.13 - sin(x * 0.07) * 1.4);
    noise := (n1 + n2) * 0.5;
    n3 := sin(x * 0.31 + y * 0.17) * cos(y * 0.27 - x * 0.11);
    hsh := (((x::bigint * 73856093) # (y::bigint * 19349663)) % 100)::int;

    -- -----------------------------------------------------------------
    -- A. ONE-WAY CAVES
    -- -----------------------------------------------------------------
    z := greatest(
        pg_temp.cave_zone(x, y, 284, 60, 298, 70, 'S', 289, 293),    -- Frostpeak Cavern
        pg_temp.cave_zone(x, y, 350, 120, 357, 126, 'W', 122, 124),  -- Emberstone Hollow
        pg_temp.cave_zone(x, y, 326, 209, 333, 215, 'N', 328, 331),  -- South Mine
        pg_temp.cave_zone(x, y, 22, 118, 29, 124, 'E', 120, 122)     -- Westwatch Burrow
    );
    IF z = 1 THEN t := 'wall'; walk := false; RETURN;
    ELSIF z = 2 THEN t := 'cave'; RETURN;
    ELSIF z = 3 THEN t := 'path'; RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- B. OUTER BORDER (jagged cliff rim)
    -- -----------------------------------------------------------------
    IF x <= 1 OR x >= 498 OR y <= 1 OR y >= 298
       OR (x <= 3 AND noise > 0.35) OR (x >= 496 AND noise > 0.35)
       OR (y <= 3 AND noise > 0.4)  OR (y >= 296 AND noise > 0.4) THEN
        t := 'wall'; walk := false; RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- C. CITY "CROSSROADS" (outer wall, ring road, inner plaza)
    -- -----------------------------------------------------------------
    z := pg_temp.ring_zone(x, y, 260, 142, 24, 26, 2, 2, 'NSEW');
    IF z > 0 THEN
        IF z = 1 THEN t := 'wall'; walk := false; RETURN;
        ELSIF z = 2 THEN t := 'path'; RETURN;
        END IF;

        z2 := pg_temp.ring_zone(x, y, 260, 142, 11, 12, 1, 2, 'NS');
        IF z2 = 1 THEN t := 'wall'; walk := false; RETURN;
        ELSIF z2 = 2 THEN t := 'path'; RETURN;
        ELSIF z2 = 3 THEN
            FOREACH bd SLICE 1 IN ARRAY inner_blds LOOP
                IF x BETWEEN bd[1] AND bd[3] AND y BETWEEN bd[2] AND bd[4] THEN
                    t := 'building'; RETURN;
                END IF;
            END LOOP;
            t := 'path'; RETURN;   -- cobbled plaza
        END IF;

        FOREACH bd SLICE 1 IN ARRAY city_blds LOOP
            IF x BETWEEN bd[1] AND bd[3] AND y BETWEEN bd[2] AND bd[4] THEN
                t := 'building'; RETURN;
            END IF;
        END LOOP;
        t := 'grass'; RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- D. HAMLETS
    -- -----------------------------------------------------------------
    FOREACH hm SLICE 1 IN ARRAY hamlets LOOP
        z := pg_temp.hamlet_zone(x, y, hm[1], hm[2], hm[3], hm[4]);
        IF z > 0 THEN
            IF z = 1 THEN t := 'wall'; walk := false;
            ELSIF z IN (2, 4) THEN t := 'path';
            ELSIF z = 3 THEN t := 'building';
            ELSIF hm[2] < 56 THEN t := 'snow';
            ELSE t := 'grass';
            END IF;
            RETURN;
        END IF;
    END LOOP;

    -- Frost Lodge (snow cabin)
    IF x BETWEEN 146 AND 152 AND y BETWEEN 27 AND 32 THEN
        t := 'building'; RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- E. ISLAND FORTRESS (outer wall W/E gates -> middle wall N/S gates
    --    -> keep W/E gates: a small maze)
    -- -----------------------------------------------------------------
    z := pg_temp.ring_zone(x, y, 448, 130, 20, 19, 2, 2, 'WE');
    IF z > 0 THEN
        IF z = 1 THEN t := 'wall'; walk := false; RETURN;
        ELSIF z = 2 THEN t := 'path'; RETURN;
        END IF;

        z2 := pg_temp.ring_zone(x, y, 448, 130, 12, 11, 1, 2, 'NS');
        IF z2 = 1 THEN t := 'wall'; walk := false; RETURN;
        ELSIF z2 = 2 THEN t := 'path'; RETURN;
        ELSIF z2 = 3 THEN
            z3 := pg_temp.ring_zone(x, y, 448, 130, 6, 6, 1, 1, 'WE');
            IF z3 = 1 THEN t := 'wall'; walk := false; RETURN;
            ELSIF z3 = 3 AND x BETWEEN 445 AND 451 AND y BETWEEN 127 AND 131 THEN
                t := 'building'; RETURN;
            END IF;
            t := 'path'; RETURN;
        END IF;
        t := 'grass'; RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- F. ISLANDS (grass core -> sand rim -> shallow ring)
    -- -----------------------------------------------------------------
    FOREACH isl SLICE 1 IN ARRAY islands LOOP
        IF abs(x - isl[1]) <= isl[3] * 1.6 AND abs(y - isl[2]) <= isl[4] * 1.6 THEN
            d_isl := sqrt(power((x - isl[1]) / (isl[3] + noise * 1.5), 2)
                        + power((y - isl[2]) / (isl[4] + n2 * 1.5), 2));
            IF d_isl <= 0.68 THEN
                IF d_isl > 0.35 AND hsh < 2 THEN t := 'tree'; walk := false; END IF;
                RETURN;
            ELSIF d_isl <= 0.98 THEN
                t := 'sand'; RETURN;
            ELSIF d_isl <= 1.2 THEN
                t := 'water'; walk := false; RETURN;
            END IF;
        END IF;
    END LOOP;

    -- -----------------------------------------------------------------
    -- G. SEA (east + south, big south-west bay), beaches, river delta
    -- -----------------------------------------------------------------
    x_coast := 395 + 28 * sin(y * 0.022) + 8 * cos(y * 0.07)
             + 35 * greatest(0, (70 - y) / 70.0) + noise * 3;
    y_coast := 262 + 10 * sin(x * 0.03)
             - 55 * exp(-power((x - 80) / 70.0, 2))     -- south-west bay
             - 22 * exp(-power((x - 290) / 40.0, 2))    -- small south bay
             + noise * 3;
    d_sea := greatest(x - x_coast, y - y_coast);

    IF d_sea > 0 THEN
        -- sandbars of the south-east river delta
        IF x BETWEEN 372 AND 462 AND y BETWEEN 195 AND 268 AND d_sea < 24
           AND abs(sin((x - 372) * 0.27 + (y - 195) * 0.11 + n2)) < 0.26 THEN
            t := 'sand'; RETURN;
        END IF;
        IF d_sea <= 6 + noise * 1.5 THEN t := 'water'; ELSE t := 'deep water'; END IF;
        walk := false; RETURN;
    ELSIF d_sea > -(3.2 + noise * 1.5) THEN
        t := 'sand'; RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- G2. BIG INLAND LAKE (centre 208,228) with a FISHING ISLAND:
    --     a house in the middle, a dock on the east side (fish the deep
    --     water), and a bridge from the north shore (added with the roads)
    -- -----------------------------------------------------------------
    IF abs(x - 208) <= 52 AND abs(y - 228) <= 24 THEN
        d_lake := sqrt(power((x - 208) / (38 + noise * 2.5), 2)
                     + power((y - 228) / (16 + n2 * 1.5), 2));
        IF d_lake <= 1.2 THEN
            d_isl := sqrt(power((x - 208) / (10 + noise * 0.8), 2)
                        + power((y - 228) / (6.5 + n2 * 0.6), 2));
            IF d_isl <= 0.72 THEN
                IF x BETWEEN 205 AND 210 AND y BETWEEN 225 AND 228 THEN
                    t := 'building';             -- the lake house
                END IF;
                RETURN;
            ELSIF d_isl <= 1.0 THEN
                t := 'sand'; RETURN;
            ELSIF d_lake <= 0.78 THEN
                t := 'deep water'; walk := false; RETURN;
            ELSIF d_lake <= 1.0 THEN
                t := 'water'; walk := false; RETURN;
            ELSE
                t := 'sand'; RETURN;             -- beach around the lake
            END IF;
        END IF;
    END IF;

    -- -----------------------------------------------------------------
    -- H. RIVERS (from the mountains to the sea; roads turn them into bridges)
    -- -----------------------------------------------------------------
    FOREACH rv SLICE 1 IN ARRAY rivers LOOP
        IF y BETWEEN rv[6] AND rv[7] THEN
            dr := abs(x - (rv[1] + rv[2] * sin(y * rv[3] + rv[4])));
            w := rv[5] + greatest(0, y - 190) * 0.02;       -- widens near the sea
            IF dr <= w THEN
                t := 'water'; walk := false; RETURN;
            ELSIF dr <= w + 1.2 AND y > 125 THEN
                t := 'sand'; RETURN;                         -- sandy banks
            END IF;
        END IF;
    END LOOP;

    -- East-flowing river from the cave to the sea
    IF x BETWEEN 295 AND 430 THEN
        dr := abs(y - (82 + (x - 295) * 0.28 + 4 * sin(x * 0.08)));
        w := 1.3 + (x - 295) * 0.006;
        IF dr <= w THEN t := 'water'; walk := false; RETURN; END IF;
    END IF;

    -- -----------------------------------------------------------------
    -- I. MOUNTAINS: snow cap -> blended snow/rock -> rock -> foothills -> grass
    -- -----------------------------------------------------------------
    snow_bot := 82 - x * 0.115 + 10 * sin(x * 0.05) + noise * 6;
    rock_bot := snow_bot + 22
              + 28 * exp(-power((x - 290) / 70.0, 2))
              + 10 * exp(-power((x - 60) / 45.0, 2))
              + noise * 4;

    IF y < snow_bot - 4 THEN
        IF noise + n3 * 0.5 > 0.85 THEN t := 'mountain'; ELSE t := 'snow'; END IF;
        RETURN;
    ELSIF y < snow_bot + 5 THEN
        IF noise + n3 * 0.4 > 0 THEN t := 'snow'; ELSE t := 'mountain'; END IF;
        RETURN;
    ELSIF y < rock_bot THEN
        t := 'mountain'; RETURN;
    ELSIF y < rock_bot + 7 AND noise > 0.1 THEN
        t := 'mountain'; RETURN;
    END IF;

    -- Small east mountain (Emberstone) and south mountain (South Mine)
    m2 := pg_temp.gauss(x, y, 352, 126, 17, 20);
    IF m2 > 0.82 + noise * 0.05 THEN t := 'snow'; RETURN;
    ELSIF m2 > 0.30 + noise * 0.06 THEN t := 'mountain'; RETURN;
    END IF;

    m3 := pg_temp.gauss(x, y, 330, 212, 15, 16);
    IF m3 > 0.85 + noise * 0.05 THEN t := 'snow'; RETURN;
    ELSIF m3 > 0.30 + noise * 0.06 THEN t := 'mountain'; RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- J. PONDS
    -- -----------------------------------------------------------------
    FOREACH pd SLICE 1 IN ARRAY ponds LOOP
        IF abs(x - pd[1]) <= pd[3] * 1.6 AND abs(y - pd[2]) <= pd[4] * 1.6 THEN
            dp := sqrt(power((x - pd[1]) / (pd[3] + noise * 0.8), 2)
                     + power((y - pd[2]) / (pd[4] + n2 * 0.6), 2));
            IF dp <= 0.55 THEN t := 'deep water'; walk := false; RETURN;
            ELSIF dp <= 0.9 THEN t := 'water'; walk := false; RETURN;
            ELSIF dp <= 1.1 THEN t := 'sand'; RETURN;
            END IF;
        END IF;
    END LOOP;

    -- -----------------------------------------------------------------
    -- K. WHEAT FARMS (6x6 checkerboard patches + farmhouses)
    -- -----------------------------------------------------------------
    IF x BETWEEN 262 AND 306 AND y BETWEEN 172 AND 204 THEN
        IF (x BETWEEN 276 AND 281 AND y BETWEEN 178 AND 182)
           OR (x BETWEEN 292 AND 297 AND y BETWEEN 196 AND 200) THEN
            t := 'building';
        ELSIF ((x - 262) / 6 + (y - 172) / 6) % 2 = 0 THEN
            t := 'wheat';
        END IF;
        RETURN;
    END IF;

    IF x BETWEEN 196 AND 222 AND y BETWEEN 176 AND 200 THEN
        IF x BETWEEN 203 AND 208 AND y BETWEEN 182 AND 186 THEN
            t := 'building';
        ELSIF ((x - 196) / 6 + (y - 176) / 6) % 2 = 0 THEN
            t := 'wheat';
        END IF;
        RETURN;
    END IF;

    -- -----------------------------------------------------------------
    -- L. FORESTS (diagonal tree lines + random extras: dotted look,
    --    still walkable between the trees)
    -- -----------------------------------------------------------------
    p := 0;
    FOREACH fm SLICE 1 IN ARRAY forests LOOP
        p := p + fm[5] * pg_temp.gauss(x, y, fm[1], fm[2], fm[3], fm[4]);
    END LOOP;

    -- (thinned out: ~1 tree in 6 in the core of a forest, few strays elsewhere)
    IF p + noise * 0.12 > 0.35 THEN
        IF ((x + 2 * y + (y / 7)) % 6 = 0) OR (p > 0.7 AND hsh < 3) OR hsh < 1 THEN
            t := 'tree'; walk := false;
        END IF;
    ELSIF p > 0.2 AND hsh < 1 THEN
        t := 'tree'; walk := false;
    ELSIF hsh = 0 AND noise > 0.45 THEN
        t := 'tree'; walk := false;      -- a few lone trees on open meadows
    END IF;

    RETURN;
END
$fn$;

-- =====================================================================
-- 2. GENERATE ALL 150,000 TILES (500 x 300) IN ONE SET-BASED INSERT
-- =====================================================================
INSERT INTO poke.map_tiles (x, y, terrain, is_walkable)
SELECT gx, gy, c.t, c.walk
FROM generate_series(0, 499) AS gx
CROSS JOIN generate_series(0, 299) AS gy
CROSS JOIN LATERAL pg_temp.classify_tile(gx, gy) AS c
ON CONFLICT (x, y) DO UPDATE
SET terrain = EXCLUDED.terrain,
    is_walkable = EXCLUDED.is_walkable;

-- =====================================================================
-- 3. ROADS, TRAILS, BRIDGES & PIERS
--    Drawn on top of the terrain: they cross rivers/sea as bridges and
--    clear trees, but never touch walls, buildings or cave tiles.
-- =====================================================================
CREATE TEMP TABLE road_segments (
    x1 int, y1 int, x2 int, y2 int,
    halfw float8,   -- half width (1.6 = main road, 1.0 = trail)
    wob float8      -- wobble so roads look hand-drawn
) ON COMMIT DROP;

-- Main roads
INSERT INTO road_segments VALUES
    -- city streets + ring road
    (260,117,260,130,1.6,0.5), (260,167,260,154,1.6,0.5),
    (237,142,246,142,1.6,0.5), (283,142,274,142,1.6,0.5),
    (246,127,274,127,1.6,0.5), (274,127,274,157,1.6,0.5),
    (274,157,246,157,1.6,0.5), (246,157,246,127,1.6,0.5),
    -- west highway: city -> Hedgeford / Elmwatch
    (237,142,210,143,1.6,0.5), (210,143,190,146,1.6,0.5), (190,146,158,148,1.6,0.5),
    (158,148,141,150,1.6,0.5), (158,148,155,133,1.6,0.5),
    -- east highway + causeway to the Island Fortress
    (283,142,300,137,1.6,0.5), (300,137,325,131,1.6,0.5), (325,131,427,130,1.6,0.5),
    -- trail to Frostpeak Cavern
    (260,117,262,105,1.6,0.5), (262,105,275,92,1.6,0.5), (275,92,285,80,1.6,0.5), (285,80,291,72,1.6,0.5),
    -- south road: city -> Wheatfield -> farms -> South Mine / Pine Hollow
    (260,167,250,176,1.6,0.5), (250,176,245,183,1.6,0.5),
    (254,190,310,190,1.6,0.5), (310,190,329,208,1.6,0.5),
    (310,190,340,178,1.6,0.5), (340,178,356,165,1.6,0.5),
    (365,158,365,131,1.6,0.5);

-- Trails
INSERT INTO road_segments VALUES
    (86,131,104,140,1.0,0.4), (104,140,119,150,1.0,0.4),           -- Riverbend -> Hedgeford
    (130,141,131,125,1.0,0.4), (131,125,145,125,1.0,0.4),          -- Hedgeford -> Elmwatch
    (155,117,160,100,1.0,0.4), (160,100,160,80,1.0,0.4),           -- Elmwatch north
    (160,80,150,36,1.0,0.4), (150,36,149,34,1.0,0.4),              -- ... to Frost Lodge
    (205,101,160,80,1.0,0.4),                                       -- Snowmelt -> mountain trail
    (205,115,210,143,1.0,0.4),                                      -- Snowmelt -> west highway
    (215,108,240,106,1.0,0.4), (240,106,262,105,1.0,0.4),          -- Snowmelt -> cave trail
    (75,122,60,100,1.0,0.4), (60,100,40,80,1.0,0.4),               -- Riverbend -> Frost Outpost
    (40,80,24,60,1.0,0.4), (24,60,22,54,1.0,0.4),
    (64,131,48,126,1.0,0.4), (48,126,31,121,1.0,0.4),              -- Riverbend -> Westwatch Burrow
    (75,140,90,175,1.0,0.4), (90,175,113,192,1.0,0.4),             -- Riverbend -> Bayview
    (122,185,130,159,1.0,0.4),                                      -- Bayview -> Hedgeford
    (131,192,160,196,1.0,0.4), (160,196,196,192,1.0,0.4), (196,192,236,190,1.0,0.4),  -- Bayview -> Wheatfield
    (43,215,80,203,1.0,0.4), (80,203,113,192,1.0,0.4),             -- Driftwood -> Bayview
    (245,197,268,215,1.0,0.4), (268,215,272,240,1.0,0.4),           -- Wheatfield -> south shore (east of the lake)
    (348,123,344,130,1.0,0.4),                                      -- Emberstone Hollow trail
    (380,68,380,129,1.0,0.4);                                       -- Highridge -> causeway

-- Snow towns, snow-road network and the lake-island bridge
INSERT INTO road_segments VALUES
    (31,48,50,40,1.0,0.4), (50,40,70,30,1.0,0.4),                  -- Frost Outpost -> Glacier Hollow
    (90,30,120,28,1.0,0.4), (120,28,144,30,1.0,0.4),               -- Glacier Hollow -> Frost Lodge
    (153,30,189,26,1.0,0.4),                                        -- Frost Lodge -> Northwind
    (211,26,290,24,1.0,0.4),                                        -- Northwind -> Frostpeak Village
    (310,24,381,24,1.0,0.4),                                        -- Frostpeak Village -> Whiteout
    (80,37,70,70,1.0,0.4), (70,70,60,100,1.0,0.4),                 -- Glacier Hollow -> south
    (200,34,185,60,1.0,0.4), (185,60,160,80,1.0,0.4),              -- Northwind -> south
    (300,31,308,55,1.0,0.4), (308,55,308,74,1.0,0.4), (308,74,292,73,1.0,0.4),  -- Frostpeak Village -> cavern
    (390,30,380,55,1.0,0.4),                                        -- Whiteout -> Highridge
    (208,191,208,223,1.0,0.3);                                      -- bridge to the lake island

-- Piers (walkable over the water)
INSERT INTO road_segments VALUES
    (374,165,404,165,1.0,0.3),   -- Pine Hollow pier
    (122,199,118,226,1.0,0.3),   -- Bayview pier
    (35,221,35,240,1.0,0.3),     -- Driftwood pier
    (272,240,272,258,1.0,0.3),   -- South shore pier
    (212,231,226,231,1.0,0.2);   -- Lake island fishing dock

UPDATE poke.map_tiles mt
SET terrain = 'path',
    is_walkable = true
FROM (
    SELECT DISTINCT gx AS px, gy AS py
    FROM road_segments s
    CROSS JOIN LATERAL generate_series(least(s.x1, s.x2) - 3, greatest(s.x1, s.x2) + 3) AS gx
    CROSS JOIN LATERAL generate_series(least(s.y1, s.y2) - 3, greatest(s.y1, s.y2) + 3) AS gy
    WHERE pg_temp.seg_dist(gx, gy, s.x1, s.y1, s.x2, s.y2)
          <= s.halfw + s.wob * sin(gx * 0.37 + gy * 0.29)
) p
WHERE mt.x = p.px
  AND mt.y = p.py
  AND mt.terrain NOT IN ('wall', 'building', 'cave');

-- =====================================================================
-- 4. NPCs (66 across every biome) + WALKABLE CLEARANCE (3x3 around each)
--    The npc_spots list is the single place to edit NPC positions.
--    If you have an NPC table, insert from npc_spots into it.
-- =====================================================================
CREATE TEMP TABLE npc_spots (name text, role text, x int, y int) ON COMMIT DROP;

INSERT INTO npc_spots (name, role, x, y) VALUES
    -- Snow & mountains
    ('Frost Outpost Keeper',  'Hamlet NPC',        22,  48),
    ('Lodge Innkeeper',       'Frost Lodge',      149,  34),
    ('Rock Climber',          'Mountain trainer',  36, 100),
    ('Avalanche Scout',       'Snow trainer',     120,  60),
    ('Snow Wanderer',         'Snow trainer',      45,  25),
    ('Blizzard Trainer',      'Snow trainer',     250,  30),
    ('Peak Watcher',          'Mountain trainer', 330,  60),
    ('Snow Ranger',           'Snow trainer',     395,  35),
    ('Mountain Guide',        'Mountain trainer', 200,  70),
    ('Rock Collector',        'Mountain trainer', 240,  75),
    ('River Guide',           'Mountain trainer', 280,  95),
    ('Cave Guard',            'Frostpeak entrance', 289, 76),
    ('Cave Hermit',           'Frostpeak Cavern', 291,  64),
    ('Highridge Keeper',      'Hamlet NPC',       380,  62),
    -- City
    ('Nurse Joy',             'Healer',           260, 134),
    ('Gym Leader',            'Gym',              260, 150),
    ('Town Elder',            'Plaza',            260, 142),
    ('North Gate Guard',      'Guard',            260, 120),
    ('South Gate Guard',      'Guard',            260, 164),
    ('Merchant',              'Trader',           244, 142),
    ('Collector',             'Trader',           276, 142),
    ('Street Musician',       'Ring road',        250, 127),
    -- Northern & central plains
    ('Snowmelt Mayor',        'Hamlet NPC',       205, 108),
    ('Elmwatch Elder',        'Hamlet NPC',       155, 125),
    ('Forest Ranger',         'Trail',            160,  95),
    ('Bug Catcher',           'Trainer',          215, 125),
    ('Traveler',              'Road',             210, 143),
    ('Angler',                'Fisher (pond)',    205, 162),
    ('Ranger',                'Trainer',          300, 150),
    ('Pond Fisherman',        'Fisher (pond)',    318, 158),
    -- West
    ('Riverbend Mayor',       'Hamlet NPC',        75, 131),
    ('Herb Gatherer',         'Trail',             66, 108),
    ('Burrow Hermit',         'Westwatch Burrow',  26, 121),
    ('Forest Ranger West',    'Trainer',           56, 160),
    ('Berry Picker',          'Forest',            30, 175),
    ('Hiker',                 'Trail',             92, 170),
    ('Bridge Keeper',         'Bridge',            97, 136),
    ('Hedgeford Mayor',       'Hamlet NPC',       130, 150),
    ('Shell Collector',       'Coast',             12, 200),
    -- South-west bay
    ('Harbor Master',         'Bayview',          122, 192),
    ('Pier Fisherman',        'Fisher (bay)',     118, 224),
    ('Beachcomber',           'Coast',             95, 208),
    ('Driftwood Mayor',       'Hamlet NPC',        35, 215),
    ('Driftwood Fisherman',   'Fisher (pier)',     35, 238),
    ('Swimmer',               'Beach',             62, 216),
    ('Surf Instructor',       'Coast',            148, 224),
    ('Picnicker',             'Trainer',          160, 208),
    -- South & farms
    ('Farmer West',           'Farm',             200, 186),
    ('Wheatfield Mayor',      'Hamlet NPC',       245, 190),
    ('Farmer East',           'Farm',             284, 185),
    ('Farm Hand',             'Farm',             270, 180),
    ('Camper',                'Trainer',          160, 214),
    ('Shore Beachcomber',     'Coast',            272, 246),
    ('Shore Fisherman',       'Fisher (pier)',    272, 258),
    ('Lighthouse Keeper',     'Coast',            290, 236),
    -- East & south-east
    ('Cave Researcher',       'Emberstone Hollow',353, 123),
    ('Cave Mouth Miner',      'Emberstone entrance',348,123),
    ('Mine Foreman',          'South Mine entrance',329,207),
    ('Miner',                 'South Mine',       329, 212),
    ('Pine Hollow Mayor',     'Hamlet NPC',       365, 165),
    ('Pier Fisherman East',   'Fisher (pier)',    404, 165),
    ('Causeway Guard',        'Guard',            390, 130),
    ('Fortress Gate Guard',   'Guard',            427, 130),
    ('Fortress Lord',         'Boss',             448, 134),
    ('Island Hermit',         'Island',           448, 106),
    ('NE Island Castaway',    'Hidden island',    478,  26),
    ('SE Island Castaway',    'Hidden island',    484, 198),
    -- Snow towns
    ('Glacier Hollow Mayor',  'Hamlet NPC',        80,  30),
    ('Northwind Mayor',       'Hamlet NPC',       200,  26),
    ('Frostpeak Mayor',       'Hamlet NPC',       300,  24),
    ('Whiteout Mayor',        'Hamlet NPC',       390,  24),
    ('Sled Courier',          'Snow road',        105,  29),
    ('Yeti Hunter',           'Snow trainer',     250,  25),
    ('Skier',                 'Snow trainer',     340,  24),
    -- Big lake + fishing island
    ('Lake Hermit',           'Lake house',       208, 231),
    ('Dock Fisherman',        'Fisher (lake dock)',226, 231),
    ('Lakeshore Camper',      'Trainer',          170, 205);

-- Make sure every NPC and the 1-tile ring around it is walkable
UPDATE poke.map_tiles mt
SET is_walkable = true,
    terrain = CASE mt.terrain
        WHEN 'tree'       THEN 'grass'::poke.terrain
        WHEN 'water'      THEN 'sand'::poke.terrain
        WHEN 'deep water' THEN 'sand'::poke.terrain
        WHEN 'wall'       THEN 'path'::poke.terrain
        ELSE mt.terrain
    END
FROM npc_spots n
WHERE mt.x BETWEEN n.x - 1 AND n.x + 1
  AND mt.y BETWEEN n.y - 1 AND n.y + 1;

-- =====================================================================
-- 5. SANITY CHECK
-- =====================================================================
DO $$
DECLARE
    total int;
    blocked_npcs int;
BEGIN
    SELECT count(*) INTO total
    FROM poke.map_tiles WHERE x BETWEEN 0 AND 499 AND y BETWEEN 0 AND 299;

    SELECT count(*) INTO blocked_npcs
    FROM npc_spots n
    JOIN poke.map_tiles mt ON mt.x = n.x AND mt.y = n.y
    WHERE NOT mt.is_walkable;

    RAISE NOTICE 'Map tiles written: % (expected 150000)', total;
    RAISE NOTICE 'NPCs standing on blocked tiles: % (expected 0)', blocked_npcs;
END $$;

COMMIT;