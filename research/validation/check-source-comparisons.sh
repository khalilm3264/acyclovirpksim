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
  almond-paired-post-hd berry-iv-aki boosman-icu-trough boulieu-cvvhd burgess-iv-terminal cmmg-formation-bound cmmg-identifiability collignon-crrt davenport-dialysis-washout
  de-miranda-iv-recovery hara-genotype-terminal hellden-ms-sampling hellden-serum-hd hellden-iv-profiles hellden-renal-clearance izzedine-capd jamez-oral-sampling
  kably-auc-comparison kably-renal-slope kacirova-iv-cohort kato-aki-hd-course khajehdehi-crrt krasny-hd-recovery
  laskin-anuric-course laskin-clearance laskin-fitted-distribution laskin-individual-spread laskin-prior-band lindstrom-course-6-20
  lindstrom-patient19 lindstrom-patient4-course lindstrom-patient7-course shah-mixed-exchanges smith-systemic-exposure soul-lawton-crossover soul-lawton-radiolabel
  stathoulopoulou-1996-recovery sun-cns-comparison ueno-hdf-blood unita-hd-sampling vasquez-hd-extraction vasquez-urine-intervals weller-single-dose whitley-iv-course yang-three-hd
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

# Compare tracked reference outputs without writing into the checkout.
for study in lindstrom-csf hellden-cotard cmmg-evidence; do
  node "research/validation/$study.cjs" "$output" > "$output/$study.txt"
  cmp "research/validation/$study-results.json" "$output/$study-results.json"
done
for study in hara-hd ito2025; do
  node "research/validation/$study.cjs" > "$output/$study-results.json"
  cmp "research/validation/$study-results.json" "$output/$study-results.json"
done
node -e "console.log(JSON.stringify(require('./research/validation/laskin-clearance.cjs').report(),null,2))" > "$output/laskin-clearance-results.json"
cmp research/validation/laskin-clearance-results.json "$output/laskin-clearance-results.json"
