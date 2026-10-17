# dibs (core)

Reservations for fixed-price and free items. `domain.ts` holds the pure rules (who can claim, 24h hold from campus config). Both data adapters call them. The DIBS! stamp lives in `components/DibsStamp.tsx` and only fires after the server confirms.
