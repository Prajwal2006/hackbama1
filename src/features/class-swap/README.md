# class-swap

Owner: **dev-a** · route `x/class-swap` · status: live

Students post course + section they have + section they want. `findSwapCycle` (pure, `features/community/domain.ts`) searches for the shortest 2–4 person loop; a `SwapCycle` is proposed and each person confirms (or opts into auto-accept). When everyone confirms, a coordinated drop/add window is set and the UI shows who drops what and who adds it. Data: `swap_requests`, `swap_cycles`. Neon matching takes a per-course advisory lock.
