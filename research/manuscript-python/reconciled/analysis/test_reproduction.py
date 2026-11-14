#!/usr/bin/env python3
"""Reproducibility smoke tests for the research port (not clinical validation)."""
import numpy as np
from run_studies import simulate,get_at,summarize_interval

a=simulate(crcl=50,dose=700,hd=None,duration=12)
ref={.25:6.94572332582326,.5:12.4529991276958,1:20.4824885149168,8:1.82967897167343,12:.920121838667982}
for time,expected in ref.items():
    value=get_at(a,time,'plasma_acv_mg_L')
    assert abs(value-expected)<.001,(time,value,expected)

iv=simulate()
alt=simulate(solver='dop853')
assert np.max(np.abs(iv.plasma_acv_mg_L-alt.plasma_acv_mg_L))<1e-6
assert (iv[['plasma_acv_mg_L','plasma_cmmg_mg_L','csf_acv_mg_L','csf_cmmg_mg_L']]>=0).all().all()

ckd=simulate(crcl=26,dose=1500,route='oral',n_doses=5,interval=12,duration=60,hd=None)
low=simulate(crcl=26,dose=1500,route='oral',n_doses=5,interval=12,duration=60,hd=None,csf_met_ratio=.025)
ratio=summarize_interval(low,48,60)['csf_cmmg_mg_L_auc']/summarize_interval(ckd,48,60)['csf_cmmg_mg_L_auc']
assert abs(ratio-.1)<1e-9,ratio
print('PASS: 5 source fixture spot checks; DOP853 concordance; nonnegative states; CSF-partition scaling.')
