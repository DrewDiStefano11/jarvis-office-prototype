# Floor 1 Alignment Report

Status: candidate-unverified

- All nine pages report `MediaBox [0 0 4608 3072]`.
- Each PDF embeds one `6144 × 4096` DCT image.
- Registration requires one uniform scale and explicit offsets.
- Browser QA compared the actual `8192 × 5460` clean master with the actual embedded image using downsampled Sobel edge maps.
- The 2026-07-28 assistance pass retained scale `1.3333333333333333`, offset X `0`, and offset Y `-0.6666666666665151`; sampled score `0.85924`, overlap `100%`.
- This result is candidate assistance only. Distributed visual landmark review and all approval gates remain required.
