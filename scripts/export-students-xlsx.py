#!/usr/bin/env python3
"""Turn Nadanaloga_Students.xlsx into cleaned JSON for scripts/import-students.cjs.

The spreadsheet is the academy's hand-kept register, so this is where the
cleaning happens: emails with spaces and stray characters, "Pre Grade" vs
"Pre-Grade", batch names that drift from the Batch Details sheet, and the
timing strings that mean different things on different rows. Every decision
that changes a value is written to the warnings list so it can be checked.

Usage:  python3 scripts/export-students-xlsx.py [Nadanaloga_Students.xlsx] [out.json]
"""
import json
import re
import sys
from collections import defaultdict
from datetime import datetime

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else 'Nadanaloga_Students.xlsx'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'scripts/students-import.json'

# Course names as the system already has them.
COURSE_NAME = {
    'Bharatham': 'Bharatham',
    'Music': 'Carnatic music (vocal)',
    'Vocal / Music': 'Carnatic music (vocal)',
    'Western': 'Western dance',
    'Drawing': 'Drawing',
    'Abacus': 'Abacus',
    'Phonics': 'Phonics',
    'Keyboard': 'Keyboard',
    'Violin': 'Violin',
}
GRADE_COLUMN = {
    'Bharatham': 'Bharatham Grade', 'Music': 'Music Grade', 'Drawing': 'Drawing Grade',
    'Violin': 'Violin Grade', 'Western': 'Western Grade', 'Abacus': 'Abacus Grade',
    'Phonics': 'Phonics Grade', 'Keyboard': 'Keyboard Grade',
}
# Decisions confirmed with the academy.
BATCH_REMAP = {
    'Western: Western Adult': 'Western: Western Senior',
    'Bharatham: Batch 13': 'Bharatham: Batch 13(Seniors)',
}
MODE_MAP = {'Offline': 'Offline', 'Online': 'Online', 'Either': 'Hybrid'}
DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
DAY_ABBR = {d[:3].lower(): d for d in DAY_NAMES}

warnings = []
def warn(msg):
    warnings.append(msg)

def cell(v):
    return '' if v is None else str(v).strip()

def sheet_rows(wb, name, ncols):
    ws = wb[name]
    hdr = [cell(v) for v in next(ws.iter_rows(min_row=1, max_row=1, values_only=True))][:ncols]
    out = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        vals = [cell(v) for v in r[:ncols]]
        if not any(vals):
            continue
        out.append(dict(zip(hdr, vals)))
    return out

# --- emails ----------------------------------------------------------------
EMAIL_RE = re.compile(r'^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$')
def clean_email(raw, who):
    e = raw.strip()
    if not e or e.lower() in ('no', 'nil', 'none', '-'):
        return None
    orig = e
    e = e.lower().replace(' ', '')
    e = e.rstrip('.@')                       # "x@gmail.com." / "x@gmail.com@"
    if '@' not in e and 'gmail.com' in e:    # "kalp1908gmail.com"
        e = e.replace('gmail.com', '@gmail.com')
    if e != orig.lower():
        warn(f'email fixed for {who}: {orig!r} -> {e!r}')
    if not EMAIL_RE.match(e):
        warn(f'email UNUSABLE for {who}: {orig!r} (left blank)')
        return None
    return e

def clean_phone(raw, who):
    d = re.sub(r'\D', '', raw)
    if len(d) == 12 and d.startswith('91'):
        d = d[2:]
    if len(d) != 10:
        warn(f'phone not 10 digits for {who}: {raw!r}')
    return d

def norm_grade(g):
    g = g.strip()
    if not g:
        return None
    g = re.sub(r'\s+', ' ', g)
    if g.lower() in ('pre grade', 'pre-grade', 'pregrade'):
        return 'Pre-Grade'
    m = re.match(r'^grade\s*(\d+)$', g, re.I)
    if m:
        return f'Grade {m.group(1)}'
    return g  # Junior / Teen / Senior

