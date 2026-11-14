# Khajehdehi 2000, acyclovir removal during continuous renal replacement therapy

Khajehdehi, Jamal and Bastani studied one anuric adult on two occasions. The membrane, outflow and daily acyclovir dose changed between occasions. The clearance calculation uses a measured effluent concentration and inlet plasma concentration with the reported outflow rate. The cumulative mass calculations require a further assumption that the effluent concentration and outflow stay constant. [Clin Nephrol 2000;54:351–355, PMID 11076113](https://pubmed.ncbi.nlm.nih.gov/11076113/)

## Source measurements

Table 1 and the case narrative on pp. 352–353 provide the following values. Concentrations in µg/mL and mg/L have the same numerical value.

| Quantity | CVVHD | CVVHDF |
| --- | ---: | ---: |
| Dialyzer | F-8 polysulfone | CA-210 cellulose acetate |
| IV acyclovir | 750 mg every 12 h | 500 mg every 24 h |
| Blood flow | 200 mL/min | 200 mL/min |
| Dialysate flow | ~900 mL/h | ~900 mL/h |
| Total outflow | ~1.0 L/h | ~1.7 L/h |
| Inlet / outlet plasma acyclovir | 13 / 13 mg/L | 13 / 10 mg/L |
| Outflow acyclovir | 11 mg/L | 7.9 mg/L |
| Reported clearance | 14 mL/min | 17 mL/min |
| Reported extraction | 84% | 60% |

The narrative gives hourly dialysate and ultrafiltration rates, whereas Table 1 labels these columns in mL/min. The hourly units reproduce the published clearances. The blood-flow rate is in mL/min. Figure 1 on p. 353 labels the CA-210 period CVVHD, while the case narrative identifies it as CVVHDF.

## What the samples support

Effluent concentration divided by inlet plasma concentration gives ratios of 11/13 and 7.9/13. Multiplying by the respective total outflow rates gives effluent-based clearance estimates of **14.10 and 17.22 mL/min**. These are circuit estimates for the respective sampling conditions. Equal printed inlet and outlet plasma concentrations on the first occasion coexist with detectable drug in the effluent. The rounded plasma values alone cannot quantify cumulative removal.

| Interval | Calculation from reported outflow and spot concentration | Interpretation |
| --- | ---: | --- |
| CVVHD, 6 h | 6 × 1.0 × 11 = **66 mg** | Conditional estimate over the reported duration before circuit thrombosis (p. 352). |
| CVVHD, 24 h | 24 × 1.0 × 11 = **264 mg** | Hypothetical uninterrupted operation, equivalent to 17.6% of the prescribed 1,500 mg daily dose. |
| CVVHDF, 24 h | 24 × 1.7 × 7.9 = **322.32 mg** | Fixed-concentration projection, equivalent to 64.5% of the prescribed 500 mg daily dose. |

The paper documents six hours of CVVHD. Establishing actual mass removed would also require a cumulative effluent collection or a time series of outflow and effluent drug concentrations. The 66 mg estimate uses the measured spot value throughout those six hours. Likewise, the CVVHDF plasma concentration curve cannot determine the direction or magnitude of error in the 322 mg extrapolation without corresponding effluent data.

The [reproduction script](khajehdehi-crrt.cjs) checks the clearance arithmetic and dose fractions against rounded published values. Its six-hour result is named `sixHourProjectionMg`. The [CRRT comparison](COLLIGNON-CRRT.md) places these observations alongside the pediatric data.
