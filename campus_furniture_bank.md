# CAMPUS FURNITURE BANK

## The furniture futures exchange for college students

**The one-line pitch:** Sell your desk in May. Someone buys it in June. It appears in their dorm in August. When they graduate, it goes back into circulation.

**Tagline:** We're building futures for furniture.

**The 30-second version for judges**

Every May, students abandon or desperately sell furniture. Every August, a new wave of students buys the same stuff all over again. Meanwhile, furniture sits in storage, gets dumped, or gets sold for pennies because the owner has three days to move out after a disaster finals week.

We're building a **furniture bank** that breaks this cycle. Students scan and list their furniture, incoming students build their future dorm in 3D, and they reserve real items for move-in day. The furniture stays in a coordinated storage system while students rotate around it.

**The WTH moment:** A student drags a real desk into a virtual dorm, buys it months before move-in, and watches its status travel through **SOLD IN MAY → STORED OVER SUMMER → DELIVERED IN AUGUST**. Next year, that same desk can serve another student.

It's not just a marketplace. It's a market where the product can be bought now, stored through the summer, and physically delivered in the future.

---

## The winning demo

Build the demo around one unmistakable, visual story: **buy a room from the future**.

1. **Scan the old room.** Upload a photo. AI suggests furniture listings, and the student confirms the item, condition, dimensions, and price.
2. **Turn inventory into a 3D dorm.** A buyer drags furniture models into a room, checks fit, and builds a setup under a budget.
3. **Buy now. Move in later.** The buyer reserves actual inventory for August. An animated timeline shows the desk entering storage in May and leaving storage on move-in day.
4. **Make the furniture immortal.** Advance the demo to the following May. The student returns or resells the desk, and it becomes available to the next cohort.

The audience should understand the product before the narration finishes. Use a seeded inventory so the demo is reliable; make the timeline, 3D room, reservation, and inventory-state changes real in the app.

### The demo's signature line

> **“This desk was sold three months before it reached its buyer. Welcome to the furniture futures market.”**

The joke is memorable, but the workflow underneath it is real: future-dated reservations tied to physical inventory and storage.

---

## How this project is designed to win

The judging formula is a product strategy, not just a scoring rubric.

- **30% — Idea:** The twist is not “Craigslist, but for college.” It is a furniture bank that separates the sale date from the delivery date and recirculates items across student generations.
- **25% — Demo:** A visible 3D room builder, an actual reservation, and a May-to-August timeline make the concept instantly understandable. The judge sees a desk move through the system instead of hearing a list of features.
- **20% — Storytelling:** Start with the absurdly familiar problem: one student has to get rid of a desk before move-out; another student buys the same desk new three months later. Then reveal the bank.
- **15% — Execution:** Make the key loop work end to end: listing → 3D placement → reservation → stored status → scheduled delivery. Avoid a beautiful but nonfunctional mockup.
- **10% — Meta-game:** Map the actual implementation to the event's judging tracks and sponsor prizes. Only claim sponsor integrations or capabilities that genuinely work. Keep the multi-campus architecture visible, but demonstrate one campus deeply.

## The core idea

Traditional secondhand marketplaces connect one seller with one buyer. This product manages the entire campus move-out-to-move-in cycle.

A graduating student can sell or deposit furniture in May. The furniture stays in a central storage system over the summer. An incoming student browses the inventory, builds a virtual dorm room, reserves the actual pieces they want, and receives them in August. When that student leaves later, the furniture can return to the system and be used by another student.

The key insight is that **ownership, demand, and physical delivery do not need to happen at the same time**. The marketplace coordinates them across the academic calendar.

## How it works

1. **Deposit** — A student submits furniture to the bank. The item gets an inventory ID, photos, dimensions, condition details, and an availability date. The bank arranges collection and confirms whether the item is accepted.
2. **Store** — The bank holds the physical furniture. Each item has a known storage location, condition record, availability status, and transaction history.
3. **Furnish virtually** — Incoming students browse digital furniture models and assemble a room within their budget. They can move, rotate, and compare items in a virtual room.
4. **Reserve** — The student selects actual items and a desired move-in date. The system checks inventory and reserves those items.
5. **Deliver / hand off** — The bank coordinates delivery or pickup, updating the inventory state so the same item cannot be sold twice.
6. **Recirculate** — When a student no longer needs an item, it can be returned or resold through the same system, extending the furniture's useful life.

## The virtual dorm and 3D strategy

The 3D experience should be compelling, but custom computer vision or 3D reconstruction is not required for the first version.

### MVP: photo plus dimensions

- The student uploads a photo and confirms the item type.
- The student enters approximate dimensions and condition.
- The app maps the item to a suitable model from a small library of 3D assets: desks, chairs, lamps, mini-fridges, and similar dorm essentials.
- The model represents the item type and approximate size; it should not be presented as a perfect scan of the exact physical object.

### Later: image-to-3D

- Integrate an existing image-to-3D service or scanning tool to generate a model from photos.
- Store browser-compatible 3D assets, such as GLB files.
- Verify physical dimensions separately. A visually convincing model is not necessarily dimensionally accurate.

### Room planner

- Build a browser-based 3D room with a floor, walls, and simple dimensions.
- Let users drag, move, and rotate furniture.
- Show a running total, required item categories, and whether items fit within the room and budget.
- Start with simple collision and fit checks; realistic rendering can come later.

