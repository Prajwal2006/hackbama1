# subs

Owner: **dev-b** · route `x/subs` · status: live

Subscription splitting. Organizer posts a plan (service, price, cycle, open seats); Dibs computes an even share including the organizer. Members join (seat-limited, transactional), mark payment sent; organizer confirms received. Shared board UI: `features/community/CommunityBoard.tsx`. Data: `community_posts` / `community_members` (kind `sub`).
