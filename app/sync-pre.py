#!/usr/bin/env python3
"""The planner enforces the lines the sheets print. This copies the
prerequisites of every course drawn on the MIS map from
guide/data/courses.json into app/src/plan.json, prints what it changed,
and touches nothing else. Run it after changing a line on the MIS map,
before `node build-app.js`.

    python3 app/sync-pre.py

(Python, not node: plan.json's course numbers are object keys, and
JavaScript reorders keys that look like integers, which would rewrite
the whole file.)"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, '..', 'guide', 'data', 'courses.json'), encoding='utf-8'))
path = os.path.join(HERE, 'src', 'plan.json')
P = json.load(open(path, encoding='utf-8'))

changed = 0
for c in C['mis']['courses']:
    e = P['courses'].get(c['code'])
    if e is None:
        raise SystemExit(c['code'] + ' is on the MIS map but not in plan.json')
    if e['pre'] != c['pre']:
        print('%s  %s  ->  %s' % (c['code'], json.dumps(e['pre']), json.dumps(c['pre'])))
        e['pre'] = list(c['pre'])
        changed += 1
if changed:
    open(path, 'w', encoding='utf-8').write(json.dumps(P, indent=1, ensure_ascii=False))
print('%d prerequisite list(s) updated in plan.json' % changed if changed else 'plan.json already matches the MIS map')
