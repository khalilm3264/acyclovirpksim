# Export the official OSPSuite-R Aciclovir PBPK example to a unit-normalized
# CSV for plotting in AyFlux's existing external-model overlay.
# Copyright (C) 2026 Muhammad Khalil; SPDX-License-Identifier: AGPL-3.0-only
# This is a DIFFERENT model, regimen and population. No clinical validation.
#
# Run from repository root:
#   Rscript interop/compare_ospsuite.R
# Or specify a reviewed PK-Sim / MoBi .pkml simulation:
#   Rscript interop/compare_ospsuite.R path/to/simulation.pkml
#
# Install ospsuite following its official platform-specific installation
# instructions: https://www.open-systems-pharmacology.org/OSPSuite-R/
if (!requireNamespace("ospsuite", quietly = TRUE)) {
  stop("Install the official ospsuite package before running this script; see https://www.open-systems-pharmacology.org/OSPSuite-R/")
}
args <- commandArgs(trailingOnly = TRUE)
path <- if (length(args)) args[[1]] else
  system.file("extdata", "Aciclovir.pkml", package = "ospsuite")
if (!nzchar(path) || !file.exists(path)) {
  stop("No .pkml file available; provide a local simulation path.")
}
sim <- ospsuite::loadSimulation(normalizePath(path))
results <- ospsuite::runSimulations(simulations = sim)[[1]]
paths <- results$allQuantityPaths
cat("Outputs available in this OSP simulation:\n")
cat(paste0("  - ", paths, collapse = "\n"), "\n")
# This source is the example output path in official OSPSuite-R documentation.
output_path <- "Organism|PeripheralVenousBlood|Aciclovir|Plasma (Peripheral Venous Blood)"
if (!output_path %in% paths) {
  stop("The desired TOTAL plasma concentration output is unavailable. Inspect the paths printed above and modify output_path explicitly; do not substitute unbound plasma concentrations.")
}
values <- ospsuite::getOutputValues(
  simulationResults = results, quantitiesOrPaths = output_path
)
if (!all(c("Time", output_path) %in% names(values$data))) {
  stop("Expected time and concentration columns were not returned by OSPSuite.")
}
# OSP outputs carry units, and different versions/simulations may use different
# base units. Never assume the model output is already mg/L or hours.
unit_for <- function(key) {
  meta <- values$metaData[[key]]
  if (is.null(meta) || is.null(meta$unit)) {
    stop("Missing output-unit metadata for: ", key)
  }
  as.character(meta$unit)[1]
}
time_unit <- unit_for("Time")
concentration_unit <- unit_for(output_path)
cat("Time unit: ", time_unit, "; concentration unit: ",
    concentration_unit, "\n", sep = "")
to_hours <- function(x, unit) {
  u <- tolower(trimws(unit))
  if (u %in% c("min", "minute", "minutes")) return(x / 60)
  if (u %in% c("h", "hr", "hour", "hours")) return(x)
  if (u %in% c("d", "day", "days")) return(x * 24)
  stop("Unsupported OSP time unit: ", unit, ". Convert it explicitly.")
}
to_mg_L <- function(x, unit) {
  u <- tolower(gsub("μ", "µ", trimws(unit), fixed = TRUE))
  if (u %in% c("mg/l", "mg/liter", "mg/litre")) return(x)
  if (u %in% c("µg/ml", "ug/ml", "mcg/ml")) return(x)
  # Molecular weight of ACYCLOVIR: 225.21 g/mol (not CMMG).
  if (u %in% c("µmol/l", "umol/l", "µm/l")) return(x * 225.21 / 1000)
  if (u == "mol/l") return(x * 225.21 * 1000)
  stop("Unsupported OSP concentration unit: ", unit,
       ". Inspect the output metadata and convert explicitly.")
}
table <- data.frame(
  time_hours = to_hours(as.numeric(values$data$Time), time_unit),
  concentration_mg_L = to_mg_L(
    as.numeric(values$data[[output_path]]), concentration_unit
  )
)
if (any(!is.finite(as.matrix(table))) || any(table$time_hours < 0) ||
    any(table$concentration_mg_L < 0)) {
  stop("Unexpected negative or non-finite OSP results.")
}
table <- table[order(table$time_hours), , drop = FALSE]
if (anyDuplicated(table$time_hours)) {
  # Duplicate time rows may occur at discontinuities; retain last at each time.
  table <- table[!duplicated(table$time_hours, fromLast = TRUE), , drop = FALSE]
}
out_dir <- file.path(getwd(), "interop", "results")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)
out <- file.path(out_dir, "ospsuite_aciclovir_plasma.csv")
utils::write.csv(table, out, row.names = FALSE)
cat("Wrote normalized OSP results: ", out, "\n", sep = "")
cat("Load this CSV in AyFlux > Research tools > Compare external PK-Sim / MoBi CSV.\n")
cat("Select time_hours [h] and concentration_mg_L [mg/L].\n")
cat("IMPORTANT: the provided Aciclovir.pkml example is NOT dose-, population-, or disease-state-matched to AyFlux. Plot differences are exploratory and NOT measures of clinical prediction error.\n")
