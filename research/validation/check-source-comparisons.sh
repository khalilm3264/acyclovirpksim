#!/usr/bin/env bash
# Run from any directory. Results are research comparisons, not independent cohorts.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
output=${1:-"$root/research/validation/results/source-comparisons"}
mkdir -p "$output"
output=$(cd "$output" && pwd)
cd "$root"

{
  echo "Commit $(git rev-parse HEAD)"
  echo "Engine blob $(git hash-object public/assets/pk-engine.js)"
  echo "Node $(node --version)"
} > "$output/provenance.txt"

# These runners print standalone reports and check their own numerical assumptions.
studies=(
  almond-paired-post-hd burgess-iv-terminal collignon-crrt davenport-dialysis-washout
  de-miranda-iv-recovery hara-genotype-terminal hellden-ms-sampling hellden-renal-clearance ito2025 izzedine-capd
  kably-auc-comparison kato-aki-hd-course khajehdehi-crrt krasny-hd-recovery
  laskin-anuric-course laskin-clearance laskin-fitted-distribution lindstrom-course-6-20
  lindstrom-patient19 lindstrom-patient7-course shah-mixed-exchanges smith-systemic-exposure soul-lawton-crossover soul-lawton-radiolabel
  stathoulopoulou-1996-recovery sun-cns-comparison unita-hd-sampling vasquez-hd-extraction weller-single-dose
)
for study in "${studies[@]}"; do
  echo "Checking $study"
  node "research/validation/$study.cjs" > "$output/$study.txt"
  test -s "$output/$study.txt"
done

# Rerun Boelaert's grid, external comparisons and late-dose windows into the artifact.
for study in boelaert-joint boelaert-followup boelaert-steady-state; do
  echo "Checking $study"
  node "research/validation/$study.cjs" "$output" > "$output/$study.txt"
  cmp "research/validation/$study-results.json" "$output/$study-results.json"
done
cmp research/validation/boelaert-joint-grid.csv "$output/boelaert-joint-grid.csv"

# This runner already supports an output directory and has a tracked numerical reference.
node research/validation/lindstrom-csf.cjs "$output" > "$output/lindstrom-csf.txt"
cmp research/validation/lindstrom-csf-results.json "$output/lindstrom-csf-results.json"
