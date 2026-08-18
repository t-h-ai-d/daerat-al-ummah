# AI Moderation and Human Review

## Scope of this release

The automated screening layer applies **only when a member creates a public post**, including a post published inside a community or subcommunity. It looks conservatively for likely spam, fraud, deception, explicit community-rule risk, or obvious brainrot-style mass-posting signals. It does **not** make fatwas, diagnose beliefs, decide disputes, or issue automatic permanent penalties.

Comments and direct messages are deliberately outside this first automated-screening scope. Direct messages remain private, and comments continue to rely on the platform rules and the owner-email reporting route. This boundary should be reviewed before any future expansion.

## What happens when a post is held

1. The post is stored with `under_review` rather than being displayed in the public or community feed.
2. The creator sees a clear Arabic status and an immediate **«مراسلة المالك»** action in every public-post composer.
3. The email is pre-addressed to `ssbmbwuugame@gmail.com` and contains only the post reference and title needed for the owner to investigate.
4. The creator can also find the same owner-email link beside the held post in **«منشوراتي»**.

## Owner review without a member-facing moderator panel

The owner reviews held-post audit records directly in the secured TiDB Cloud database. Each record in `ai_moderation_checks` includes the post identifier, classifier source, category, confidence, concise rationale, creator message, and timestamp. The related `posts.moderation_status` field remains the publication control.

There is intentionally **no public or member-accessible administrator dashboard, moderation route, or internal reporting endpoint**. For a review, first read the post and context, then change `posts.moderation_status` only after a human decision. Never treat the AI verdict as final on its own.

## Owner review checklist

- Confirm the content itself and its context; do not act from the AI rationale alone.
- Preserve legitimate differences of opinion and avoid religious rulings through the platform.
- Keep decisions proportionate: publish if the concern is unsupported; otherwise keep the hold or remove only when clearly necessary.
- Reply through email when a creator asks for a review, using respectful and concise Arabic.
- Record any manual decision outside the member experience until a future owner-only review system is designed with proper access controls.
