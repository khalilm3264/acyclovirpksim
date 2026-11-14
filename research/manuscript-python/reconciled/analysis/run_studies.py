#!/usr/bin/env python3
"""AyFlux publication working-paper analyses (educational, not clinical validation).

ODE model independently transcribed from AyFlux's open-source mrgsolve reference
model and browser-engine equations, with fixed nominal parameter values.
GPL notice: Copyright (C) 2026 Muhammad Khalil; SPDX-License-Identifier: AGPL-3.0-only.
This is a transparent *research port*, not execution of the live AyFlux UI engine.
"""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.integrate import solve_ivp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
RESULTS, FIGS, DATA = (ROOT / p for p in ('results','figures','data'))
for d in (RESULTS, FIGS, DATA): d.mkdir(exist_ok=True,parents=True)
MW_ACV, MW_CMMG, MW_VAL = 225.21,239.19,324.34
DT=0.025 # hours; fixed deterministic grid with events at integer multiples of DT

def model_params(weight=70., csf_met_ratio=.25, compartments=2, form_factor=1., hd_cl_ml_min=81.8):
    scale=(weight/70.)**.75
    return dict(weight=weight,vc=.32*weight,vp=.37*weight,vm=.4*weight,
                q=10*scale if compartments==2 else 0.,other=.12*scale,
                form=1.6*form_factor*scale,mn=.5*scale,
                oral_ka=1.8,oral_f=.545,kp=.3,km=csf_met_ratio,
                csf_lag=4.,csf_met_lag=6.,hdcl=hd_cl_ml_min*.06,scale=scale)

def renal_crcl(time, crcl=0, renal_profile=None):
    if renal_profile is None: return crcl
    xs,ys=zip(*renal_profile)
    return float(np.interp(time,xs,ys))

def deriv(t, state, p, crcl, profile, hd_start, hd_end, oral, infusion_rate):
    a,b,m,depot,sc,sm=state
    C=a/p['vc']; Cp=b/p['vp']; Cm=m/p['vm']
    scale=p['scale']; current_crcl=renal_crcl(t,crcl,profile)
    renal=.202*current_crcl*scale
    met_renal=.12*current_crcl*scale
    HD=p['hdcl'] if hd_start<=t<hd_end else 0.
    flux=p['q']*(C-Cp)
    da=infusion_rate+p['oral_ka']*depot-(p['other']+renal+p['form']+HD)*C-flux
    db=flux
    dm=p['form']*C*(MW_CMMG/MW_ACV)-(p['mn']+met_renal+HD)*Cm
    dd=-p['oral_ka']*depot
    dsc=(p['kp']*C-sc)/p['csf_lag']
    dsm=(p['km']*Cm-sm)/p['csf_met_lag']
    return np.array([da,db,dm,dd,dsc,dsm],float)

