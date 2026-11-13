"""Reproducible case-study update using Laskin (1982) full-text tables.
Published individual kinetic parameters are fitted to the study data and not independent observations.
Clinical use is not supported; AyFlux's published-literature HD clearance is circular here.
"""
import sys
from pathlib import Path
import numpy as np, pandas as pd
from scipy.integrate import solve_ivp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from run_studies import ROOT,simulate,MW_ACV
D=ROOT/'data'; R=ROOT/'results'; F=ROOT/'figures'
patients=pd.DataFrame([
# id sex age kg cm bsa alpha_half beta_half k12 k21 kel V1 Vdss CLtot kdial CLdial HDhalf
[1,'F',72,74,173,1.90,.98,21.70,.300,.383,.059,20.80,37.10,20.5,.191,72.6,5.90],
[2,'M',30,57,172,1.65,.30,15.04,1.650,.500,.214,9.73,41.86,34.7,.588,91.1,4.86],
[3,'M',45,48,173,1.52,.65,16.67,.563,.448,.099,19.50,44.00,32.2,.234,66.7,5.68],
[4,'M',30,52.9,173,1.60,1.81,13.02,.133,.203,.100,25.49,42.19,42.5,.208,81.5,5.82],
[5,'F',63,50.1,163,1.51,.25,21.28,1.900,.812,.112,12.49,41.73,23.3,.427,77.7,4.93],
[6,'M',35,63.2,185,1.80,.29,29.16,1.940,.192,.299,3.63,40.31,18.1,1.607,101.2,7.19]],
columns=['patient','sex','age_y','weight_kg','height_cm','bsa_m2','t12alpha_h','t12beta_h','k12_h_inv','k21_h_inv','kel_h_inv','V1_L_per_1p73m2','Vdss_L_per_1p73m2','CLtotal_mL_min_per_1p73m2','kdial_h_inv','CLdial_mL_min','HD_t12beta_h'])
patients['dose_mg']=2.5*patients.weight_kg
patients['V1_actual_L']=patients.V1_L_per_1p73m2*patients.bsa_m2/1.73
patients['CLdial_calculated_mL_min']=patients.kdial_h_inv*patients.V1_actual_L*1000/60
patients['CLtotal_calculated_norm_mL_min']=patients.kel_h_inv*patients.V1_L_per_1p73m2*1000/60
patients.to_csv(D/'laskin_fulltext_6_patient_pk.csv',index=False)

h=[.1,1,2,3,4,5,6]
hd=pd.DataFrame({'hours_into_hd':h,'arterial_mean_uM':[2.10,1.86,1.61,1.37,1.25,1.14,1.00],
'arterial_sd_uM':[1.16,.90,.86,.76,.71,.63,.58],
'venous_mean_uM':[1.20,1.08,.93,.77,.63,.53,.50],
'extraction_mean':[.40,.43,.42,.44,.50,.53,.41]})
for site in ('arterial','venous'):
 hd[site+'_mean_mg_L']=hd[site+'_mean_uM']*MW_ACV/1000
hd['arterial_sd_mg_L']=hd.arterial_sd_uM*MW_ACV/1000
hd.to_csv(D/'laskin_fulltext_table_III_hd.csv',index=False)

def reference(p):
    y=np.zeros(2); pts=[]; grid=np.arange(0,60.000001,.05)
    for a,b,rate,dial in [(0,1,p.dose_mg,0),(1,48,0,0),(48,54,0,p.kdial_h_inv),(54,60,0,0)]:
        def rhs(t,z):
            A,B=z
            return [rate-(p.kel_h_inv+p.k12_h_inv+dial)*A+p.k21_h_inv*B,p.k12_h_inv*A-p.k21_h_inv*B]
        tgrid=grid[(grid>=a-1e-8)&(grid<=b+1e-8)]
        sol=solve_ivp(rhs,(a,b),y,t_eval=tgrid,method='DOP853',rtol=1e-10,atol=1e-12)
        if not sol.success:raise RuntimeError(sol.message)
        pts.extend(zip(np.round(sol.t,3),(sol.y[0]/p.V1_actual_L)))
        y=sol.y[:,-1]
    return dict(pts)

