# Manuscript reproducibility audit

## Artifact SHA-256

- `AyFlux_Manuscript_final_clean.docx`: `516b25e26855842f5cfd9f95cda09b71a33ee58ac461d45d0bd4e1bf72be2b00`
- `AyFlux_Supporting_Information_companion.odt`: `612ef4cfabd5bb5cc8b85d39802cb3f0a1c91289f2cdc65577845928a782f8cb`
- `AyFlux_reproducibility.zip`: `b0c61f5859e19c1c62d5a7bc2aca88cc6aebffd16fa8629dba101a9b9fa2bbb4`

## Checks

| Check | Status | Detail |
|---|---|---|
| SI S1 scenario count | pass | 9 scenarios; expected 9 |
| SI S1 numerical inputs | pass | 27 weight, CrCl and horizon entries checked |
| SI S2 values and bands | pass | 37 endpoint rows, observed/predicted values, ratios and bands checked at displayed precision |
| SI S3 ablation values | pass | 72 scenario/variant GMR values checked at displayed precision |
| SI authors match manuscript | pass | Manuscript authors: Muhammad Khalil, Hossam Hammouda |
| SI handoff wording | pass | Companion should describe the reconciled manuscript, not an earlier inaccessible draft |
| Internal reference targets | pass | All internal targets resolve |
| Main Table 6 ablation metrics | pass | Bias/error cells agree with frozen ablations, including undefined zero-CMMG case |
| Archive checksum manifest | pass | 117 entries checked; mismatched []; unlisted [] |
| Archive frozen engine | pass | cb07505a2b9e619ee3351bb0bf66d5610a611a6f |
| Archive scorecard vs frozen rerun | pass | All 37 rows agree with the pinned rerun at CSV precision |
| Figure 3 matches archive | pass | d73e307bc5f07e40325283291df333ecdc4610a7398645062cfff6f33fb9e0c4 |
| Figure 4 matches archive | pass | ab531555d7cdb5ddf1776f9e4cff51a550a95c0eac6240e54ea405a36fcf75d4 |
| Archive current AyFlux_Manuscript_final_clean.docx | pass | Bundled document must match the supplied reconciled version |
| Archive current AyFlux_Supporting_Information_companion.odt | pass | Bundled document must match the supplied reconciled version |
| Main Table 3 AUC values | pass | All 16 published/model AUC values match archived Python outputs at displayed precision |

## Resolution record — 13 November 2026

The audit reran the exact frozen engine to verify the numerical report. All S1–S3
values already agreed at their displayed precision; no numerical table was edited.
The SI author line was synchronized with the two-author main manuscript, and its
obsolete inaccessible-draft introduction was replaced with the actual freeze scope.
The reproducibility ZIP was rebuilt to include the reconciled clean DOCX, current
ODT/PDF manuscript and matching SI. Its 117 checksums were regenerated; numerical
source, model files and results were preserved byte-for-byte.

The main draft remains at `8fc1c9d`, including CSF CMMG partition 0.25. Later live
settings and the separate external evaluation results have not been inserted into
its numerical tables. Additional local Windows manuscript/SI copies described in
issue #75 were not supplied for this audit and are not claimed to be synchronized.
An archival DOI, final release packaging and authorship/funding/COI declarations
still require publication closure; these consistency checks do not imply journal
submission readiness.
