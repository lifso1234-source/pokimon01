import { axiosClient } from "./axiosClient";
import type {
  Battle,
  EncounterRule,
  Item,
  MapTile,
  Move,
  Npc,
  PlayerState,
  Species,
} from "../types/game.types";

type ListResponse<T> = T[] | { data: T[] };
const listData = <T>(value: ListResponse<T> | null | undefined): T[] =>
  Array.isArray(value) ? value : (value?.data ?? []);

export const gameApi = {
  login: async (login: string, password: string): Promise<PlayerState> =>
    (await axiosClient.post<PlayerState>("/auth/login", { login, password }))
      .data,
  register: async (payload: {
    email: string;
    username: string;
    password: string;
    trainerName: string;
    starterSpeciesId?: number;
  }): Promise<PlayerState> =>
    (await axiosClient.post<PlayerState>("/auth/register", payload)).data,
  listPlayers: async (limit = 50): Promise<PlayerState[]> =>
    listData(
      (
        await axiosClient.get<ListResponse<PlayerState>>("/players", {
          params: { limit },
        })
      ).data,
    ),
  getPlayerState: async (id: string): Promise<PlayerState> =>
    (await axiosClient.get<PlayerState>(`/players/${id}/state`)).data,
  movePlayer: async (id: string, position: { x: number; y: number }) =>
    (await axiosClient.post(`/players/${id}/move`, position)).data,
  healParty: async (id: string) =>
    (await axiosClient.post(`/players/${id}/heal`)).data,
  useItem: async (
    playerId: string,
    payload: { itemId: number; creatureId: string },
  ) =>
    (await axiosClient.post(`/players/${playerId}/inventory/use`, payload))
      .data,
  setHotbarSlot: async (playerId: string, slot: number, itemId: number) =>
    (await axiosClient.put(`/players/${playerId}/hotbar/${slot}`, { itemId }))
      .data,
  clearHotbarSlot: async (playerId: string, slot: number) =>
    (await axiosClient.delete(`/players/${playerId}/hotbar/${slot}`)).data,
  listTiles: async (): Promise<MapTile[]> =>
    (
      await axiosClient.get<MapTile[]>("/map/tiles", {
        params: { limit: 50000 },
      })
    ).data,

  listNpcs: async (): Promise<Npc[]> =>
    listData(
      (
        await axiosClient.get<ListResponse<Npc>>("/npcs", {
          params: { limit: 100 },
        })
      ).data,
    ),

  listEncounters: async (): Promise<EncounterRule[]> =>
    listData(
      (
        await axiosClient.get<ListResponse<EncounterRule>>("/encounters", {
          params: { limit: 100 },
        })
      ).data,
    ),
  listSpecies: async (): Promise<Species[]> =>
    listData(
      (
        await axiosClient.get<ListResponse<Species>>("/species", {
          params: { limit: 200 },
        })
      ).data,
    ),
  listItems: async (): Promise<Item[]> =>
    listData(
      (
        await axiosClient.get<ListResponse<Item>>("/items", {
          params: { limit: 200 },
        })
      ).data,
    ),
  listMoves: async (): Promise<Move[]> =>
    listData(
      (
        await axiosClient.get<ListResponse<Move>>("/moves", {
          params: { limit: 200 },
        })
      ).data,
    ),
  getNpcShop: async (npcId: number) =>
    (await axiosClient.get(`/npcs/${npcId}/shop`)).data,
  buyFromNpc: async (
    npcId: number,
    playerId: string,
    itemId: number,
    quantity = 1,
  ) =>
    (
      await axiosClient.post(`/npcs/${npcId}/shop/buy`, {
        playerId,
        itemId,
        quantity,
      })
    ).data,
  sellToNpc: async (
    npcId: number,
    playerId: string,
    itemId: number,
    quantity = 1,
  ) =>
    (
      await axiosClient.post(`/npcs/${npcId}/shop/sell`, {
        playerId,
        itemId,
        quantity,
      })
    ).data,
  updateCreature: async (
    id: string,
    payload: {
      nickname?: string | null;
      partySlot?: number | null;
      storageSlot?: number | null;
    },
  ) => (await axiosClient.patch(`/creatures/${id}`, payload)).data,
  getActiveBattle: async (playerId: string): Promise<Battle | null> =>
    (await axiosClient.get<Battle | null>(`/battles/active/${playerId}`)).data,
  startWildBattle: async (payload: {
    playerId: string;
    speciesId?: number;
    level?: number;
  }): Promise<Battle> =>
    (await axiosClient.post<Battle>("/battles/wild", payload)).data,
  startNpcBattle: async (payload: {
    playerId: string;
    npcId: number;
  }): Promise<Battle> =>
    (await axiosClient.post<Battle>("/battles/npc", payload)).data,
  battleAttack: async (battleId: string, moveId: number) =>
    (await axiosClient.post(`/battles/${battleId}/turn/attack`, { moveId }))
      .data as { battle: Battle; log: string[] },
  battleSwitch: async (
    battleId: string,
    partyPosition: number,
  ): Promise<Battle> =>
    (
      await axiosClient.post<Battle>(`/battles/${battleId}/turn/switch`, {
        partyPosition,
      })
    ).data,
  battleUseItem: async (
    battleId: string,
    payload: { itemId: number; targetPartyPosition?: number },
  ) =>
    (await axiosClient.post(`/battles/${battleId}/turn/item`, payload))
      .data as {
      battle: Battle;
      caught?: boolean;
      healed?: boolean;
      message?: string;
    },
  battleFlee: async (battleId: string): Promise<Battle> =>
    (await axiosClient.post<Battle>(`/battles/${battleId}/turn/flee`)).data,
};