# --- timings ---------------------------------------------------------------
def to_24h(h, m, ampm):
    h = int(h); m = int(m)
    ampm = ampm.upper()
    if ampm == 'PM' and h != 12:
        h += 12
    if ampm == 'AM' and h == 12:
        h = 0
    return f'{h:02d}:{m:02d}'

RANGE_RE = re.compile(r'(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–\-to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)', re.I)
def parse_range(text):
    """'5:00–6:00 PM' -> ('17:00','18:00'); '8:30–10:30 AM' -> ('08:30','10:30')."""
    m = RANGE_RE.search(text)
    if not m:
        return None
    h1, m1, ap1, h2, m2, ap2 = m.groups()
    ap1 = ap1 or ap2
    return to_24h(h1, m1 or 0, ap1), to_24h(h2, m2 or 0, ap2)

def parse_days(text):
    t = text.strip()
    if not t or t.lower().startswith('not provided'):
        return []
    found = []
    for part in re.split(r'[&,/]|\band\b', t):
        p = part.strip().lower()
        if not p:
            continue
        for d in DAY_NAMES:
            if p.startswith(d.lower()[:3]):
                found.append(d); break
        else:
            warn(f'unrecognised day {part!r} in {text!r}')
    return found

def parse_slots(days, timing, batch_label):
    """Per-day slots. Split timings like 'Sat 4:00–5:00 PM; Sun 10:00–11:00 AM'
    give each day its own; a single range applies to every day."""
    t = timing.strip()
    if not t or t.lower().startswith('not provided'):
        return []
    if ';' in t:
        slots = []
        for piece in t.split(';'):
            piece = piece.strip()
            m = re.match(r'^([A-Za-z]+)\s*:?\s*(.*)$', piece)
            if not m:
                warn(f'{batch_label}: cannot parse timing piece {piece!r}'); continue
            day = DAY_ABBR.get(m.group(1)[:3].lower())
            rng = parse_range(m.group(2))
            if not day or not rng:
                warn(f'{batch_label}: cannot parse timing piece {piece!r}'); continue
            slots.append({'day': day, 'start_time': rng[0], 'end_time': rng[1]})
        return slots
    rng = parse_range(t)
    if not rng:
        warn(f'{batch_label}: cannot parse timing {t!r}')
        return []
    return [{'day': d, 'start_time': rng[0], 'end_time': rng[1]} for d in days]

def teacher_key(name):
    """'Reshma mam' / 'Diwakar Master' / 'Aishu' -> 'reshma'."""
    n = re.sub(r'\b(mam|ma\'am|master|sir)\b', '', name, flags=re.I)
    return re.sub(r'\s+', ' ', n).strip().lower()

# ===========================================================================
wb = openpyxl.load_workbook(SRC, data_only=True)

# --- Batch Details ---------------------------------------------------------
batches = []
for r in sheet_rows(wb, 'Batch Details', 7):
    course_raw, number, label = r['Course name'], r['Batch Number'], r['Batch label']
    key = f'{course_raw}: {number}'
    teacher_raw = r['Staff name']
    teachers = [teacher_key(t) for t in re.split(r'\s*/\s*', teacher_raw) if t.strip()]
    if len(teachers) > 1:
        warn(f'batch {key!r} lists {teacher_raw!r}; a batch has one teacher — using {teachers[0]!r}')
    # Display name: number + label, unless the label is just the number again or
    # plainly contradicts it (the "Weekday" batch labelled "Weekend").
    disp = number
    lab = label.strip()
    if lab and lab.lower() != number.lower() and lab.lower().replace('-', ' ') != number.lower().replace('-', ' '):
        if 'weekend' in lab.lower() and 'weekday' in number.lower():
            warn(f'batch {key!r}: label {lab!r} contradicts the number; label dropped')
        else:
            disp = f'{number} · {lab}'
    days = parse_days(r['Days'])
    slots = parse_slots(days, r['Batch timing'], key)
    batches.append({
        'key': key,
        'course': COURSE_NAME[course_raw],
        'batch_name': disp,
        'number': number,
        'label': lab,
        'teacher_key': teachers[0] if teachers else None,
        'mode': MODE_MAP.get(r['Course mode'], r['Course mode'] or 'Offline'),
        'days': days,
        'time_slots': slots,
        'start_time': slots[0]['start_time'] if slots else None,
        'end_time': slots[0]['end_time'] if slots else None,
    })
