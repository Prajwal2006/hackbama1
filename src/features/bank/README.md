# bank

Owner: **dev-a** · route `x/bank` · status: live

Campus Furniture Bank ("furniture futures"). Students deposit furniture on consignment (inventory code + shelf); incoming students set a budget, `buildBundle` assembles a dorm from available inventory, and `reserve` locks every item or none. A reservation walks reserved → stored → delivered → returned; on return the item is available again with the returning student as consignor. Rules: `domain.ts`. Data: `bank_items`, `bank_reservations` (`src/data/schema/bank.ts`), `BankRepository`. Warehouse pickup, storage and delivery are simulated and labelled as such. The 3D room planner is being built separately.
