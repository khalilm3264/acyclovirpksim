#!/usr/bin/env python3
"""Audit supplied manuscript artifacts against pinned numerical report inputs.
Uses only the Python standard library. Does not edit any manuscript.
"""
import argparse
import csv
import hashlib
import io
import json
import math
import re
import xml.etree.ElementTree as E
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      't': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
      'a': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
      'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
sha = lambda b: hashlib.sha256(b).hexdigest()

def text(el):
    return ''.join(el.itertext()).strip()

def displayed(value, expected, format_spec):
    return abs(float(value)-float(format(expected, format_spec))) < 1e-9

def audit(manuscript, si, archive):
    checks = []
    def check(label, ok, detail, level='fail'):
        checks.append({'check': label, 'status': 'pass' if ok else level, 'detail': detail})
    m = json.loads((ROOT / 'research/validation/report-inputs/manuscript.json').read_text())
    scenarios = m['scenarios']
    points = [dict(r, study=s['id']) for s in scenarios for r in s['rows']]
    with ZipFile(si) as z:
        siroot = E.fromstring(z.read('content.xml'))
        siparas = [text(x) for x in siroot.findall('.//t:p', NS)]
        tables = [[[text(c) for c in row.findall('a:table-cell', NS)]
                   for row in tb.findall('a:table-row', NS)] for tb in siroot.findall('.//a:table', NS)]
    check('SI S1 scenario count', len(tables[0]) == len(scenarios), f'{len(tables[0])} scenarios; expected {len(scenarios)}')
    input_errors = []
    for i, (row, scenario) in enumerate(zip(tables[0], scenarios), 1):
        c = scenario['config']
        for col, key, fmt in [(3, 'weight', '.3g'), (4, 'crcl', '.2f'), (7, 'horizon', '.3g')]:
            numeric = re.search(r'[0-9.]+', row[col]).group()
            if not displayed(numeric, c[key], fmt): input_errors.append(f'row {i} {key}')
    check('SI S1 numerical inputs', not input_errors, '27 weight, CrCl and horizon entries checked' if not input_errors else '; '.join(input_errors))
    s2 = tables[1]
    errors = []
    if len(s2) != len(points):
        errors.append(f'{len(s2)} rows vs {len(points)} endpoints')
    for i, (row, expected) in enumerate(zip(s2, points), 1):
        for column, key, fmt in [(2, 'time', '.2f'), (3, 'observed', '.3g'), (4, 'predicted', '.3g')]:
            if not displayed(row[column], expected[key], fmt):
                errors.append(f'row {i} {key}')
        if not displayed(row[6], expected['predicted']/expected['observed'], '.2f'):
            errors.append(f'row {i} ratio')
        band = [float(x) for x in row[5].replace('–', ' ').split()]
        if len(band) != 2 or any(not displayed(a, expected[k], '.3g') for a, k in zip(band, ['lower', 'upper'])):
            errors.append(f'row {i} model band')
        if (row[7].lower() == 'yes') != expected['inside']:
            errors.append(f'row {i} inclusion flag')
    check('SI S2 values and bands', not errors, '37 endpoint rows, observed/predicted values, ratios and bands checked at displayed precision' if not errors else '; '.join(errors))
    errors = []
    s3 = tables[2]
    if len(s3) != len(scenarios): errors.append('scenario count')
    for index, (row, scenario) in enumerate(zip(s3, scenarios), 1):
        for col, variant in enumerate(m['ablations'], 1):
            rs = [r for r in variant['rows'] if r['study'] == scenario['id'] and r['analyte'] == 'plasma']
            gmr = math.exp(sum(math.log(r['predicted']/r['observed']) for r in rs)/len(rs))
            if abs(float(row[col])-gmr) > .005001: errors.append(f'row {index}, {variant["variant"]}')
    check('SI S3 ablation values', not errors, '72 scenario/variant GMR values checked at displayed precision' if not errors else '; '.join(errors))
    with ZipFile(manuscript) as z:
        docroot = E.fromstring(z.read('word/document.xml'))
        paras = [''.join(x.itertext()) for x in docroot.findall('.//w:body/w:p', NS)]
        authors = next(p for p in paras if p.startswith('Authors:')).removeprefix('Authors:').strip()
        check('SI authors match manuscript', authors in siparas, f'Manuscript authors: {authors}', 'review')
        check('SI handoff wording', not any('not accessible here' in p for p in siparas), 'Companion should describe the reconciled manuscript, not an earlier inaccessible draft', 'review')
        anchors = {x.attrib['{'+NS['w']+'}name'] for x in docroot.findall('.//w:bookmarkStart', NS)}
        missing = {x.attrib['{'+NS['w']+'}anchor'] for x in docroot.findall('.//w:hyperlink', NS) if '{'+NS['w']+'}anchor' in x.attrib}-anchors
        check('Internal reference targets', not missing, 'All internal targets resolve' if not missing else ', '.join(sorted(missing)))
        mtables = [[[text(c) for c in row.findall('w:tc', NS)] for row in tb.findall('w:tr', NS)] for tb in docroot.findall('.//w:body/w:tbl', NS)]
        rels = {x.attrib['Id']: x.attrib.get('Target') for x in E.fromstring(z.read('word/_rels/document.xml.rels'))}
        images = {}
        for rid, number in [('rId19', 3), ('rId20', 4)]: images[number] = z.read('word/'+rels[rid])
    errors = []
    filters = [lambda r: r['analyte']=='plasma' and r['mode']=='No dialysis',
               lambda r: r['analyte']=='plasma' and r['mode']!='No dialysis',
               lambda r: r['analyte']=='cmmg', lambda r: r['analyte']=='plasma']
    for cells, variant in zip(mtables[5][1:], m['ablations']):
        for value, predicate in zip(cells[1:], filters):
            rows = [r for r in variant['rows'] if predicate(r)]
            if any(r['predicted']==0 for r in rows):
                if 'not defined' not in value: errors.append(variant['variant']+' undefined fold error')
                continue
            logs = [math.log(r['predicted']/r['observed']) for r in rows]
            expected = [math.exp(sum(logs)/len(logs)), math.exp(sum(abs(x) for x in logs)/len(logs))]
            nums = re.findall(r'[0-9.]+', value)
            if len(nums)<2 or any(not displayed(v, e, '.2f') for v,e in zip(nums[:2],expected)): errors.append(variant['variant']+' bias/error')
    check('Main Table 6 ablation metrics', not errors, 'Bias/error cells agree with frozen ablations, including undefined zero-CMMG case' if not errors else '; '.join(errors))
    with ZipFile(archive) as z:
        prefix = 'AyFlux_reproducibility/'
        sums = json.loads(z.read(prefix+'SHA256SUMS.json'))
        bad = [n for n, digest in sums.items() if prefix+n not in z.namelist() or sha(z.read(prefix+n)) != digest]
        unlisted = [n[len(prefix):] for n in z.namelist() if not n.endswith('/') and n != prefix+'SHA256SUMS.json' and n[len(prefix):] not in sums]
        check('Archive checksum manifest', not bad and not unlisted, f'{len(sums)} entries checked; mismatched {bad}; unlisted {unlisted}')
        engine = z.read(prefix+'public/assets/pk-engine.js')
        blob = hashlib.sha1(f'blob {len(engine)}\0'.encode()+engine).hexdigest()
        check('Archive frozen engine', blob == m['provenance']['engineBlob'], blob)
        rows = list(csv.DictReader(io.StringIO(z.read(prefix+'results/scorecard.csv').decode())))
        errors = []
        if len(rows) != len(points): errors.append('endpoint count')
        for i, (a, b) in enumerate(zip(rows, points), 1):
            if a['study_id'] != b['study'] or a['analyte'] != b['analyte']: errors.append(f'row {i} endpoint identity')
            for col, key in [('observed_mg_L','observed'),('predicted_nominal_mg_L','predicted'),('interval_lower_mg_L','lower'),('interval_upper_mg_L','upper')]:
                if abs(float(a[col])-b[key]) > 1e-5*max(1,abs(b[key])): errors.append(f'row {i} {key}')
        check('Archive scorecard vs frozen rerun', not errors, 'All 37 rows agree with the pinned rerun at CSV precision' if not errors else '; '.join(errors))
        for number, image in images.items():
            check(f'Figure {number} matches archive', image == z.read(prefix+f'figures/figure{number}.png'), sha(image))
        for filename, supplied in [('AyFlux_Manuscript_final_clean.docx', manuscript), (si.name, si)]:
            target = prefix+'documents/'+filename
            check('Archive current '+filename, target in z.namelist() and z.read(target) == supplied.read_bytes(), 'Bundled document must match the supplied reconciled version', 'review')
        summary = json.loads(z.read(prefix+'research/manuscript-python/results/summary.json'))
        errors = []
        for row, expected in zip(mtables[2][1:], summary['case2']):
            for value, key in [(row[2], 'observed_auc_h_mg_L'), (row[3], 'model_auc_h_mg_L')]:
                if not displayed(value, expected[key], '.2f'): errors.append(expected['group']+' '+expected['analyte']+' '+key)
        check('Main Table 3 AUC values', len(mtables[2])==9 and not errors, 'All 16 published/model AUC values match archived Python outputs at displayed precision' if not errors else '; '.join(errors))
    return {'artifacts': {p.name: sha(p.read_bytes()) for p in [manuscript, si, archive]}, 'checks': checks}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    for key in ['manuscript','si','archive','out']:ap.add_argument('--'+key, type=Path, required=True)
    args=ap.parse_args()
    result=audit(args.manuscript,args.si,args.archive)
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'audit.json').write_text(json.dumps(result,indent=2)+'\n')
    lines=['# Manuscript reproducibility audit','', '## Artifact SHA-256','', *[f'- `{name}`: `{value}`' for name,value in result['artifacts'].items()], '', '## Checks','', '| Check | Status | Detail |','|---|---|---|', *[f'| {c["check"]} | {c["status"]} | {c["detail"]} |' for c in result['checks']]]
    (args.out/'audit.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps(result,indent=2))
    if any(c['status']=='fail' for c in result['checks']):raise SystemExit(1)
if __name__=='__main__':main()
