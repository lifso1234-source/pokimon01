-- =====================================================================
-- Creature-catching RPG : simplified PostgreSQL schema (PG 13+)
-- Schema: poke
-- One 2D tile map, wild encounters, NPC trainers, party + storage,
-- inventory + hotbar, catch history, turn-based battles.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
DROP SCHEMA if exists poke CASCADE;
CREATE SCHEMA poke;
SET LOCAL search_path TO poke, public;

-- ---------- enums ----------
CREATE TYPE poke.creature_type    AS ENUM ('normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy');
CREATE TYPE poke.move_category    AS ENUM ('physical','special','status');
CREATE TYPE poke.status_condition AS ENUM ('none','burn','freeze','paralysis','poison','sleep');
CREATE TYPE poke.item_category    AS ENUM ('ball','medicine','battle','held','tm','key','misc');
CREATE TYPE poke.terrain          AS ENUM ('grass','water','sand','cave','path','wall','building', 'tree', 'snow', 'wheat', 'mountain','deep water');
CREATE TYPE poke.npc_role         AS ENUM ('trainer','shopkeeper','healer','generic');
CREATE TYPE poke.battle_kind      AS ENUM ('wild','npc');
CREATE TYPE poke.battle_status    AS ENUM ('active','won','lost','fled','caught');
CREATE TYPE poke.catch_outcome    AS ENUM ('caught','missed');

