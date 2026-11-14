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
local_double scale = pow(WT/70.0, 0.75);
local_double Vc = 0.32*WT*VCSCALE;
local_double Vp = 0.37*WT;
local_double Vm = 0.40*WT;
local_double Q  = 10.0*scale;
local_double other = 0.12*scale*CLSCALE;
local_double form = 1.6*FORMFACTOR*scale;
local_double crcl = CRCL0;
if(SOLVERTIME < T1 && T1 > 0) {
  crcl = CRCL0 + (CRCL1-CRCL0)*SOLVERTIME/T1;
} else if(SOLVERTIME <= T2 && T2 > T1) {
  crcl = CRCL1 + (CRCL2-CRCL1)*(SOLVERTIME-T1)/(T2-T1);
} else {
  crcl = CRCL2;
}
local_double renal = 0.202*crcl*scale*CLSCALE;
local_double metRenal = 0.12*crcl*METRENAL*scale;
local_double hd = (SOLVERTIME >= HDSTART && SOLVERTIME < HDEND) ? HDCL*0.06 : 0;
local_double cc = CENT/Vc;
local_double cp = PERI/Vp;
local_double flux = Q*(cc-cp);
dxdt_CENT = -(other+renal+form+hd)*cc - flux;
dxdt_PERI = flux;
dxdt_MET = form*cc*(239.19/225.21)
           -(0.5*scale+metRenal+hd*METDIAL)*MET/Vm;

$TABLE
capture plasma_acyclovir_mg_L = CENT/(0.32*WT*VCSCALE);
capture plasma_cmmg_mg_L = MET/(0.40*WT);