batch_by_key = {b['key']: b for b in batches}

# --- Staff Details ---------------------------------------------------------
teachers = {}
for r in sheet_rows(wb, 'Staff Details', 4):
    k = teacher_key(r['Staff Name'])
    if k in teachers:
        warn(f'staff {r["Staff Name"]!r} listed twice; merged')
        continue
    email = clean_email(r['Email ID'].replace(')', ''), f'teacher {r["Staff Name"]}') if r['Email ID'] else None
    phone = clean_phone(r['Contact Number'], f'teacher {r["Staff Name"]}') if r['Contact Number'] else None
    if not phone and not email:
        warn(f'teacher {r["Staff Name"]!r} has no phone and no email: created without a login')
    teachers[k] = {
        'key': k, 'name': r['Staff Name'].strip(), 'email': email, 'phone': phone,
        'batches_taken': r['Batches Taken'],
    }
# Decision: Keyboard and Violin are Narmadha's (not Pravin/Sharath from the batch sheet).
for b in batches:
    if b['course'] in ('Keyboard', 'Violin'):
        if b['teacher_key'] != 'narmadha':
            warn(f'batch {b["key"]!r}: teacher {b["teacher_key"]!r} -> narmadha (per academy)')
            b['teacher_key'] = 'narmadha'
    if b['teacher_key'] and b['teacher_key'] not in teachers:
        warn(f'batch {b["key"]!r}: teacher {b["teacher_key"]!r} is not in Staff Details; left unassigned')
        b['teacher_key'] = None
# What each teacher teaches, from the batches actually assigned.
for t in teachers.values():
    t['courses'] = sorted({b['course'] for b in batches if b['teacher_key'] == t['key']})

# --- Fee Structure -> grades per course -----------------------------------
def expand_grades(text):
    out = []
    for part in re.split(r'[,/]', text):
        p = part.strip()
        if not p:
            continue
        m = re.match(r'^grade\s*(\d+)\s*[–\-]\s*(?:grade\s*)?(\d+)$', p, re.I)
        if m:
            out += [f'Grade {i}' for i in range(int(m.group(1)), int(m.group(2)) + 1)]
            continue
        out.append(norm_grade(p))
    return out

grades = defaultdict(dict)   # course -> {grade: fee}
for r in sheet_rows(wb, 'Fee Structure', 3):
    course = COURSE_NAME.get(r['Course'])
    if not course:
        warn(f'fee row course {r["Course"]!r} not recognised; skipped'); continue
    fee = int(float(r['Fee (₹)']))
    cat = r['Category / Grade']
    if course == 'Western dance':
        names = ['Weekend'] if 'wekend' in cat.lower() or 'weekend' in cat.lower() else [cat.strip()]
    else:
        names = expand_grades(cat)
        if course == 'Carnatic music (vocal)' and 'Grade 6' in names and 'Grade 8' in names and 'Grade 7' not in names:
            names.append('Grade 7'); warn('Music fee "Grade 6 , Grade 8" read as Grades 6-8')
    for g in names:
        grades[course][g] = fee