-- =====================================================================
-- 1. REFERENCE DATA (the game's content)
-- =====================================================================
CREATE TABLE poke.type_effectiveness (
  attacking  poke.creature_type NOT NULL,
  defending  poke.creature_type NOT NULL,
  multiplier numeric(3,2)       NOT NULL CHECK (multiplier IN (0, 0.5, 1, 2)),
  PRIMARY KEY (attacking, defending)
);

CREATE TABLE poke.species (
  id              int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  dex_number      int NOT NULL UNIQUE,
  name            text NOT NULL UNIQUE,
  type1           poke.creature_type NOT NULL,
  type2           poke.creature_type,
  base_hp         smallint NOT NULL CHECK (base_hp BETWEEN 1 AND 255),
  base_attack     smallint NOT NULL CHECK (base_attack BETWEEN 1 AND 255),
  base_defense    smallint NOT NULL CHECK (base_defense BETWEEN 1 AND 255),
  base_sp_attack  smallint NOT NULL CHECK (base_sp_attack BETWEEN 1 AND 255),
  base_sp_defense smallint NOT NULL CHECK (base_sp_defense BETWEEN 1 AND 255),
  base_speed      smallint NOT NULL CHECK (base_speed BETWEEN 1 AND 255),
  catch_rate      smallint NOT NULL DEFAULT 45 CHECK (catch_rate BETWEEN 1 AND 255),
  base_exp_yield  smallint NOT NULL DEFAULT 64,
  sprite_url      text,
  CHECK (type2 IS NULL OR type2 <> type1)
);

CREATE TABLE poke.moves (
  id         int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name       text NOT NULL UNIQUE,
  type       poke.creature_type NOT NULL,
  category   poke.move_category NOT NULL,
  power      smallint CHECK (power BETWEEN 0 AND 250),
  accuracy   smallint CHECK (accuracy BETWEEN 1 AND 100),     -- NULL = never misses
  max_pp     smallint NOT NULL CHECK (max_pp BETWEEN 1 AND 64),
  effect     jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Which moves a species learns, and at what level
CREATE TABLE poke.species_moves (
  species_id int NOT NULL REFERENCES poke.species(id) ON DELETE CASCADE,
  move_id    int NOT NULL REFERENCES poke.moves(id),
  level      smallint NOT NULL CHECK (level BETWEEN 1 AND 100),
  PRIMARY KEY (species_id, move_id)
);

CREATE TABLE poke.items (
  id              int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name            text NOT NULL UNIQUE,
  category        poke.item_category NOT NULL,
  description     text NOT NULL DEFAULT '',
  buy_price       int CHECK (buy_price >= 0),                   -- NULL = not sold
  sell_price      int CHECK (sell_price >= 0),
  effect          jsonb NOT NULL DEFAULT '{}'::jsonb,           -- {"heal_hp":20} / {"catch_multiplier":1.5}
  teaches_move_id int REFERENCES poke.moves(id),                -- for TMs
  icon_url        text
);

CREATE TABLE poke.evolutions (
  from_species_id int NOT NULL REFERENCES poke.species(id) ON DELETE CASCADE,
  to_species_id   int NOT NULL REFERENCES poke.species(id) ON DELETE CASCADE,
  min_level       smallint CHECK (min_level BETWEEN 1 AND 100),
  item_id         int REFERENCES poke.items(id),
  PRIMARY KEY (from_species_id, to_species_id),
  CHECK (from_species_id <> to_species_id),
  CHECK (min_level IS NOT NULL OR item_id IS NOT NULL)
);

-- =====================================================================
-- 2. THE MAP: one 2D grid. Only tiles that exist are part of the map,
--    so it can have any shape (islands, corridors, holes...).
-- =====================================================================
CREATE TABLE poke.map_tiles (
  x           int NOT NULL,
  y           int NOT NULL,
  terrain     poke.terrain NOT NULL,
  is_walkable boolean NOT NULL DEFAULT true,
  PRIMARY KEY (x, y)
);

-- Wild spawns: what can appear when stepping on a given terrain
CREATE TABLE poke.encounters (
  id         int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  terrain    poke.terrain NOT NULL,
  species_id int NOT NULL REFERENCES poke.species(id),
  min_level  smallint NOT NULL CHECK (min_level BETWEEN 1 AND 100),
  max_level  smallint NOT NULL CHECK (max_level BETWEEN 1 AND 100),
  weight     smallint NOT NULL DEFAULT 10 CHECK (weight > 0),   -- relative spawn chance
  CHECK (min_level <= max_level)
);

-- =====================================================================
-- 3. NPCs
-- =====================================================================
CREATE TABLE poke.npcs (
  id           int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name         text NOT NULL,
  role         poke.npc_role NOT NULL DEFAULT 'generic',
  sprite_url   text,
  -- Fixed position is OPTIONAL: both NULL = no fixed spot (roaming / event-spawned)
  pos_x        int,
  pos_y        int,
  facing       text NOT NULL DEFAULT 'down' CHECK (facing IN ('up','down','left','right')),
  sight_range  smallint NOT NULL DEFAULT 0 CHECK (sight_range >= 0),   -- trainer line of sight
  dialogue     jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_money int NOT NULL DEFAULT 0 CHECK (reward_money >= 0),
  can_rebattle boolean NOT NULL DEFAULT false,
  CHECK ((pos_x IS NULL) = (pos_y IS NULL)),
  FOREIGN KEY (pos_x, pos_y) REFERENCES poke.map_tiles(x, y)          -- skipped when NULL
);
CREATE UNIQUE INDEX uq_npcs_tile ON poke.npcs (pos_x, pos_y) WHERE pos_x IS NOT NULL;

-- A trainer's team (moves come from species_moves by level)
CREATE TABLE poke.npc_party (
  npc_id     int NOT NULL REFERENCES poke.npcs(id) ON DELETE CASCADE,
  slot       smallint NOT NULL CHECK (slot BETWEEN 1 AND 6),
  species_id int NOT NULL REFERENCES poke.species(id),
  level      smallint NOT NULL CHECK (level BETWEEN 1 AND 100),
  PRIMARY KEY (npc_id, slot)
);

CREATE TABLE poke.npc_shop_items (
  npc_id  int NOT NULL REFERENCES poke.npcs(id) ON DELETE CASCADE,
  item_id int NOT NULL REFERENCES poke.items(id),
  price   int NOT NULL CHECK (price >= 0),
  PRIMARY KEY (npc_id, item_id)
);

-- =====================================================================
-- 4. PLAYERS
-- =====================================================================
CREATE TABLE poke.players (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         public.citext NOT NULL UNIQUE,
  username      public.citext NOT NULL UNIQUE CHECK (length(username) BETWEEN 3 AND 24),
  password_hash text NOT NULL,
  trainer_name  text NOT NULL,
  money         bigint NOT NULL DEFAULT 3000 CHECK (money >= 0),
  pos_x         int NOT NULL,
  pos_y         int NOT NULL,
  respawn_x     int,                                   -- last healer, used after whiteout
  respawn_y     int,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CHECK ((respawn_x IS NULL) = (respawn_y IS NULL)),
  FOREIGN KEY (pos_x, pos_y)         REFERENCES poke.map_tiles(x, y),
  FOREIGN KEY (respawn_x, respawn_y) REFERENCES poke.map_tiles(x, y)
);

CREATE TABLE poke.player_npc_defeats (
  player_id        uuid NOT NULL REFERENCES poke.players(id) ON DELETE CASCADE,
  npc_id           int  NOT NULL REFERENCES poke.npcs(id) ON DELETE CASCADE,
  times_defeated   int NOT NULL DEFAULT 1 CHECK (times_defeated > 0),
  last_defeated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, npc_id)
);

-- =====================================================================
-- 5. CREATURES: party (6 slots) + unlimited PC storage
-- =====================================================================
CREATE TABLE poke.creatures (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES poke.players(id) ON DELETE CASCADE,
  species_id   int  NOT NULL REFERENCES poke.species(id),
  nickname     text CHECK (length(nickname) <= 20),
  level        smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 100),
  experience   bigint   NOT NULL DEFAULT 0 CHECK (experience >= 0),
  current_hp   int      NOT NULL CHECK (current_hp >= 0),
  status       poke.status_condition NOT NULL DEFAULT 'none',
  party_slot   smallint CHECK (party_slot BETWEEN 1 AND 6),     -- in party...
  storage_slot int      CHECK (storage_slot >= 1),              -- ...or in PC storage
  caught_at    timestamptz NOT NULL DEFAULT now(),
  released_at  timestamptz,                                     -- soft delete
  CHECK (
    released_at IS NOT NULL
    OR (party_slot IS NOT NULL AND storage_slot IS NULL)
    OR (party_slot IS NULL AND storage_slot IS NOT NULL)
  )
);
CREATE UNIQUE INDEX uq_creature_party   ON poke.creatures (owner_id, party_slot)   WHERE party_slot IS NOT NULL   AND released_at IS NULL;
CREATE UNIQUE INDEX uq_creature_storage ON poke.creatures (owner_id, storage_slot) WHERE storage_slot IS NOT NULL AND released_at IS NULL;

