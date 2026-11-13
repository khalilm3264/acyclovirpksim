# Python reproduction of the manuscript case studies

The three scripts in `analysis/` are byte-for-byte copies from the analysis directory of AyFlux_Publication_Complete_2026-11-09.zip. They reproduce the independent Python calculations for the nominal HD and oral valacyclovir scenarios, the six-participant Laskin reconstruction, and the Section 3.5 numerical checks. The manuscript uses separate JavaScript analyses for exchange-resolved CAPD, the evidence scorecard and the cross-study ablation. Figure names in the archived scripts follow the earlier working draft.

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
