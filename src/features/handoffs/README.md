# handoffs

Owner: **dev-a** · route `x/handoffs` · status: live

Every dibs (fixed/free) and every auction win creates a `Handoff`. Buyer or seller schedules it in the **move-out** window or, if the listing is marked "hold until move-in", in the **move-in** window. Payment happens in any app (Venmo, Zelle, Cash App, cash…): buyer marks *sent*, seller marks *received*, seller marks *handed off* (which requires received when the price is above $0). Rules: `features/community/domain.ts` (`checkHandoffAck`, `checkSchedule`). Data: `handoffs` table; methods on `MarketRepository`.
