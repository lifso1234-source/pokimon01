export type CreatureType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export type MoveCategory = 'physical' | 'special' | 'status';
export type StatusCondition = 'none' | 'burn' | 'freeze' | 'paralysis' | 'poison' | 'sleep';
export type ItemCategory = 'ball' | 'medicine' | 'battle' | 'held' | 'tm' | 'key' | 'misc';
export type Terrain = 'grass' | 'water' | 'sand' | 'cave' | 'path' | 'wall' | 'building' |'tree' | 'snow'| 'wheat' | 'mountain' | 'deep water';
export type NpcRole = 'trainer' | 'shopkeeper' | 'healer' | 'generic';
export type NpcFacing = 'up' | 'down' | 'left' | 'right';
export type BattleKind = 'wild' | 'npc';
export type BattleStatus = 'active' | 'won' | 'lost' | 'fled' | 'caught';
export type CatchOutcome = 'caught' | 'missed';
export type MissReason = 'broke_free' | 'fled' | 'knocked_out' | 'player_ran';

export const CREATURE_TYPES: CreatureType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];
export const MOVE_CATEGORIES: MoveCategory[] = ['physical', 'special', 'status'];
export const STATUS_CONDITIONS: StatusCondition[] = ['none', 'burn', 'freeze', 'paralysis', 'poison', 'sleep'];
export const ITEM_CATEGORIES: ItemCategory[] = ['ball', 'medicine', 'battle', 'held', 'tm', 'key', 'misc'];
export const TERRAINS: Terrain[] = ['grass', 'water', 'sand', 'cave', 'path', 'wall', 'building'];
export const NPC_ROLES: NpcRole[] = ['trainer', 'shopkeeper', 'healer', 'generic'];
export const BATTLE_KINDS: BattleKind[] = ['wild', 'npc'];
export const BATTLE_STATUSES: BattleStatus[] = ['active', 'won', 'lost', 'fled', 'caught'];
export const CATCH_OUTCOMES: CatchOutcome[] = ['caught', 'missed'];
