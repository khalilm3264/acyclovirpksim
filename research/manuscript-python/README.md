# Archived Python case-study reproductions

The three scripts in `analysis/` are byte-for-byte copies from the analysis directory of AyFlux_Publication_Complete_2026-11-09.zip. They preserve the earlier independent Python calculations for the nominal HD and oral valacyclovir scenarios, the six-participant Laskin reconstruction, and the Section 3.5 numerical checks. The manuscript uses separate JavaScript analyses for exchange-resolved CAPD, the evidence scorecard and the cross-study ablation. Figure names in the archived scripts follow the earlier working draft.

The original scripts use CMMG nonrenal clearance 0.25 L/h at 70 kg and CSF CMMG partition 0.25. They reproduce an earlier analysis state.

The supplied reconciled archive contains the same three scripts with nonrenal CMMG clearance changed to 0.5 L/h. Its unchanged copies are in `reconciled/analysis/`. Both versions retain CSF CMMG partition 0.25 and are historical research ports. The current browser engine has its own documented parameters and validation history.

`SOURCE-HASHES.json` records all six file hashes and the precise supplied archive hash. The original scripts also match the baseline/python/analysis copies in that archive. The only source-code difference in run_studies.py is the nonrenal CMMG coefficient.

From the repository root, using Python 3.12 (tested with 3.12.14):

```sh
cd research/manuscript-python
python -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
python analysis/run_studies.py
python analysis/laskin_fulltext_update.py
python analysis/test_reproduction.py
```

On Windows PowerShell, activate the environment with `.\.venv\Scripts\Activate.ps1`. Each run generates local files under `data/`, `results/` and `figures/`. The source tables used by these scripts are encoded in the archived analysis.

Section 3.5 compares fixed-step RK4 (0.025 h) with SciPy DOP853 (relative tolerance 2e-12, absolute tolerance 1e-13). See the solver metrics and five-point fixture comparison in `results/summary.json`. The separate reconstruction of Laskin's published fitted curves uses relative tolerance 1e-10 and absolute tolerance 1e-12. The subject-specific structural predictions are recorded in `results/laskin_fulltext_group_checkpoints.csv` as the arithmetic mean of the six subject-specific profiles.

## Reconciled archive reproduction

Use the same environment, from research/manuscript-python.

```sh
python reconciled/analysis/run_studies.py
python reconciled/analysis/laskin_fulltext_update.py
python reconciled/analysis/test_reproduction.py
```

These runs write under reconciled/data, reconciled/results and reconciled/figures,
so the two versions preserve separate outputs. Generated files are ignored by git.

Review on 14 November 2026 used NumPy 2.3.5, SciPy 1.17.0, pandas 2.2.3 and
Matplotlib 3.10.8. Both reproduction checks passed. Both complete analysis sets
ran successfully. Both generated summary.json files match their corresponding
saved archive summaries exactly, including all numeric values. Matching numerical methods and preserving archival source
do not establish clinical predictive performance. Source versions need to be
matched explicitly when reproducing a particular manuscript table.
