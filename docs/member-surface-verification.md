# Member-surface visual verification

## Arabic discovery and notifications

The `/explore` and `/notifications` routes were visually checked at a desktop viewport of 1280 × 720 on 18 August 2026. The visible headings, supporting copy, search control, signed-out notification state, and call to action are Arabic and RTL-aligned. Both pages are horizontally centered at normal zoom, with no clipped headings or off-screen controls.

## Comment thread coverage

The home and community feeds render the shared `PostComments` component beneath posts. The server query applies post visibility and community-membership checks before returning thread data; the related safeguard suite covers retrieval and creation behavior. A live, populated thread still needs interaction verification after a signed-in member creates or opens a comment on the deployed service.
