import { getValidated, validate } from "../middleware/validate";
import { inventoryService } from "../services/inventory.service";
import { npcService } from "../services/npc.service";
import { asyncHandler } from "../utils/asyncHandler";
import { IdParam, idParam } from "../utils/pagination";
import { shopTradeBody, ShopTradeDto } from "../validators/inventory.validators";
import { createNpcBody, listNpcsQuery, updateNpcBody } from "../validators/npc.validators";
import { createCrudRouter } from "./crud.router";

const router = createCrudRouter({
  path: "npcs",
  idKey: "id",
  service: npcService,
  listQuery: listNpcsQuery,
  createBody: createNpcBody,
  updateBody: updateNpcBody,
});

/** Shopkeeper inventory & buy/sell endpoints. */
router.get("/npcs/:id/shop", validate({ params: idParam }), asyncHandler(async (_req, res) => {
  const { params } = getValidated<unknown, IdParam>(res);
  await npcService.getById(params.id);
  res.json(await inventoryService.getNpcShop(params.id));
}));

router.post("/npcs/:id/shop/buy", validate({ params: idParam, body: shopTradeBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<ShopTradeDto, IdParam>(res);
  res.json(await inventoryService.buyFromNpc(params.id, body));
}));

router.post("/npcs/:id/shop/sell", validate({ params: idParam, body: shopTradeBody }), asyncHandler(async (_req, res) => {
  const { params, body } = getValidated<ShopTradeDto, IdParam>(res);
  res.json(await inventoryService.sellToNpc(params.id, body));
}));

export default router;