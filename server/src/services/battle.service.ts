import { EntityManager, IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import {
  Battle,
  BattleCreature,
  CatchHistory,
  Creature,
  CreatureMove,
  Encounter,
  Inventory,
  MapTile,
  Move,
  Npc,
  Player,
  PlayerNpcDefeat,
  Species,
  SpeciesMove,
  TypeEffectiveness,
} from "../entity";
import { AppError } from "../utils/AppError";
import {
  BattleAttackDto,
  BattleItemDto,
  BattleSwitchDto,
  StartNpcBattleDto,
  StartWildBattleDto,
} from "../validators/battle.validators";
import { calcMaxHp } from "./player.service";

/** Load a battle through the current transaction so uncommitted changes are visible. */
async function getBattleByIdWithManager(manager: EntityManager, id: string) {
  const battle = await manager.findOne(Battle, {
    where: { id },
    relations: { creatures: { species: true }, npc: true },
  });
  if (!battle) throw new AppError(404, "NOT_FOUND", "Battle not found");
  return battle;
}

export const battleService = {
  async getActiveBattle(playerId: string) {
    return AppDataSource.getRepository(Battle).findOne({
      where: { playerId, status: "active" },
      relations: { creatures: { species: true }, npc: true },
    });
  },

  async getBattleById(id: string) {
    const battle = await AppDataSource.getRepository(Battle).findOne({
      where: { id },
      relations: { creatures: { species: true }, npc: true },
    });
    if (!battle) throw new AppError(404, "NOT_FOUND", "Battle not found");
    return battle;
  },

  async startWildBattle(dto: StartWildBattleDto) {
    return AppDataSource.transaction(async (manager) => {
      const existing = await manager.findOneBy(Battle, { playerId: dto.playerId, status: "active" });
      if (existing) throw new AppError(409, "BATTLE_ALREADY_ACTIVE", "Player already has an active battle");

      const player = await manager.findOneBy(Player, { id: dto.playerId });
      if (!player) throw new AppError(404, "NOT_FOUND", "Player not found");

      const party = await manager.find(Creature, {
        where: { ownerId: player.id, releasedAt: IsNull() },
        relations: { species: true, moves: { move: true } },
        order: { partySlot: "ASC" },
      });
      const healthyParty = party.filter((c) => c.partySlot !== null && c.currentHp > 0);
      if (healthyParty.length === 0) throw new AppError(400, "NO_HEALTHY_CREATURES", "No healthy creatures in party");

      let speciesId = dto.speciesId;
      let level = dto.level ?? 3;
      if (!speciesId) {
        const tile = await manager.findOneBy(MapTile, { x: player.posX, y: player.posY });
        const pool = await manager.findBy(Encounter, { terrain: tile?.terrain ?? "grass" });
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        if (!chosen) throw new AppError(400, "NO_ENCOUNTERS", "No wild encounters configured here");
        speciesId = chosen.speciesId;
        level = Math.floor(Math.random() * (chosen.maxLevel - chosen.minLevel + 1)) + chosen.minLevel;
      }

      const wildSpecies = await manager.findOneByOrFail(Species, { id: speciesId });
      const wildMoves = await manager.find(SpeciesMove, {
        where: { speciesId: wildSpecies.id },
        relations: { move: true },
        order: { level: "DESC" },
        take: 4,
      });

      const battle = manager.create(Battle, {
        playerId: player.id,
        kind: "wild",
        npcId: null,
        status: "active",
        turnNumber: 1,
        posX: player.posX,
        posY: player.posY,
      });
      await manager.save(battle);

      const playerFighters = healthyParty.map((c, idx) =>
        manager.create(BattleCreature, {
          battleId: battle.id,
          side: 1,
          partyPosition: c.partySlot!,
          creatureId: c.id,
          speciesId: c.speciesId,
          level: c.level,
          isActive: idx === 0,
          maxHp: calcMaxHp(c.species!.baseHp, c.level),
          currentHp: c.currentHp,
          status: c.status,
          moves: (c.moves ?? []).map((m) => ({ move_id: m.moveId, pp: m.currentPp })),
        }),
      );

      const wildMaxHp = calcMaxHp(wildSpecies.baseHp, level);
      const wildFighter = manager.create(BattleCreature, {
        battleId: battle.id,
        side: 2,
        partyPosition: 1,
        creatureId: null,
        speciesId: wildSpecies.id,
        level,
        isActive: true,
        maxHp: wildMaxHp,
        currentHp: wildMaxHp,
        moves: wildMoves
          .filter((sm) => sm.level <= level && sm.move)
          .map((sm) => ({ move_id: sm.moveId, pp: sm.move!.maxPp })),
      });

      await manager.save([...playerFighters, wildFighter]);
      return getBattleByIdWithManager(manager, battle.id);
    });
  },

  async startNpcBattle(dto: StartNpcBattleDto) {
    return AppDataSource.transaction(async (manager) => {
      const existing = await manager.findOneBy(Battle, { playerId: dto.playerId, status: "active" });
      if (existing) throw new AppError(409, "BATTLE_ALREADY_ACTIVE", "Player already has an active battle");

      const npc = await manager.findOne(Npc, {
        where: { id: dto.npcId },
        relations: { party: { species: true } },
      });
      if (!npc || npc.role !== "trainer" || !npc.party?.length) {
        throw new AppError(400, "INVALID_TRAINER", "NPC is not a battle trainer");
      }

      if (!npc.canRebattle) {
        const defeated = await manager.findOneBy(PlayerNpcDefeat, { playerId: dto.playerId, npcId: npc.id });
        if (defeated) throw new AppError(409, "ALREADY_DEFEATED", "Trainer has already been defeated");
      }

      const player = await manager.findOneByOrFail(Player, { id: dto.playerId });
      const party = await manager.find(Creature, {
        where: { ownerId: player.id, releasedAt: IsNull() },
        relations: { species: true, moves: { move: true } },
        order: { partySlot: "ASC" },
      });
      const healthyParty = party.filter((c) => c.partySlot !== null && c.currentHp > 0);
      if (healthyParty.length === 0) throw new AppError(400, "NO_HEALTHY_CREATURES", "No healthy creatures in party");

      const battle = manager.create(Battle, {
        playerId: player.id,
        kind: "npc",
        npcId: npc.id,
        status: "active",
        turnNumber: 1,
        posX: player.posX,
        posY: player.posY,
      });
      await manager.save(battle);

      const playerFighters = healthyParty.map((c, idx) =>
        manager.create(BattleCreature, {
          battleId: battle.id,
          side: 1,
          partyPosition: c.partySlot!,
          creatureId: c.id,
          speciesId: c.speciesId,
          level: c.level,
          isActive: idx === 0,
          maxHp: calcMaxHp(c.species!.baseHp, c.level),
          currentHp: c.currentHp,
          status: c.status,
          moves: (c.moves ?? []).map((m) => ({ move_id: m.moveId, pp: m.currentPp })),
        }),
      );

      const sortedNpcParty = [...npc.party].sort((a, b) => a.slot - b.slot);
      const npcFighters: BattleCreature[] = [];
      for (const [idx, member] of sortedNpcParty.entries()) {
        const learned = await manager.find(SpeciesMove, {
          where: { speciesId: member.speciesId },
          relations: { move: true },
          order: { level: "DESC" },
          take: 4,
        });
        const maxHp = calcMaxHp(member.species!.baseHp, member.level);
        npcFighters.push(
          manager.create(BattleCreature, {
            battleId: battle.id,
            side: 2,
            partyPosition: member.slot,
            creatureId: null,
            speciesId: member.speciesId,
            level: member.level,
            isActive: idx === 0,
            maxHp,
            currentHp: maxHp,
            moves: learned
              .filter((sm) => sm.level <= member.level && sm.move)
              .map((sm) => ({ move_id: sm.moveId, pp: sm.move!.maxPp })),
          }),
        );
      }

      await manager.save([...playerFighters, ...npcFighters]);
      return getBattleByIdWithManager(manager, battle.id);
    });
  },

  async executeAttack(battleId: string, dto: BattleAttackDto) {
    return AppDataSource.transaction(async (manager) => {
      const battle = await manager.findOne(Battle, {
        where: { id: battleId },
        relations: { creatures: { species: true }, npc: true },
      });
      if (!battle || battle.status !== "active") throw new AppError(400, "BATTLE_NOT_ACTIVE", "Battle is not active");

      const playerActive = battle.creatures?.find((c) => c.side === 1 && c.isActive);
      const enemyActive = battle.creatures?.find((c) => c.side === 2 && c.isActive);
      if (!playerActive || !enemyActive) throw new AppError(500, "INVALID_BATTLE_STATE", "Missing active combatants");

      const moveEntry = playerActive.moves.find((m) => m.move_id === dto.moveId);
      if (!moveEntry || moveEntry.pp <= 0) throw new AppError(400, "NO_PP", "Move unavailable or out of PP");

      const move = await manager.findOneByOrFail(Move, { id: dto.moveId });
      moveEntry.pp -= 1;

      // Damage formula with type effectiveness
      const eff1 = await manager.findOneBy(TypeEffectiveness, {
        attacking: move.type,
        defending: enemyActive.species!.type1,
      });
      const mult = eff1 ? Number(eff1.multiplier) : 1;
      const dmg = move.power
        ? Math.max(1, Math.floor((((2 * playerActive.level) / 5 + 2) * move.power * 0.5) / 10 * mult))
        : 0;
      enemyActive.currentHp = Math.max(0, enemyActive.currentHp - dmg);

      const log: string[] = [`Used ${move.name} for ${dmg} damage!`];

      // Check enemy faint
      if (enemyActive.currentHp === 0) {
        enemyActive.isActive = false;
        const nextEnemy = battle.creatures?.find((c) => c.side === 2 && c.currentHp > 0 && c.id !== enemyActive.id);
        if (nextEnemy) {
          nextEnemy.isActive = true;
          log.push(`Opponent sent out ${nextEnemy.species?.name}!`);
        } else {
          battle.status = "won";
          battle.endedAt = new Date();
          log.push("You won the battle!");

          if (battle.kind === "wild") {
            await manager.save(
              manager.create(CatchHistory, {
                playerId: battle.playerId,
                speciesId: enemyActive.speciesId,
                wildLevel: enemyActive.level,
                outcome: "missed",
                missReason: "knocked_out",
                battleId: battle.id,
                posX: battle.posX,
                posY: battle.posY,
              }),
            );
          } else if (battle.npc) {
            const player = await manager.findOneByOrFail(Player, { id: battle.playerId });
            player.money += battle.npc.rewardMoney;
            await manager.save(player);

            const defeat = await manager.findOneBy(PlayerNpcDefeat, {
              playerId: battle.playerId,
              npcId: battle.npc.id,
            });
            if (defeat) {
              defeat.timesDefeated += 1;
              defeat.lastDefeatedAt = new Date();
              await manager.save(defeat);
            } else {
              await manager.save(manager.create(PlayerNpcDefeat, { playerId: battle.playerId, npcId: battle.npc.id }));
            }
          }
        }
      } else {
        // Enemy counter-attack
        const enemyDmg = Math.max(1, Math.floor(enemyActive.level * 1.5));
        playerActive.currentHp = Math.max(0, playerActive.currentHp - enemyDmg);
        log.push(`Foe ${enemyActive.species?.name} attacked for ${enemyDmg} damage!`);

        if (playerActive.currentHp === 0) {
          playerActive.isActive = false;
          const nextPlayer = battle.creatures?.find((c) => c.side === 1 && c.currentHp > 0 && c.id !== playerActive.id);
          if (nextPlayer) {
            nextPlayer.isActive = true;
            log.push(`Sent out ${nextPlayer.species?.name}!`);
          } else {
            battle.status = "lost";
            battle.endedAt = new Date();
            log.push("Your team whited out!");
          }
        }
      }

      battle.turnNumber += 1;
      await manager.save(battle.creatures ?? []);
      await manager.save(battle);

      // Sync player's real Creature HP/PP back when battle finishes
      if (battle.status !== "active") {
        for (const fc of battle.creatures?.filter((c) => c.side === 1 && c.creatureId) ?? []) {
          await manager.update(Creature, { id: fc.creatureId! }, { currentHp: fc.currentHp, status: fc.status });
          for (const m of fc.moves) {
            await manager.update(CreatureMove, { creatureId: fc.creatureId!, moveId: m.move_id }, { currentPp: m.pp });
          }
        }
      }

      return { battle: await getBattleByIdWithManager(manager, battle.id), log };
    });
  },

  async switchCreature(battleId: string, dto: BattleSwitchDto) {
    const battle = await this.getBattleById(battleId);
    if (battle.status !== "active") throw new AppError(400, "BATTLE_NOT_ACTIVE", "Battle is not active");

    const target = battle.creatures?.find((c) => c.side === 1 && c.partyPosition === dto.partyPosition);
    if (!target || target.currentHp <= 0) {
      throw new AppError(400, "INVALID_SWITCH", "Cannot switch to a fainted or missing party slot");
    }

    for (const c of battle.creatures?.filter((x) => x.side === 1) ?? []) {
      c.isActive = c.id === target.id;
    }
    battle.turnNumber += 1;
    await AppDataSource.getRepository(BattleCreature).save(battle.creatures ?? []);
    await AppDataSource.getRepository(Battle).save(battle);
    return this.getBattleById(battleId);
  },

  async useBattleItem(battleId: string, dto: BattleItemDto) {
    return AppDataSource.transaction(async (manager) => {
      const battle = await manager.findOne(Battle, {
        where: { id: battleId },
        relations: { creatures: { species: true } },
      });
      if (!battle || battle.status !== "active") throw new AppError(400, "BATTLE_NOT_ACTIVE", "Battle is not active");

      const inv = await manager.findOne(Inventory, {
        where: { playerId: battle.playerId, itemId: dto.itemId },
        relations: { item: true },
      });
      if (!inv || !inv.item) throw new AppError(400, "ITEM_NOT_OWNED", "Item not in inventory");

      // Consume 1 item
      if (inv.quantity === 1) await manager.remove(inv);
      else {
        inv.quantity -= 1;
        await manager.save(inv);
      }

      // Case A: Catch Ball
      if (inv.item.category === "ball") {
        if (battle.kind !== "wild") throw new AppError(400, "CANNOT_CATCH_TRAINER", "Cannot throw balls in NPC battles");
        const wild = battle.creatures?.find((c) => c.side === 2 && c.isActive);
        if (!wild || !wild.species) throw new AppError(500, "INVALID_BATTLE_STATE", "No wild target");

        const mult = Number(inv.item.effect?.catch_multiplier ?? 1);
        const hpFactor = (3 * wild.maxHp - 2 * wild.currentHp) / (3 * wild.maxHp);
        const catchChance = Math.min(0.95, Math.max(0.1, (wild.species.catchRate / 255) * mult * (0.5 + hpFactor)));
        const caught = Math.random() < catchChance;

        if (caught) {
          const existingCreatures = await manager.find(Creature, {
            where: { ownerId: battle.playerId, releasedAt: IsNull() },
          });
          const usedPartySlots = new Set(existingCreatures.map((c) => c.partySlot).filter(Boolean));
          let freePartySlot: number | null = null;
          for (let s = 1; s <= 6; s++) {
            if (!usedPartySlots.has(s)) {
              freePartySlot = s;
              break;
            }
          }
          const maxStorage = existingCreatures.reduce((max, c) => Math.max(max, c.storageSlot ?? 0), 0);

          // Save the creature first so PostgreSQL generates its UUID.
          const captured = manager.create(Creature, {
            ownerId: battle.playerId,
            speciesId: wild.speciesId,
            level: wild.level,
            experience: wild.level ** 3,
            currentHp: wild.currentHp,
            partySlot: freePartySlot,
            storageSlot: freePartySlot === null ? maxStorage + 1 : null,
          });
          await manager.save(Creature, captured);

          // CreatureMove.creatureId is a required part of its primary key,
          // so attach it explicitly after the creature has been saved.
          const capturedMoves = wild.moves.map((m, idx) =>
            manager.create(CreatureMove, {
              creatureId: captured.id,
              slot: idx + 1,
              moveId: m.move_id,
              currentPp: m.pp,
            }),
          );
          if (capturedMoves.length > 0) {
            await manager.save(CreatureMove, capturedMoves);
          }

          battle.status = "caught";
          battle.endedAt = new Date();
          await manager.save(battle);

          await manager.save(
            manager.create(CatchHistory, {
              playerId: battle.playerId,
              speciesId: wild.speciesId,
              wildLevel: wild.level,
              outcome: "caught",
              ballsThrown: 1,
              ballItemId: inv.item.id,
              creatureId: captured.id,
              battleId: battle.id,
              posX: battle.posX,
              posY: battle.posY,
            }),
          );

          return { caught: true, creature: captured, battle: await getBattleByIdWithManager(manager, battle.id) };
        }

        battle.turnNumber += 1;
        await manager.save(battle);
        return { caught: false, message: "Oh no! The wild creature broke free!", battle: await getBattleByIdWithManager(manager, battle.id) };
      }

      // Case B: Healing Medicine
      const healHp = Number(inv.item.effect?.heal_hp ?? 0);
      if (healHp > 0) {
        const target =
          battle.creatures?.find((c) => c.side === 1 && c.partyPosition === dto.targetPartyPosition) ??
          battle.creatures?.find((c) => c.side === 1 && c.isActive);
        if (!target) throw new AppError(400, "INVALID_TARGET", "Target party creature not found");

        target.currentHp = Math.min(target.maxHp, target.currentHp + healHp);
        battle.turnNumber += 1;
        await manager.save(target);
        await manager.save(battle);
        return { healed: true, battle: await getBattleByIdWithManager(manager, battle.id) };
      }

      throw new AppError(400, "UNSUPPORTED_ITEM", "Item has no battle effect");
    });
  },

  async flee(battleId: string) {
    return AppDataSource.transaction(async (manager) => {
      const battle = await manager.findOne(Battle, {
        where: { id: battleId },
        relations: { creatures: true },
      });
      if (!battle || battle.status !== "active") throw new AppError(400, "BATTLE_NOT_ACTIVE", "Battle is not active");
      if (battle.kind !== "wild") throw new AppError(400, "CANNOT_FLEE_TRAINER", "Cannot flee from a trainer battle");

      battle.status = "fled";
      battle.endedAt = new Date();
      await manager.save(battle);

      const wild = battle.creatures?.find((c) => c.side === 2);
      if (wild) {
        await manager.save(
          manager.create(CatchHistory, {
            playerId: battle.playerId,
            speciesId: wild.speciesId,
            wildLevel: wild.level,
            outcome: "missed",
            missReason: "player_ran",
            battleId: battle.id,
            posX: battle.posX,
            posY: battle.posY,
          }),
        );
      }

      return getBattleByIdWithManager(manager, battle.id);
    });
  },
};
