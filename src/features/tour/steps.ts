/**
 * The judge tour: ~18 seconds per stop, under 5 minutes end to end.
 * `target` matches a `data-tour="…"` attribute on the page; the overlay
 * spotlights it. `try` is an optional hands-on prompt.
 */
export type TourStep = {
  id: string;
  route: string;
  target?: string;
  kicker: string;
  title: string;
  body: string;
  try?: string;
  seconds: number;
};

export const TOUR_BUDGET_SECONDS = 300;

export const TOUR_STEPS: TourStep[] = [
  {
    id: "pitch", route: "/", target: "hero", kicker: "The problem", seconds: 20,
    title: "Every semester, a dorm's worth of stuff changes hands.",
    body: "Students moving out dump mini-fridges, lamps and futons. Students moving in buy the same things new. Dibs connects the two — campus-verified, built around the move-out → move-in cycle.",
  },
  {
    id: "verify", route: "/ua/signin", target: "signin", kicker: "Trust", seconds: 18,
    title: "Only real students. @crimson.ua.edu or nothing.",
    body: "Sign-in is a 6-digit code emailed to your campus address — the domain is checked on the server, codes expire in 10 minutes and allow 5 tries. For this demo we're already signed in as a seeded UA student.",
  },
  {
    id: "home", route: "/ua", target: "home-hero", kicker: "Campus home", seconds: 15,
    title: "Each campus is its own marketplace.",
    body: "UA crimson theme, a countdown to move-out, and live numbers straight from the database — nothing decorative.",
  },
  {
    id: "free", route: "/ua/browse?mode=free", target: "filters", kicker: "Free first", seconds: 15,
    title: "Free stuff is a first-class filter.",
    body: "Search, category, hall, price, pickup and sale mode — all in the URL so results are shareable. Free items get the yellow sticker.",
  },
  {
    id: "dibs", route: "/ua/listing/lst_ua_microwave", target: "dibs", kicker: "The signature move", seconds: 20,
    title: "See it. Want it. Call dibs.",
    body: "One tap reserves the item for 24 hours. The server locks the row so two people can never get the same thing.",
    try: "Tap Call dibs.",
  },
  {
    id: "bid", route: "/ua/listing/lst_ua_futon", target: "auction", kicker: "Auctions", seconds: 22,
    title: "Desirable items go to auction.",
    body: "Minimum increments, optional reserve and buy-now, a live clock. Every bid is validated in a database transaction; if someone outbids you mid-click you get a clear “outpaced” message.",
    try: "Tap a quick-bid amount, then Bid → Place bid.",
  },
  {
    id: "settle", route: "/ua/listing/lst_ua_futon", target: "demo-end", kicker: "Settlement", seconds: 14,
    title: "Deadlines settle themselves.",
    body: "An idempotent job closes auctions, picks the winner, checks the reserve and notifies everyone. This demo button runs the same code right now instead of waiting.",
    try: "Tap “Demo: end auction now”.",
  },
  {
    id: "handoffs", route: "/ua/x/handoffs", target: "timeline", kicker: "Move-out → move-in", seconds: 18,
    title: "Every deal becomes a handoff.",
    body: "Pick up now, during move-out week, or — if the seller can stash it — at move-in when the next student arrives. Pins show what's scheduled.",
  },
  {
    id: "payments", route: "/ua/x/handoffs", target: "payment", kicker: "Payments", seconds: 18,
    title: "Pay however you want. Both sides confirm.",
    body: "Dibs never touches money. The buyer marks “sent via Venmo”, the seller marks “received”, then “handed off”. Here Maya already paid for your kettle.",
    try: "Tap “Yes, I got $18.00”, then “Mark handed off”.",
  },
  {
    id: "swipe", route: "/ua/x/swipe", target: "swipe", kicker: "Discovery", seconds: 14,
    title: "Tinder for random dorm stuff.",
    body: "Swipe right to save, left to skip. Saves land in your profile.",
    try: "Drag a card right.",
  },
  {
    id: "subs", route: "/ua/x/subs", target: "board-sub", kicker: "Split subscriptions", seconds: 15,
    title: "Fill the empty seats on family plans.",
    body: "Dibs splits the price evenly (organizer included), seats can't be oversold, and the same sent/received confirmation handles payment.",
    try: "Join the YouTube split.",
  },
  {
    id: "rides", route: "/ua/x/rides", target: "board-ride", kicker: "Rides & trips", seconds: 14,
    title: "Carpool home. Split the beach house.",
    body: "Drivers publish a route, seats and a fair share; trips split lodging and gas for break.",
  },
  {
    id: "meals", route: "/ua/x/meals", target: "board-meal", kicker: "Off-campus meal plan", seconds: 15,
    title: "Cook once, feed the floor.",
    body: "Students who love to cook post bulk batches; everyone else claims portions for a few bucks — or a trade.",
  },
  {
    id: "swap", route: "/ua/x/class-swap", target: "swap-form", kicker: "Class swap", seconds: 22,
    title: "X wants Y, Y wants Z, Z wants X.",
    body: "No two of them can trade — but all three can. Dibs searches for 2-, 3- and 4-way loops and coordinates the drop/add so no seat is lost.",
    try: "Tap “Find my swap” (CS 201: have 002, want 001), then “I'm in”.",
  },
  {
    id: "multi", route: "/riverbend", target: "home-hero", kicker: "Multi-campus", seconds: 15,
    title: "A new campus is one config entry.",
    body: "Riverbend State (fictional) has its own colors, email domains, dates and pickup spots. You're a UA student, so here you're view-only — tenant isolation is enforced on the server and in Postgres.",
  },
  {
    id: "wrap", route: "/ua/me", target: "profile", kicker: "That's Dibs", seconds: 15,
    title: "Everything you did is real state.",
    body: "Listings, bids, wins, reservations and saves — on Next.js 16, Neon Postgres with Drizzle, server-side rules shared by every adapter, and tests for races and cross-campus access.",
  },
];

export const TOUR_TOTAL_SECONDS = TOUR_STEPS.reduce((s, x) => s + x.seconds, 0);
