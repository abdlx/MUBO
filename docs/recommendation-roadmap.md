# Next milestones

1. Add accounts, server-backed sessions and authenticated event/recommendation routes. Enforce per-user access and retention controls before exposing multi-user recommendations.
2. Add integration tests against disposable PostgreSQL and Redis, exercise idempotent events, impression ownership, worker projections and service outages; run the Compose acceptance scenario with a real scanned library.
3. Measure decoded audio in the analysis worker and store calibrated tempo/energy and embeddings; extend similarity and transitions while preserving metadata fallback.
4. Introduce short-session vs long-term affinity, skipped-track suppression windows, impression fatigue, module engagement and Redis invalidation on feedback.
5. Tune Smart Shuffle insertion frequency with controlled evaluation and sequence radio by gradually expanding seed similarity. Add transition modeling and module-level feedback.
6. Once event volume warrants it, evaluate collaborative retrieval and learned ranking offline against the current deterministic baseline. Record metrics and model versions before rollout.
