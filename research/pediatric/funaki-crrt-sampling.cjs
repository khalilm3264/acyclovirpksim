// Funaki et al., Pediatrics 2015, Figure 1C, printed p. e271.
// Raster coordinates below refer to the PDF page rendered at 1,250 pixels high.
'use strict';
const assert = require('node:assert/strict');
const baselineY = 976, thirtyY = 642;
const samples = [
  {clock:'14:00',hour:14,y:974},{clock:'16:00',hour:16,y:796},
  {clock:'18:00',hour:18,y:971},{clock:'23:00',hour:23,y:918},
  {clock:'01:00',hour:25,y:765},{clock:'03:00',hour:27,y:867},
  {clock:'05:00',hour:29,y:907},{clock:'07:00',hour:31,y:703},
  {clock:'09:00',hour:33,y:824}
];
function concentration(y) { return 30*(baselineY-y)/(baselineY-thirtyY); }
const points = samples.map(s => ({...s,mgL:concentration(s.y)}));
function decline(i,j) {
  const a=points[i], b=points[j], hours=b.hour-a.hour;
  const halfLife = (ca,cb) => hours*Math.LN2/Math.log(ca/cb);
  // One-pixel perturbation in either direction for the two read-off ordinates.
  return {from:a.clock,to:b.clock,apparentHalfLifeH:halfLife(a.mgL,b.mgL),
    pixelRange:[halfLife(concentration(a.y-1),concentration(b.y+1)),
      halfLife(concentration(a.y+1),concentration(b.y-1))]};
}
for (const [index,reported] of [[0,0.22],[1,16.2],[4,18.9],[7,24.5]])
  assert.ok(Math.abs(points[index].mgL-reported)<.13,'reported concentration cross-check');
const crrtOnlyDeclines = [[4,5],[5,6],[4,6]].map(([i,j])=>decline(i,j));
console.log(JSON.stringify({points,crrtOnlyDeclines},null,2));
