# AyFlux -> R / Open Systems Pharmacology comparison helper (base R)
# Copyright (C) 2026 Muhammad Khalil
# SPDX-License-Identifier: AGPL-3.0-only
# Not for clinical use. See docs/data-exchange.md for required unit checks.

read_ayflux_curve <- function(file,
                              scenario = "No dialysis",
                              analyte = "plasma_acyclovir",
                              statistic = "median") {
  data <- utils::read.csv(file, check.names = FALSE, stringsAsFactors = FALSE)
  required <- c("time_hours", "scenario", "analyte", "statistic",
                "concentration_mg_L")
  missing <- setdiff(required, names(data))
  if (length(missing)) {
    stop("Missing AyFlux column(s): ", paste(missing, collapse = ", "))
  }
  selected <- data[data$scenario == scenario &
                   data$analyte == analyte &
                   data$statistic == statistic, , drop = FALSE]
  if (!nrow(selected)) {
    stop("No rows for scenario/analyte/statistic combination; inspect unique columns.")
  }
  time <- suppressWarnings(as.numeric(selected$time_hours))
  value <- suppressWarnings(as.numeric(selected$concentration_mg_L))
  if (any(!is.finite(time)) || any(time < 0) || any(!is.finite(value))) {
    stop("AyFlux contains nonnumeric or nonfinite time/concentration data.")
  }
  out <- data.frame(time_hours = time, concentration_mg_L = value,
                    source = "AyFlux")
  out[order(out$time_hours), , drop = FALSE]
}

read_osp_curve <- function(file, time_column, concentration_column,
                           time_unit = "h",
                           concentration_unit = "mg/L",
                           separator = ",", decimal = ".") {
  # OSP CSV exports vary by software and output selection. Explicitly select
  # the columns and units; this does not load an OSP .pkml model.
  data <- utils::read.table(
    file, header = TRUE, sep = separator, dec = decimal,
    check.names = FALSE, stringsAsFactors = FALSE, quote = '"',
    comment.char = ""
  )
  needed <- c(time_column, concentration_column)
  if (!all(needed %in% names(data))) {
    stop("Column not found. Available columns: ", paste(names(data), collapse = ", "))
  }
  if (!time_unit %in% c("h", "min", "day")) {
    stop("Time unit must be 'h', 'min', or 'day'.")
  }
  if (!concentration_unit %in% c("mg/L", "ug/mL", "µg/mL")) {
    stop("Concentration unit must be 'mg/L' or 'ug/mL' (equivalent). ",
         "Convert other units explicitly before comparison.")
  }
  time <- suppressWarnings(as.numeric(data[[time_column]]))
  value <- suppressWarnings(as.numeric(data[[concentration_column]]))
  if (any(!is.finite(time)) || any(!is.finite(value)) ||
      any(time < 0)) {
    stop("OSP export contains nonnumeric or nonfinite time/concentration values.")
  }
  if (time_unit == "min") time <- time / 60
  if (time_unit == "day") time <- time * 24

  # 1 µg/mL = 1 mg/L; no numeric scaling is needed.
  out <- data.frame(time_hours = time, concentration_mg_L = value,
                    source = "PK-Sim / MoBi")
  out[order(out$time_hours), , drop = FALSE]
}

plot_overlay <- function(ayflux, osp,
                         title = "Acyclovir: AyFlux and PK-Sim / MoBi") {
  needed <- c("time_hours", "concentration_mg_L")
  if (!all(needed %in% names(ayflux)) || !all(needed %in% names(osp))) {
    stop("Both curves need time_hours and concentration_mg_L.")
  }
  if (!nrow(ayflux) || !nrow(osp)) stop("No points to plot.")
  xlim <- range(c(ayflux$time_hours, osp$time_hours), finite = TRUE)
  ylim <- range(c(ayflux$concentration_mg_L, osp$concentration_mg_L),
                finite = TRUE)
  plot(ayflux$time_hours, ayflux$concentration_mg_L,
       type = "l", col = "#0054E9", lwd = 2, xlim = xlim, ylim = ylim,
       xlab = "Time since simulation start (hours)",
       ylab = "Concentration (mg/L)", main = title)
  lines(osp$time_hours, osp$concentration_mg_L,
        col = "#B85B21", lwd = 2, lty = 2)
  legend("topright", legend = c("AyFlux model median", "PK-Sim / MoBi"),
         col = c("#0054E9", "#B85B21"), lwd = 2, lty = c(1, 2), bty = "n")
  invisible(list(ayflux = ayflux, osp = osp))
}
