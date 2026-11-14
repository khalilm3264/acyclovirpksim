/* Academic result table; no model equations or patient measurements are exported. */
(function(root){
 'use strict';
 const escapeTex=value=>String(value).replace(/[\\{}%&#_$~^]/g,ch=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','&':'\\&','#':'\\#','_':'\\_','$':'\\$','~':'\\textasciitilde{}','^':'\\textasciicircum{}'}[ch]));
 function latex({run,config,primary,version}){
  if(!run?.summary||!Number.isFinite(config?.horizon))throw Error('Current simulation results are required.');
  const number=value=>{if(!Number.isFinite(value))throw Error('A summary statistic is unavailable.');return String(Number(value.toPrecision(5)));};
  const rows=[['Plasma acyclovir peak','mg/L','peak'],[`Plasma acyclovir AUC (0--${number(config.horizon)} h)`,'mg h/L','auc'],['Plasma CMMG peak','mg/L','mPeak'],['Removed by dialysis','mg','mass'],['Plasma acyclovir at window end','mg/L','endPlasma']];
  const fit=(config.observations||[]).some(o=>o.role==='fit');
  const coverage=Number(config.coverage);if(!(coverage>0&&coverage<1))throw Error('Invalid interval coverage.');
  return `% Requires \\usepackage{booktabs}. Values remain in mg/L regardless of graph units.\n% No individual observations or patient covariates are included.\n\\begin{table}[htbp]\n\\centering\n\\caption{AyFlux ${escapeTex(version||'unknown version')}: ${escapeTex(primary)}; simulation window 0--${number(config.horizon)} h.}\n\\begin{tabular}{llrrr}\n\\toprule\nQuantity & Unit & Median & Lower & Upper \\\\\n\\midrule\n`+
   rows.map(([label,unit,key])=>{const stat=run.summary[key];if(!stat)throw Error('Missing summary: '+key);return `${escapeTex(label)} & ${unit} & ${number(stat.median)} & ${number(stat.lower)} & ${number(stat.upper)} \\\\`;}).join('\n')+
   `\n\\bottomrule\n\\end{tabular}\n\\par\\smallskip\n\\begin{minipage}{0.95\\linewidth}\\footnotesize\nLower and upper columns are the ${number(coverage*100)}\\% ${fit?'measurement-reweighted ensemble':'prior model-ensemble'} interval, not a clinical confidence interval. AUC covers the full simulation window; the end-window concentration is not necessarily a trough or steady-state value. Educational and research simulation; not a dosing recommendation. Scenario assumptions and event timing must accompany interpretation (export the scenario JSON).\n\\end{minipage}\n\\end{table}\n`;
 }
 root.AyFluxAcademic=Object.freeze({latex,escapeTex});
})(typeof window!=='undefined'?window:globalThis);