CREATE TABLE poke.creature_moves (
  creature_id uuid NOT NULL REFERENCES poke.creatures(id) ON DELETE CASCADE,
  slot        smallint NOT NULL CHECK (slot BETWEEN 1 AND 4),
  move_id     int NOT NULL REFERENCES poke.moves(id),
  current_pp  smallint NOT NULL CHECK (current_pp >= 0),
  PRIMARY KEY (creature_id, slot),
  UNIQUE (creature_id, move_id)
);

-- =====================================================================
-- 6. INVENTORY + HOTBAR (slots bar)
-- =====================================================================
CREATE TABLE poke.inventory (
  player_id uuid NOT NULL REFERENCES poke.players(id) ON DELETE CASCADE,
  item_id   int  NOT NULL REFERENCES poke.items(id),
  quantity  int  NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (player_id, item_id)
);

-- Slots 1-9; can only hold an item the player owns. When the stack hits 0 and the
-- inventory row is deleted, the slot clears itself.
CREATE TABLE poke.hotbar_slots (
  player_id uuid NOT NULL,
  slot      smallint NOT NULL CHECK (slot BETWEEN 1 AND 9),
  item_id   int NOT NULL,
  PRIMARY KEY (player_id, slot),
  UNIQUE (player_id, item_id),
  FOREIGN KEY (player_id, item_id) REFERENCES poke.inventory(player_id, item_id) ON DELETE CASCADE
);