def simulate(*, weight=70, crcl=0, profile=None, duration=72, dose=175, route='iv',
             interval=None, n_doses=1, infusion_hours=1, hd=(48,54),
             compartments=2, csf_met_ratio=.25, form_factor=1, hd_cl_ml_min=81.8,
             solver='rk4', dt=DT):
    """Returns deterministic nominal time series, with discontinuities aligned to grid.

    IV dose in mg acyclovir; oral dose in mg valacyclovir free base.
    Parallel two-compartment plasma/CMMG and exploratory first-order CSF delay.
    HD is (start_hour, end_hour); None = no HD.
    """
    p=model_params(weight,csf_met_ratio,compartments,form_factor,hd_cl_ml_min)
    t=np.round(np.arange(0,duration+dt/2,dt),10)
    state=np.zeros((len(t),6),float)
    doses=[round(j*(interval or 1e9),8) for j in range(n_doses)]
    starts=set(round(x,8) for x in doses if x < duration+1e-8)
    if hd is None: hs,he=np.inf,np.inf
    else: hs,he=hd
    for i in range(len(t)-1):
        current=float(t[i]); h=float(t[i+1]-current)
        y=state[i].copy()
        if round(current,8) in starts and route=='oral':
            y[3] += dose*(MW_ACV/MW_VAL)*p['oral_f']
        state[i]=y
        rate=0.
        if route=='iv' and any(d<=current+1e-8 and current<d+infusion_hours-1e-8 for d in starts):
            rate=sum(d<=current+1e-8 and current<d+infusion_hours-1e-8 for d in starts)*dose/infusion_hours
        # For RK4, use active HD at interval midpoint to avoid end-event RK stages crossing schedules.
        hd_flag=(hs <= current+h/2 < he)
        at_hd=(0, np.inf) if hd_flag else (np.inf,np.inf)
        def rhs(tt, yy):
            # HD on/off held constant throughout current fixed step, matching browser engine.
            return deriv(tt,yy,p,crcl,profile,at_hd[0],at_hd[1],route=='oral',rate)
        if solver=='rk4':
            k1=rhs(current,y);k2=rhs(current+h/2,y+h*k1/2)
            k3=rhs(current+h/2,y+h*k2/2);k4=rhs(current+h,y+h*k3)
            state[i+1]=np.maximum(0, y+h*(k1+2*k2+2*k3+k4)/6)
        elif solver=='dop853':
            state[i+1]=np.maximum(0,solve_ivp(rhs,(current,current+h),y,method='DOP853',rtol=2e-12,atol=1e-13).y[:,-1])
        else: raise ValueError(solver)
    # End dose is excluded; no need to apply at final time.
    C=state[:,0]/p['vc'];Cm=state[:,2]/p['vm']
    return pd.DataFrame(dict(time_h=t,plasma_acv_mg_L=C,plasma_cmmg_mg_L=Cm,
                             csf_acv_mg_L=state[:,4],csf_cmmg_mg_L=state[:,5],
                             crcl_ml_min=[renal_crcl(x,crcl,profile) for x in t]))

def auc(x,y): return float(np.trapezoid(y,x))
def get_at(df,hh,key): return float(np.interp(hh,df.time_h,df[key]))

def summarize_interval(df,start,end):
    q=df[(df.time_h>=start-1e-8)&(df.time_h<=end+1e-8)]
    out={}
    for key in ['plasma_acv_mg_L','csf_acv_mg_L','plasma_cmmg_mg_L','csf_cmmg_mg_L']:
        out[key+'_cmax']=float(q[key].max())
        out[key+'_auc']=auc(q.time_h.to_numpy(),q[key].to_numpy())
    out['acv_csf_plasma_auc_ratio']=out['csf_acv_mg_L_auc']/out['plasma_acv_mg_L_auc']
    out['cmmg_csf_plasma_auc_ratio']=out['csf_cmmg_mg_L_auc']/out['plasma_cmmg_mg_L_auc']
    return out

def fig_save(name):
    plt.tight_layout(); plt.savefig(FIGS/name,dpi=200,bbox_inches='tight');plt.close()