# --- Students Data ---------------------------------------------------------
students = []
for r in sheet_rows(wb, 'Students Data', 20):
    name = re.sub(r'\s+', ' ', r['Student Name']).strip()
    who = f'student {name}'
    refs = []
    for part in r['Batch Name'].split(';'):
        p = re.sub(r'\s+', ' ', part.strip())
        p = BATCH_REMAP.get(p, p)
        if p not in batch_by_key:
            warn(f'{who}: batch {p!r} not in Batch Details; skipped'); continue
        refs.append(p)
    enrol = []
    for key in refs:
        b = batch_by_key[key]
        course_raw = key.split(':')[0].strip()
        grade = norm_grade(r.get(GRADE_COLUMN.get(course_raw, ''), ''))
        if b['course'] == 'Western dance' and 'Weekend' in b['number']:
            if grade != 'Weekend':
                warn(f'{who}: Western Weekend student graded {grade!r}; billed as Weekend (₹{grades["Western dance"].get("Weekend")})')
            grade = 'Weekend'
        if not grade:
            warn(f'{who}: no grade for {b["course"]}')
        elif grade not in grades.get(b['course'], {}):
            warn(f'{who}: grade {grade!r} has no fee tier for {b["course"]}')
        enrol.append({'batch_key': key, 'course': b['course'], 'grade': grade})
    dob = r['Date of Birth'][:10] if r['Date of Birth'] else None
    students.append({
        'name': name,
        'parent_name': re.sub(r'\s+', ' ', r['Parent Name']).strip(),
        'email': clean_email(r['Email'], who),
        'phone': clean_phone(r['Mobile Number'], who),
        'dob': dob,
        'standard': r['Class / Other'] or None,
        'address': r['Residential Area'] or None,
        'mode': MODE_MAP.get(r['Course Mode'], 'Offline'),
        'enrolments': enrol,
        'photo_drive_id': (re.search(r'id=([\w-]+)', r['Student Photograph']) or [None, None])[1]
                          if r['Student Photograph'] else None,
        'fee_status': r['Fee Status'],
    })

# --- Households: one parent per phone number -------------------------------
households = defaultdict(list)
for s in students:
    households[s['phone']].append(s)
families = []
for phone, kids in households.items():
    names = {k['parent_name'] for k in kids}
    emails = {k['email'] for k in kids if k['email']}
    if len(names) > 1:
        warn(f'phone {phone}: parent named differently across children {sorted(names)}; using {kids[0]["parent_name"]!r}')
    if len(emails) > 1:
        warn(f'phone {phone}: more than one email across children {sorted(emails)}; using {kids[0]["email"]!r}')
    families.append({
        'phone': phone,
        'parent_name': kids[0]['parent_name'],
        'email': kids[0]['email'] or next(iter(emails), None),
        'address': kids[0]['address'],
        'mode': kids[0]['mode'],
        'children': kids,
    })
# The same email on two different phones: two logins for now (academy to confirm).
by_email = defaultdict(list)
for f in families:
    if f['email']:
        by_email[f['email']].append(f['phone'])
for e, phones in by_email.items():
    if len(phones) > 1:
        warn(f'email {e} used by phones {phones}; email kept on {phones[0]}, placeholder on the rest (academy to confirm)')
        for p in phones[1:]:
            for f in families:
                if f['phone'] == p:
                    f['email'] = None

data = {
    'generated_at': datetime.now().isoformat(timespec='seconds'),
    'source': SRC,
    'courses': sorted({b['course'] for b in batches} | set(grades)),
    'grades': {c: g for c, g in grades.items()},
    'teachers': list(teachers.values()),
    'batches': batches,
    'families': families,
    'warnings': warnings,
}
with open(OUT, 'w') as f:
    json.dump(data, f, indent=1, ensure_ascii=False)

print(f'wrote {OUT}')
print(f'  courses  : {len(data["courses"])}')
print(f'  grades   : {sum(len(g) for g in grades.values())} tiers across {len(grades)} courses')
print(f'  teachers : {len(teachers)}')
print(f'  batches  : {len(batches)}')
print(f'  families : {len(families)}   students: {len(students)}   enrolments: {sum(len(s["enrolments"]) for s in students)}')
print(f'  warnings : {len(warnings)}')
for w in warnings:
    print('   -', w)