all_points=[]
for p in patients.itertuples(index=False):
    fitted=reference(p)
    model=simulate(weight=p.weight_kg,crcl=0,dose=p.dose_mg,duration=60,dt=.05,hd=(48,54),hd_cl_ml_min=81.8)
    for t,fit in fitted.items():
        all_points.append([p.patient,t,fit,float(np.interp(t,model.time_h,model.plasma_acv_mg_L))])
curve=pd.DataFrame(all_points,columns=['patient','time_h','laskin_fitted_mg_L','ayflux_structural_mg_L'])
curve.to_csv(R/'laskin_fulltext_subject_profiles.csv',index=False)
mean_curve=curve.groupby('time_h',as_index=False)[['laskin_fitted_mg_L','ayflux_structural_mg_L']].mean()
obs=pd.DataFrame({'time_h':[1,8,24,48,54],'published_mean_uM':[37.5,10.3,6.4,2.74,1.11],
'published_sd_uM':[23.3,2.9,2.4,1.38,.60]})
obs['published_mean_mg_L']=obs.published_mean_uM*MW_ACV/1000
obs['published_sd_mg_L']=obs.published_sd_uM*MW_ACV/1000
for name in ['laskin_fitted','ayflux_structural']:
 obs[name+'_mg_L']=np.interp(obs.time_h,mean_curve.time_h,mean_curve[name+'_mg_L'])
 obs[name+'_pct_err']=100*(obs[name+'_mg_L']/obs.published_mean_mg_L-1)
obs.to_csv(R/'laskin_fulltext_group_checkpoints.csv',index=False)
hd['time_h']=48+hd.hours_into_hd
for name in ['laskin_fitted','ayflux_structural']:
 hd[name+'_mg_L']=np.interp(hd.time_h,mean_curve.time_h,mean_curve[name+'_mg_L'])
hd.to_csv(R/'laskin_fulltext_hd_arterial_compare.csv',index=False)

fig,ax=plt.subplots(figsize=(9.5,5.3))
ax.plot(mean_curve.time_h,mean_curve.ayflux_structural_mg_L,label='AyFlux equations, actual weights, uncalibrated',lw=2.2)
ax.plot(mean_curve.time_h,mean_curve.laskin_fitted_mg_L,label='Laskin fitted patient-specific models',lw=2,ls='--')
ax.errorbar(obs.time_h,obs.published_mean_mg_L,yerr=obs.published_sd_mg_L,fmt='o',color='black',capsize=3,label='Reported group mean ± SD')
ax.axvspan(48,54,alpha=.10,color='gray',label='Six-hour HD session')
ax.set(xlabel='Hours since IV infusion began',ylabel='Plasma acyclovir (mg/L)',title='Laskin 1982: subject-informed model comparison',xlim=(0,60),ylim=(.04,30),yscale='log')
ax.grid(alpha=.2);ax.legend(fontsize=8);fig.tight_layout();fig.savefig(F/'fig5_laskin_fulltext_subject_informed.png',dpi=190);plt.close(fig)

fig,ax=plt.subplots(figsize=(8.8,4.8))
ax.errorbar(hd.hours_into_hd,hd.arterial_mean_mg_L,yerr=hd.arterial_sd_mg_L,fmt='o',capsize=3,color='black',label='Pre-dialyzer arterial plasma ± SD')
ax.plot(hd.hours_into_hd,hd.ayflux_structural_mg_L,'-s',label='AyFlux central concentration')
ax.plot(hd.hours_into_hd,hd.laskin_fitted_mg_L,'--',label='Laskin fitted central concentration')
ax.set(xlabel='Hours into hemodialysis',ylabel='Acyclovir (mg/L)',title='Laskin 1982: Table III arterial measurements')
ax.grid(alpha=.2);ax.legend(fontsize=8);fig.tight_layout();fig.savefig(F/'fig6_laskin_fulltext_hd_arterial.png',dpi=190);plt.close(fig)
print(obs[['time_h','published_mean_mg_L','laskin_fitted_mg_L','ayflux_structural_mg_L','laskin_fitted_pct_err','ayflux_structural_pct_err']].round(3).to_string(index=False))
print('Mean wt',round(patients.weight_kg.mean(),3),'Mean dose',round(patients.dose_mg.mean(),3),'mean clearance ref',round(patients.CLdial_mL_min.mean(),3))
print('Max CLdial reconstruction error',round(abs(patients.CLdial_calculated_mL_min-patients.CLdial_mL_min).max(),3))