def main():
    # Group mean +/- SD from Laskin (1982). These are summary observations, NOT individual longitudinal curves.
    obs=pd.DataFrame([
        ('Post-infusion peak',1.,37.5,23.3),('8 h',8.,10.3,2.9),('24 h',24.,6.4,2.4),
        ('Pre-HD (approximately 48 h)',48.,2.74,1.38),('Post-HD (approximately 54 h)',54.,1.11,.60)
    ],columns=['label','nominal_time_h','mean_uM','sd_uM'])
    obs['mean_mg_L']=obs.mean_uM*MW_ACV/1000
    obs['sd_mg_L']=obs.sd_uM*MW_ACV/1000
    obs['source']='Laskin et al. 1982, doi:10.1038/clpt.1982.83 (abstract group summaries)'
    obs['timing_note']='HD approximately 48-54 h; published group measurements not exact time-matched individual curves'
    obs.to_csv(DATA/'laskin_1982_group_summaries.csv',index=False)
    hd=simulate(); nohd=simulate(hd=None)
    hd.to_csv(RESULTS/'case1_nominal_hd_profile.csv',index=False)
    nohd.to_csv(RESULTS/'case1_nominal_no_hd_profile.csv',index=False)
    obs['nominal_model_mg_L']=[get_at(hd,t,'plasma_acv_mg_L') for t in obs.nominal_time_h]
    obs['model_minus_mean_mg_L']=obs.nominal_model_mg_L-obs.mean_mg_L
    obs['mean_relative_error_pct']=100*obs.model_minus_mean_mg_L/obs.mean_mg_L
    obs.to_csv(RESULTS/'case1_observed_vs_nominal_model.csv',index=False)
    # Numerical solver comparison: checks numerical consistency, not clinical prediction.
    accurate=simulate(solver='dop853')
    delta=hd.plasma_acv_mg_L.to_numpy()-accurate.plasma_acv_mg_L.to_numpy()
    solver_metrics={'max_absolute_error_mg_L':float(np.max(np.abs(delta))),
                    'rmse_mg_L':float(np.sqrt(np.mean(delta**2))),
                    'normalized_rmse_pct':float(100*np.sqrt(np.mean(delta**2))/max(1e-15,accurate.plasma_acv_mg_L.max()))}
    # Spot-check a distinct 700-mg no-dialysis test fixture captured from the AyFlux GitHub repository.
    fixture=simulate(crcl=50,dose=700,hd=None,duration=18.25)
    fixture_points={.25:6.94572332582326,.5:12.4529991276958,1:20.4824885149168,8:1.82967897167343,12:.920121838667982}
    fixture_comparison=[dict(time_h=h,repo_fixture_mg_L=v,port_mg_L=get_at(fixture,h,'plasma_acv_mg_L'),error_mg_L=get_at(fixture,h,'plasma_acv_mg_L')-v) for h,v in fixture_points.items()]
    fixture_maxerr=max(abs(x['error_mg_L']) for x in fixture_comparison)
    # Do not claim a complete fixture reproduction from five published fixture values.
    pd.DataFrame(fixture_comparison).to_csv(RESULTS/'partial_github_fixture_check.csv',index=False)
    # Case 2 published mean pharmacokinetic summaries from Smith et al. Table 1.
    table=[]
    # group, analyte, compartment, Cmax uM, AUC in h*uM
    for group,values in [
      ('normal', [('acv','plasma',42,137),('acv','csf',7.8,37),('cmmg','plasma',4.1,17),('cmmg','csf',.095,.42)]),
      ('ckd', [('acv','plasma',82,577),('acv','csf',16,159),('cmmg','plasma',15,148),('cmmg','csf',.37,3.8)])]:
        for analyte,site,cmax_uM,auc_uM in values:
            mw=MW_ACV if analyte=='acv' else MW_CMMG
            table.append(dict(group=group,analyte=analyte,compartment=site,
                              cmax_uM=cmax_uM,auc_h_uM=auc_uM,
                              cmax_mg_L=cmax_uM*mw/1000,auc_h_mg_L=auc_uM*mw/1000,
                              source='Smith et al. 2010 Table 1, doi:10.1128/AAC.00729-09'))
    observed=pd.DataFrame(table)
    observed.to_csv(DATA/'smith_2010_table1_group_summaries.csv',index=False)
    c2=[]; trajectories={}
    for group,crcl,dose,interval in [('normal',111,2000,6),('ckd',26,1500,12)]:
        start=4*interval;end=5*interval
        model=simulate(crcl=crcl,dose=dose,route='oral',n_doses=5,interval=interval,duration=end,hd=None)
        model['hours_after_fifth_dose']=model.time_h-start
        model.to_csv(RESULTS/f'case2_{group}_trajectory.csv',index=False)
        trajectories[group]=model
        measures=summarize_interval(model,start,end)
        for _,row in observed[observed.group==group].iterrows():
            col=f"{row.compartment}_{row.analyte}_mg_L"
            c2.append(dict(group=group,analyte=row.analyte,compartment=row.compartment,
                           dose_valacyclovir_mg=dose,dosing_interval_h=interval,crcl_assumed_ml_min=crcl,
                           observed_cmax_mg_L=row.cmax_mg_L,model_cmax_mg_L=measures[col+'_cmax'],
                           observed_auc_h_mg_L=row.auc_h_mg_L,model_auc_h_mg_L=measures[col+'_auc'],
                           model_to_observed_auc_ratio=measures[col+'_auc']/row.auc_h_mg_L))
        print(group,measures)
    pd.DataFrame(c2).to_csv(RESULTS/'case2_observed_vs_nominal_model.csv',index=False)
    # ABLATIONS: perturb model assumptions, report changed simulation outputs, not improved fit.
    variants=[]
    def add(name,study,df,baseline,window):
        s,e=window;m=summarize_interval(df,s,e);b=summarize_interval(baseline,s,e)
        for endpoint in ['plasma_acv_mg_L_auc','plasma_acv_mg_L_cmax','plasma_cmmg_mg_L_auc','csf_cmmg_mg_L_auc']:
            variants.append(dict(study=study,variant=name,endpoint=endpoint,baseline=b[endpoint],variant_value=m[endpoint],
                                 percent_change=100*(m[endpoint]/b[endpoint]-1) if b[endpoint]>1e-12 else np.nan))
    add('Without hemodialysis','case1_hd_48_to54',nohd,hd,(48,54))
    one=simulate(compartments=1)
    add('Suppress peripheral exchange (Q=0)','case1_hd_48_to54',one,hd,(0,24))
    ckd=trajectories['ckd']
    ckd_lowratio=simulate(crcl=26,dose=1500,route='oral',n_doses=5,interval=12,duration=60,hd=None,csf_met_ratio=.025)
    add('Exploratory CSF CMMG parameter 0.025 vs 0.25','case2_ckd',ckd_lowratio,ckd,(48,60))
    changing=simulate(crcl=50,profile=[(0,50),(12,10),(24,95)],dose=700,duration=24,hd=None)
    constant=simulate(crcl=50,dose=700,duration=24,hd=None)
    add('Dynamic CrCl 50->10->95 vs constant 50','case3_renal_profile',changing,constant,(0,24))
    abl=pd.DataFrame(variants)
    abl.to_csv(RESULTS/'ablation_table.csv',index=False)
    # Alternative CSF CMMG parameter: a sensitivity hypothesis, not independent validation.
    revised=summarize_interval(ckd_lowratio,48,60)
    current=summarize_interval(ckd,48,60)
    revised_info={
        'observed_csf_cmmg_auc_h_mg_L':float(observed[(observed.group=='ckd')&(observed.analyte=='cmmg')&(observed.compartment=='csf')].auc_h_mg_L.iloc[0]),
        'default_0p25_model_csf_cmmg_auc_h_mg_L':current['csf_cmmg_mg_L_auc'],
        'alternative_0p025_model_csf_cmmg_auc_h_mg_L':revised['csf_cmmg_mg_L_auc'],
        'note':'Parameter selected using the same Smith et al. observations; not external validation.'}
    (RESULTS/'csf_cmmg_partition_hypothesis.json').write_text(json.dumps(revised_info,indent=2),encoding='utf-8')
    # Show data points and model trace on same units with published SD (not SEM/CI).
    fig,ax=plt.subplots(figsize=(9.1,4.7))
    ax.plot(hd.time_h,hd.plasma_acv_mg_L,label='Nominal reconstruction: HD 48–54 h',linewidth=2)
    ax.plot(nohd.time_h,nohd.plasma_acv_mg_L,label='Nominal reconstruction: no dialysis',linewidth=1.6,ls='--')
    ax.errorbar(obs.nominal_time_h,obs.mean_mg_L,yerr=obs.sd_mg_L,fmt='o',color='black',capsize=4,
                label='Laskin 1982 group mean ± SD',zorder=5)
    ax.axvspan(48,54,alpha=.12,label='Illustrative HD window')
    ax.set(yscale='log',xlabel='Hours after 2.5 mg/kg infusion started',ylabel='Plasma acyclovir (mg/L)',
           title='Case 1 — Published hemodialysis summaries vs nominal AyFlux equations',xlim=(-1,70),ylim=(.03,30))
    ax.legend(loc='upper right',fontsize=8);ax.grid(alpha=.2)
    fig_save('fig1_laskin_hemodialysis_benchmark.png')
    fig,axes=plt.subplots(2,2,figsize=(10,6),sharex='col')
    for j,group in enumerate(['normal','ckd']):
        d=trajectories[group]
        segment=d[d.hours_after_fifth_dose>=-1e-8]
        for i,(key,title) in enumerate([('plasma_acv_mg_L','Plasma acyclovir'),('csf_cmmg_mg_L','CSF CMMG')]):
            ax=axes[i,j];ax.plot(segment.hours_after_fifth_dose,segment[key]);ax.grid(alpha=.2)
            ax.set_title(f'{title} — {group.upper()}');ax.set_ylabel('Concentration (mg/L)')
            if i==1:ax.set_xlabel('Hours since fifth oral dose')
    fig.suptitle('Case 2 — Nominal model profiles (NOT matched patient-level data)',fontsize=13)
    fig_save('fig2_smith_valacyclovir_nominal_profiles.png')
    rows=[('Remove HD','case1_hd_48_to54','Without hemodialysis','plasma_acv_mg_L_auc'),
          ('Suppress peripheral exchange','case1_hd_48_to54','Suppress peripheral exchange (Q=0)','plasma_acv_mg_L_auc'),
          ('Lower CSF CMMG partition','case2_ckd','Exploratory CSF CMMG parameter 0.025 vs 0.25','csf_cmmg_mg_L_auc'),
          ('Dynamic renal function','case3_renal_profile','Dynamic CrCl 50->10->95 vs constant 50','plasma_acv_mg_L_auc')]
    labels=[];effects=[]
    for label,study,variant,endpoint in rows:
        v=abl[(abl.study==study)&(abl.variant==variant)&(abl.endpoint==endpoint)]
        labels.append(label);effects.append(float(v.percent_change.iloc[0]))
    fig,ax=plt.subplots(figsize=(9,3.6))
    ax.barh(labels,effects)
    ax.axvline(0,color='gray',lw=1);ax.set_xlabel('Change in selected modeled AUC (%)')
    ax.set_title('Ablations: sensitivity, not proof of predictive accuracy');ax.grid(axis='x',alpha=.2)
    fig_save('fig3_ablation_targeted_effects.png')
    fig,axes=plt.subplots(1,2,figsize=(10,4.8),sharey=True)
    for ax,group in zip(axes,['normal','ckd']):
        tmp=pd.DataFrame(c2);sub=tmp[tmp.group==group]
        xx=np.arange(len(sub));w=.38
        ax.barh(xx-w/2,sub.observed_auc_h_mg_L,height=w,label='Published group mean')
        ax.barh(xx+w/2,sub.model_auc_h_mg_L,height=w,label='Nominal model')
        ax.set_yticks(xx,labels=[f'{r.analyte.upper()} {r.compartment.upper()}' for _,r in sub.iterrows()])
        ax.set_xscale('log');ax.grid(axis='x',alpha=.2)
        ax.set_title(group.upper());ax.invert_yaxis();ax.set_xlabel('AUC over last dosing interval (mg·h/L)')
    axes[0].legend(fontsize=8,loc='lower right')
    fig.suptitle('Case 2 — Model vs published summary exposure (not patient-matched)',fontsize=12)
    fig_save('fig4_smith_auc_comparison.png')
    summary=dict(case1=list(obs[['label','nominal_time_h','mean_mg_L','nominal_model_mg_L','mean_relative_error_pct']].to_dict('records')),
                 solver=solver_metrics,fixture_max_abs_error_mg_L=fixture_maxerr,
                 case2=pd.DataFrame(c2).to_dict('records'),
                 ablations=abl.to_dict('records'),partition_hypothesis=revised_info,
                 limitations=['Clinical literature contains group summaries, not patient-level observations.','70 kg is assumed for all simulations.',
                   'CSF predictions are lagged equilibrium proxies, not measured-compartment fits.',
                   'The CMMG CSF partition default of 0.25 conflicts with published AUC ratio ~0.025.',
                   'Matching ODE solvers does not validate population pharmacokinetics.',
                   'Laskin HD start/end times are approximations; reported post-HD sample time has uncertainty.',
                   'The 0.202 times CrCl renal clearance relationship is the project model assumption, not estimated from these study participants.'])
    (RESULTS/'summary.json').write_text(json.dumps(summary,indent=2,allow_nan=False),encoding='utf-8')
    print('LASKIN OBSERVED VS MODEL:\n',obs[['label','mean_mg_L','nominal_model_mg_L','mean_relative_error_pct']].to_string(index=False))
    print('SOLVER',solver_metrics,'FIXTURE_MAX_ERROR',fixture_maxerr)
    print('CASE 2:\n',pd.DataFrame(c2).to_string(index=False))
    print('ABLATIONS TARGETED:\n',list(zip(labels,effects)))
if __name__=='__main__':main()