**Important product principle:** The 3D model is the shopping interface, not the foundation of the business. The foundation is reliable inventory: every digital item must correspond to a real, tracked physical item.

## A simple transaction example

- **May:** A graduating senior deposits a desk.
- **June:** An incoming student reserves that desk for $45 for August move-in.
- **August:** The bank delivers the desk or makes it available for pickup.
- **Following May:** That student returns or resells the desk through the bank.

The furniture serves multiple students without each person needing to find a buyer, arrange summer storage, or coordinate a separate pickup.

The phrase “furniture futures” captures the playful idea that the item can be sold or reserved now for use in a later semester. In the MVP, this is a scheduled reservation and inventory transaction, not a financial derivative or regulated futures contract.

## Business model options

### Option A: Consignment (recommended for a pilot)

The student retains ownership until the furniture sells or is transferred under clearly defined terms. The bank stores and facilitates the transaction, earning a commission or service fee.

- Lower upfront inventory cost for the operator.
- Less capital tied up in furniture.
- Requires clear terms for storage fees, damage, unsold items, and ownership transfer.

### Option B: Buy-back / outright purchase

The bank buys accepted furniture from students and later resells it to incoming students.

- Simpler buyer experience and more control over inventory.
- Requires working capital.
- The bank takes the risk of damage, depreciation, storage costs, and unsold stock.

For an initial hackathon prototype, use **consignment-style logic** and simulate the warehouse. Do not imply that real-world storage, delivery, or transactions exist unless they have actually been arranged.

## Hackathon MVP

Build one complete, easy-to-understand story rather than the entire marketplace ecosystem.

### Demo: “The $200 Dorm Challenge”

1. A graduating student uploads room photos.
2. An existing multimodal AI API suggests draft listings, or the user manually adds a few items.
3. The student reviews and approves each listing, including ownership, condition, price, and dimensions.
4. An incoming student sets a $200 budget and selects needed categories.
5. The app assembles a dorm bundle from actual seeded inventory, showing itemized prices and the total.
6. The student places a reservation for a move-in date.
7. The seller / bank dashboard shows the items as reserved and tracks the scheduled handoff.

Seed realistic sample inventory so the demo works reliably. Label estimated retail prices and simulated operations honestly.

### Suggested stack

- **Frontend:** Next.js and Tailwind CSS.
- **Database and image storage:** Supabase.
- **Authentication:** Supabase Auth; university email verification can be added.
- **Photo understanding:** An existing multimodal AI API, optional for the MVP.
- **Bundle matching:** Simple TypeScript or Python rules before attempting optimization algorithms.
- **Deployment:** Vercel.
- **3D:** A browser-based 3D library and a small set of ready-made assets; postpone custom scanning.

### Essential data concepts

- **University:** school identifier and configuration.
- **User:** student identity and university affiliation.
- **Item:** owner / consignor, category, description, photos, dimensions, condition, asking price, model asset, and inventory ID.
- **Inventory status:** draft, pending acceptance, in storage, available, reserved, scheduled for handoff, delivered, returned, or retired.
- **Reservation:** buyer, item(s), reservation date, intended move-in date, and status.
- **Storage location:** warehouse or storage unit reference, when relevant.
- **Transaction history:** ownership / custody changes and timestamps.

Use explicit inventory states and enforce that a physical item can have only one active reservation at a time.

## What to build first

1. Create the inventory database and seed it with sample furniture.
2. Build listing creation and review.
3. Build a simple room planner using a small library of 3D furniture assets.
4. Build the budget-based dorm bundle matcher.
5. Add reservation and inventory-state changes.
6. Add AI-assisted photo listing only if the core workflow is stable.
7. Simulate multiple universities with university IDs; do not spend hackathon time building a nationwide logistics network.

## What not to build yet

- A custom computer vision model.
- Perfect photo-to-3D reconstruction.
- Payments and a full financial infrastructure.
- Nationwide storage and delivery operations.
- Sophisticated price prediction.
- Dozens of university integrations.
- A complex optimization engine before a simple bundle matcher works.

## Key risks to validate

- **Storage economics:** warehouse space, handling, and transport can cost more than low-value furniture is worth.
- **Demand timing:** an item deposited in May might not be needed by anyone in August.
- **Condition and damage:** items need inspection, clear condition records, and responsibility rules.
- **Dimensions:** 3D visuals can mislead if the physical dimensions are inaccurate.
- **Ownership and reservations:** the app must clearly state when ownership transfers and what happens if a buyer cancels.
- **Logistics:** delivery and pickup windows must be realistic.
- **Campus rules:** dorm policies, university permissions, insurance, and local storage arrangements may affect a real pilot.

## What makes the concept distinctive

The opportunity is not merely secondhand listings or 3D furniture visualization. It is the combination of:

- Inventory managed across semester boundaries.
- A central or coordinated furniture bank.
- Room-level shopping rather than item-by-item browsing.
- Reservations aligned with future move-in dates.
- Furniture recirculation across successive student cohorts.

These elements are a hypothesis to validate, not a claim that no similar service exists. The hackathon should demonstrate the complete cycle clearly and investigate existing campus resale, storage, and furniture reuse services before making novelty claims.

## Pitch

**What if your university had a furniture bank?**

Sell your furniture when you leave. Design your next room before you arrive. Reserve real items for move-in. When you no longer need them, return them to the system so another student can use them.

The students rotate. The furniture stays in circulation.

**We're building futures for furniture.**
