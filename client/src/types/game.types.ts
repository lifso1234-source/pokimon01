export type Terrain =
  | "grass"
  | "water"
  | "sand"
  | "cave"
  | "path"
  | "wall"
  | "building"
  | "tree"
  | "snow"
  | "wheat"
  | "mountain"
  | "deep water";
export type NpcRole = "trainer" | "shopkeeper" | "healer" | "generic";
export type BattleKind = "wild" | "npc";
export type BattleStatus = "active" | "won" | "lost" | "fled" | "caught";

export interface MapTile {
  x: number;
  y: number;
  terrain: Terrain;
  isWalkable: boolean;
}

export interface Species {
  id: number;
  dexNumber: number;
  name: string;
  type1: string;
  type2: string | null;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpAttack: number;
  baseSpDefense: number;
  baseSpeed: number;
  catchRate: number;
  spriteUrl: string | null;
}

export interface Move {
  id: number;
  name: string;
  type: string;
  category: "physical" | "special" | "status";
  power: number | null;
  accuracy: number | null;
  maxPp: number;
}

export interface CreatureMove {
  creatureId: string;
  slot: number;
  moveId: number;
  currentPp: number;
  move?: Move;
}

export interface Creature {
  id: string;
  ownerId: string;
  speciesId: number;
  nickname: string | null;
  level: number;
  experience: number;
  currentHp: number;
  status: string;
  partySlot: number | null;
  storageSlot: number | null;
  releasedAt: string | null;
  species?: Species;
  moves?: CreatureMove[];
}

export interface Item {
  id: number;
  name: string;
  category: "ball" | "medicine" | "battle" | "held" | "tm" | "key" | "misc";
  description: string;
  buyPrice: number | null;
  sellPrice: number | null;
  effect: Record<string, unknown>;
  iconUrl: string | null;
}

export interface InventoryEntry {
  playerId: string;
  itemId: number;
  quantity: number;
  item?: Item;
}

export interface HotbarEntry {
  playerId: string;
  slot: number;
  itemId: number;
  item?: Item;
}

export interface NpcPartyMember {
  npcId: number;
  slot: number;
  speciesId: number;
  level: number;
  species?: Species;
}

export interface NpcShopItem {
  npcId: number;
  itemId: number;
  price: number;
  item?: Item;
}

export interface Npc {
  id: number;
  name: string;
  role: NpcRole;
  spriteUrl: string | null;
  posX: number | null;
  posY: number | null;
  facing: "up" | "down" | "left" | "right";
  sightRange: number;
  dialogue: Record<string, unknown>;
  rewardMoney: number;
  canRebattle: boolean;
  party?: NpcPartyMember[];
  shopItems?: NpcShopItem[];
}

export interface PlayerState {
  id: string;
  email: string;
  username: string;
  trainerName: string;
  money: number;
  posX: number;
  posY: number;
  respawnX: number | null;
  respawnY: number | null;
  creatures: Creature[];
  inventory: InventoryEntry[];
  hotbarSlots: HotbarEntry[];
}

export interface EncounterRule {
  id: number;
  terrain: Terrain;
  speciesId: number;
  minLevel: number;
  maxLevel: number;
  weight: number;
  species?: Species;
}

export interface BattleCreature {
  id: string;
  battleId: string;
  side: 1 | 2;
  partyPosition: number;
  creatureId: string | null;
  speciesId: number;
  level: number;
  isActive: boolean;
  maxHp: number;
  currentHp: number;
  status: string;
  moves: Array<{ move_id: number; pp: number }>;
  species?: Species;
}

export interface Battle {
  id: string;
  playerId: string;
  kind: BattleKind;
  npcId: number | null;
  status: BattleStatus;
  turnNumber: number;
  posX: number | null;
  posY: number | null;
  npc?: Npc | null;
  creatures: BattleCreature[];
}

export interface PokedexStat {
  playerId: string;
  speciesId: number;
  timesCaught: number;
  timesMissed: number;
  encounters: number;
  firstSeenAt: string;
}

export interface WildSpawn {
  uid: string;
  speciesId: number;
  speciesName: string;
  type1: string;
  level: number;
  x: number;
  y: number;
  expiresAt: number;
}
