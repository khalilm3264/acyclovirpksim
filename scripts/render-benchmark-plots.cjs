'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const echarts = require(process.argv[2] || 'echarts');
const output = execFileSync(process.execPath,
  [path.resolve(__dirname, '../research/validation/compare-benchmarks.cjs')], {encoding: 'utf8'});
const rows = output.split('\n').filter(line => line.startsWith('| ')).slice(1).map(line =>
  line.split('|').slice(1, -1).map(value => value.trim()));
const groups = [
  {file: 'concentrations', unit: 'Concentration (mg/L)', match: row => row[0].includes('(mg/L)')},
  {file: 'vasquez-recovery', unit: 'Recovery (mg)', match: row =>
    row[0].startsWith('Vasquez') && row[0].includes('(mg)')},
  {file: 'boelaert-recovery', unit: 'Recovery (% of total dose)', match: row => row[0].startsWith('Boelaert')}
];
const destination = path.resolve(__dirname, '../public/learn/model-methods/benchmarks');
fs.mkdirSync(destination, {recursive: true});
for (const group of groups) {
  const data = rows.filter(group.match);
  const labels = data.map(row => row[0].replace(/ \((mg\/L|mg|%)\)$/, '')
    .replace('Kacířová ', '').replace('Vasquez ', '').replace('Bataille ', '')
    .replace('Boelaert ', '').replace('Urinary recovery over 16 + 14 h', 'Urine, 30 h')
    .replace('HD1 inlet at start', 'HD1 serum, start').replace('HD1 inlet at 2 h', 'HD1 serum, 2 h'));
  const chart = echarts.init(null, null, {renderer: 'svg', ssr: true,
    width: 760, height: 130 + data.length * 38});
  chart.setOption({
    animation: false, backgroundColor: '#ffffff',
    textStyle: {fontFamily: 'sans-serif', fontSize: 14},
    legend: {top: 12, data: ['Published', 'AyFlux default']},
    grid: {left: 270, right: 28, top: 65, bottom: 60},
    xAxis: {type: 'log', min: group.file === 'concentrations' ? 0.05 : 1,
      name: group.unit + ' · logarithmic scale', nameLocation: 'middle', nameGap: 33,
      splitLine: {lineStyle: {color: '#e3e8ec'}}, axisLabel: {fontSize: 13}},
    yAxis: {type: 'category', inverse: true, data: labels, axisLabel: {fontSize: 13},
      axisTick: {show: false}, axisLine: {show: false}},
    series: [
      {name: 'Published', type: 'scatter', symbol: 'circle', symbolSize: 11,
        itemStyle: {color: '#0072B2'}, data: data.map((row, i) => [Number(row[1]), i])},
      {name: 'AyFlux default', type: 'scatter', symbol: 'diamond', symbolSize: 12,
        itemStyle: {color: '#D55E00'}, data: data.map((row, i) => [Number(row[2]), i])}
    ]
  });
  const svg = chart.renderToSVGString();
  if (svg.includes('NaN')) throw Error('Invalid plot values');
  fs.writeFileSync(path.join(destination, group.file + '.svg'), svg);
  chart.dispose();
}
