# Floor 1 registration and promotion lifecycle

Floor 1 geometry is not production data merely because extraction, classification, or image-assisted alignment has completed. The pipeline has five explicit states:

1. **Candidate registration.** The lab can fit one uniform scale and two offsets from editable landmarks. Image assistance compares the actual clean master with the actual PDF-embedded image and may suggest a candidate. It never grants approval.
2. **Human-reviewed registration.** A reviewer must inspect distributed landmarks, residuals, geometry, colliders, doors, lights, and navigation evidence. Imported approval flags and checksums are ignored by the lab.
3. **Approved artifact.** The lab can deliberately export a checksummed approval artifact only after the objective thresholds, reviewer identity, all review decisions, populated navigation cells, and all ten required route tests pass.
4. **Protected production promotion.** `npm run register:floor1 -- --production --approval <path>` validates the artifact, current source hashes, parser reconciliation, classification completeness, all 47 doors, registration coverage and residuals, reviews, navigation, routes, and checksum. It stages transformed data and atomically replaces production output only after every check passes. Any failure removes stale or partial output.
5. **Verified runtime loading.** The normal office loads production geometry only when the production manifest, every listed file hash, approval checksum, and promoted overlay schema verify. Missing production data preserves the sample office; malformed production data fails closed with a visible error.

## Current status

The current repository remains at **candidate registration**. Browser QA on 2026-07-28 ran the actual-image edge analysis against the clean `8192 × 5460` master and the PDF-embedded `6144 × 4096` image. The result retained the nominal uniform candidate (`scale 1.333333333`, `offsetX 0`, `offsetY -0.666666667`) with a sampled edge score of `0.85924` and `100%` overlap. This is useful reviewer evidence, but it is not landmark registration, human review, or production approval.

No approved artifact is committed and `src/office/data/floor1/production/` must remain absent until a qualified reviewer completes the gates.

## Failure behavior

- Missing or invalid approval: deny promotion and remove production output.
- Changed source hash or stale checksum: deny promotion.
- Missing parser/classification records or door IDs: deny promotion.
- Missing reviews, navigation cells, or route evidence: deny promotion.
- Missing or corrupt runtime files: reject production data; never fall back to provisional geometry.

The generated-data inventory and regeneration policy are documented in `artifacts/production-floor1/GENERATED_DATA.md`.