-- =====================================================================
-- 7. BATTLES (player vs wild creature, or player vs NPC trainer)
-- =====================================================================
CREATE TABLE poke.battles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES poke.players(id) ON DELETE CASCADE,
  kind        poke.battle_kind NOT NULL,
  npc_id      int REFERENCES poke.npcs(id),            -- set for NPC battles only
  status      poke.battle_status NOT NULL DEFAULT 'active',
  turn_number int NOT NULL DEFAULT 0,
  pos_x       int,
  pos_y       int,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  CHECK ((kind = 'npc') = (npc_id IS NOT NULL)),
  CHECK (status = 'active' OR ended_at IS NOT NULL)
);

-- Snapshot of every fighter. side 1 = player, side 2 = opponent (wild or NPC).
-- creature_id is NULL for opponents; the real creature is updated when the battle ends.
CREATE TABLE poke.battle_creatures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id      uuid NOT NULL REFERENCES poke.battles(id) ON DELETE CASCADE,
  side           smallint NOT NULL CHECK (side IN (1, 2)),
  party_position smallint NOT NULL CHECK (party_position BETWEEN 1 AND 6),
  creature_id    uuid REFERENCES poke.creatures(id) ON DELETE SET NULL,
  species_id     int NOT NULL REFERENCES poke.species(id),
  level          smallint NOT NULL CHECK (level BETWEEN 1 AND 100),
  is_active      boolean NOT NULL DEFAULT false,
  max_hp         int NOT NULL CHECK (max_hp > 0),
  current_hp     int NOT NULL CHECK (current_hp >= 0),
  status         poke.status_condition NOT NULL DEFAULT 'none',
  stat_stages    jsonb NOT NULL DEFAULT '{}'::jsonb,
  moves          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{"move_id":1,"pp":25}]
  UNIQUE (battle_id, side, party_position)
);

-- =====================================================================
-- 8. CATCH HISTORY: every wild encounter that ended, caught or missed
-- =====================================================================
CREATE TABLE poke.catch_history (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  player_id    uuid NOT NULL REFERENCES poke.players(id) ON DELETE CASCADE,
  species_id   int  NOT NULL REFERENCES poke.species(id),
  wild_level   smallint NOT NULL CHECK (wild_level BETWEEN 1 AND 100),
  outcome      poke.catch_outcome NOT NULL,
  miss_reason  text CHECK (miss_reason IN ('broke_free','fled','knocked_out','player_ran')),
  balls_thrown smallint NOT NULL DEFAULT 0 CHECK (balls_thrown >= 0),
  ball_item_id int REFERENCES poke.items(id),
  creature_id  uuid REFERENCES poke.creatures(id) ON DELETE SET NULL,   -- set when caught
  battle_id    uuid REFERENCES poke.battles(id) ON DELETE SET NULL,
  pos_x        int,
  pos_y        int,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (outcome = 'caught' OR creature_id IS NULL),
  CHECK (outcome = 'missed' OR miss_reason IS NULL)
);

-- Per-player totals per species (also works as the Pokedex: seen / caught)
CREATE VIEW poke.player_catch_stats AS
SELECT player_id, species_id,
       count(*) FILTER (WHERE outcome = 'caught') AS times_caught,
       count(*) FILTER (WHERE outcome = 'missed') AS times_missed,
       count(*)                                   AS encounters,
       min(created_at)                            AS first_seen_at
FROM poke.catch_history
GROUP BY player_id, species_id;

-- =====================================================================
-- 9. INDEXES
-- =====================================================================
CREATE INDEX idx_encounters_terrain   ON poke.encounters (terrain);
CREATE INDEX idx_creatures_owner      ON poke.creatures (owner_id) WHERE released_at IS NULL;
CREATE INDEX idx_battles_active       ON poke.battles (player_id) WHERE status = 'active';
CREATE INDEX idx_battle_creatures     ON poke.battle_creatures (battle_id);
CREATE INDEX idx_catch_history_player ON poke.catch_history (player_id, species_id);

ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'tree';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'snow';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'wheat';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'mountain';
ALTER TYPE poke.terrain ADD VALUE IF NOT EXISTS 'deep water';