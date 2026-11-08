// AyFlux deterministic IV acyclovir + CMMG comparison model (mrgsolve/C++).
// Copyright (C) 2026 Muhammad Khalil; SPDX-License-Identifier: AGPL-3.0-only
// FOR EDUCATION AND IMPLEMENTATION CHECKS; NOT VALIDATED FOR PATIENT CARE.
// Mirrors the simplified compartments in public/assets/pk-engine.js for
// no dialysis or one continuous HD window. PD and CRRT are NOT represented.
// Mass units: mg; volume: L; clearances: L/h; time: h; concentrations: mg/L.
// Reference documentation: docs/research-model-comparison.md

$PARAM
WT = 70, CRCL0 = 50, CRCL1 = 50, CRCL2 = 50,
T1 = 12, T2 = 24,
VCSCALE = 1, CLSCALE = 1, FORMFACTOR = 1, METRENAL = 1,
HDCL = 0, HDSTART = 8, HDEND = 12, METDIAL = 1

$CMT CENT PERI MET

$ODE
const double scale = pow(WT/70.0, 0.75);
const double Vc = 0.32*WT*VCSCALE;
const double Vp = 0.37*WT;
const double Vm = 0.40*WT;
const double Q  = 10.0*scale;
const double other = 0.12*scale*CLSCALE;
const double form = 1.6*FORMFACTOR*scale;
double crcl = CRCL0;
if(SOLVERTIME < T1 && T1 > 0) {
  crcl = CRCL0 + (CRCL1-CRCL0)*SOLVERTIME/T1;
} else if(SOLVERTIME <= T2 && T2 > T1) {
  crcl = CRCL1 + (CRCL2-CRCL1)*(SOLVERTIME-T1)/(T2-T1);
} else {
  crcl = CRCL2;
}
const double renal = 0.202*crcl*scale*CLSCALE;
const double metRenal = 0.12*crcl*METRENAL*scale;
const double hd = (SOLVERTIME >= HDSTART && SOLVERTIME < HDEND) ? HDCL*0.06 : 0;
const double cc = CENT/Vc;
const double cp = PERI/Vp;
const double flux = Q*(cc-cp);
dxdt_CENT = -(other+renal+form+hd)*cc - flux;
dxdt_PERI = flux;
dxdt_MET = form*cc*(239.19/225.21)
           -(0.25*scale+metRenal+hd*METDIAL)*MET/Vm;

$TABLE
capture plasma_acyclovir_mg_L = CENT/(0.32*WT*VCSCALE);
capture plasma_cmmg_mg_L = MET/(0.40*WT);
