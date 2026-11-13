/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
(function(root){
'use strict';
function clearance(pma){
 if(!Number.isFinite(pma)||pma<25||pma>41)throw new RangeError('PMA must be between 25 and 41 weeks.');
 return 0.305*Math.pow(pma/31.3,3.02);
}
const api={clearance,curve:()=>Array.from({length:161},(_,i)=>({pma:25+i/10,clearance:clearance(25+i/10)}))};
if(typeof module!=='undefined')module.exports=api;else root.NeonatalModel=api;
})(globalThis);
