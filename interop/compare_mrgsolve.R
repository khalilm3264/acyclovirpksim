# AyFlux independent IV acyclovir / CMMG implementation check with mrgsolve.
# Copyright (C) 2026 Muhammad Khalil; SPDX-License-Identifier: AGPL-3.0-only
# Educational, deterministic, no-dialysis regression. Not clinical validation.
#
# Run from repository root: Rscript interop/compare_mrgsolve.R
# Install mrgsolve first: install.packages("mrgsolve")
if (!requireNamespace("mrgsolve", quietly = TRUE)) {
  stop("Install the official mrgsolve R package: install.packages('mrgsolve')")
}
project <- getwd()
model_file <- file.path(project, "interop", "ayflux_reference.cpp")
if (!file.exists(model_file)) stop("Run from the repository root.")
ref_dir <- file.path(project, "interop", "fixtures")
output_dir <- file.path(project, "interop", "results")
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)
model <- mrgsolve::mread("ayflux_reference", project = dirname(model_file))
regimen <- mrgsolve::ev(amt = 700, tinf = 1, cmt = 1, time = 0)
cases <- list(
  list(
    name = "iv_700mg_constant_crcl50",
    CRCL0 = 50, CRCL1 = 50, CRCL2 = 50, T1 = 12, T2 = 24
  ),
  list(
    name = "iv_700mg_dynamic_crcl50_to10_to95",
    CRCL0 = 50, CRCL1 = 10, CRCL2 = 95, T1 = 12, T2 = 24
  )
)
# Match the single-draw nominal AyFlux inputs. AUC/peak and RMSE compare
# implementations, not population predictive validity.
for (case in cases) {
  input <- file.path(ref_dir, paste0(case$name, ".csv"))
  expected <- read.csv(input, stringsAsFactors = FALSE, check.names = FALSE)
  if (!all(c("time_hours", "plasma_acyclovir_mg_L",
             "plasma_cmmg_mg_L") %in% names(expected))) {
    stop("Required fixture columns absent: ", input)
  }
  mod <- mrgsolve::param(
    model, WT = 70, CRCL0 = case$CRCL0, CRCL1 = case$CRCL1,
    CRCL2 = case$CRCL2, T1 = case$T1, T2 = case$T2,
    VCSCALE = 1, CLSCALE = 1, FORMFACTOR = 1, METRENAL = 1,
    HDCL = 0, HDSTART = 30, HDEND = 30, METDIAL = 1
  )
  output <- as.data.frame(
    mrgsolve::mrgsim(mod, events = regimen, end = 24, delta = 0.25,
                     atol = 1e-11, rtol = 1e-9)
  )
  # mrgsolve may emit two rows at the administration boundary (t=0).
  output <- output[!duplicated(output$time, fromLast = TRUE), , drop = FALSE]
  output <- output[order(output$time), , drop = FALSE]
  for (field in c("plasma_acyclovir_mg_L", "plasma_cmmg_mg_L")) {
    if (!field %in% names(output)) stop("Missing mrgsolve capture: ", field)
  }
  aligned <- data.frame(
    time_hours = expected$time_hours,
    ayflux_acyclovir_mg_L = expected$plasma_acyclovir_mg_L,
    mrgsolve_acyclovir_mg_L = stats::approx(
      output$time, output$plasma_acyclovir_mg_L,
      xout = expected$time_hours, rule = 1
    )$y,
    ayflux_cmmg_mg_L = expected$plasma_cmmg_mg_L,
    mrgsolve_cmmg_mg_L = stats::approx(
      output$time, output$plasma_cmmg_mg_L,
      xout = expected$time_hours, rule = 1
    )$y
  )
  if (any(!is.finite(as.matrix(aligned)))) stop("Nonfinite comparison results.")
  score <- function(reference, candidate) {
    delta <- candidate - reference
    c(rmse_mg_L = sqrt(mean(delta^2)),
      max_absolute_error_mg_L = max(abs(delta)),
      normalized_rmse_pct = 100 * sqrt(mean(delta^2)) /
        max(1e-10, max(abs(reference))))
  }
  acv <- score(aligned$ayflux_acyclovir_mg_L,
               aligned$mrgsolve_acyclovir_mg_L)
  cmmg <- score(aligned$ayflux_cmmg_mg_L,
                aligned$mrgsolve_cmmg_mg_L)
  destination <- file.path(output_dir, paste0(case$name, "_overlay.csv"))
  write.csv(aligned, destination, row.names = FALSE)
  cat("\nCase:", case$name, "\n")
  print(rbind(acyclovir = acv, CMMG = cmmg), digits = 4)
  cat("Saved comparison:", destination, "\n")
  # A tolerance for distinct solver implementations; a failure flags a
  # numerical or event-handling difference to investigate.
  if (acv[["normalized_rmse_pct"]] > 2 ||
      cmmg[["normalized_rmse_pct"]] > 2) {
    stop("Comparison exceeds the 2% normalized RMSE investigation threshold: ",
         case$name, " (not a clinical tolerance)")
  }
}
cat("\nmrgsolve model-equation parity checks completed.\n")
