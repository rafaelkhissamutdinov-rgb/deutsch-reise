#!/usr/bin/env python3
"""Deutsch-Reise — Build: prüft content-source/ und erzeugt app/data/*.js.

  python3 build.py               prüfen + Daten erzeugen + Cache-Version im Service Worker erhöhen
  python3 build.py --check       nur prüfen
  python3 build.py --only ID     nur eine Einheit prüfen (z. B. a1-hamburg)

Bricht mit Exit-Code 1 ab, sobald ein Fehler gefunden wird.
"""
import glob
import hashlib
import json
import os
import re
import shutil
import sys
import time

import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'content-source')
APP = os.path.join(ROOT, 'app')
DATA = os.path.join(APP, 'data')

# Reiseroute: Reihenfolge, Niveau, geplantes Thema, Emoji, Koordinaten (Breite, Länge)
ROUTE = [
    ('a1-hamburg', 'A1', 'Hamburg', 'DE', 'Ankommen & Sich vorstellen', 'Приезд и знакомство', 'anchor', 53.55, 9.99),
    ('a1-berlin', 'A1', 'Berlin', 'DE', 'Wohnung & Alltag', 'Квартира и быт', 'building', 52.52, 13.40),
    ('a1-leipzig', 'A1', 'Leipzig', 'DE', 'Einkaufen, Essen & Stadt', 'Покупки, еда и город', 'violin', 51.34, 12.37),
    ('a2-koeln', 'A2', 'Köln', 'DE', 'Feste & Freizeit', 'Праздники и досуг', 'church', 50.94, 6.96),
    ('a2-frankfurt', 'A2', 'Frankfurt', 'DE', 'Arbeit, Bank & Termine', 'Работа, банк и встречи', 'apple', 50.11, 8.68),
    ('a2-heidelberg', 'A2', 'Heidelberg', 'DE', 'Lernen & Gesundheit', 'Учёба и здоровье', 'castle', 49.40, 8.69),
    ('b1-stuttgart', 'B1', 'Stuttgart', 'DE', 'Verkehr & Umwelt', 'Транспорт и экология', 'car', 48.78, 9.18),
    ('b1-muenchen', 'B1', 'München', 'DE', 'Essen & Feste', 'Еда и праздники', 'beer', 48.14, 11.58),
    ('b1-salzburg', 'B1', 'Salzburg', 'AT', 'Kultur & Musik', 'Культура и музыка', 'score', 47.81, 13.05),
    ('b2-linz', 'B2', 'Linz', 'AT', 'Arbeitswelt & Technik', 'Работа и технологии', 'pie', 48.31, 14.29),
    ('b2-graz', 'B2', 'Graz', 'AT', 'Studium & Gesellschaft', 'Учёба и общество', 'clock', 47.07, 15.44),
    ('b2-wien', 'B2', 'Wien', 'AT', 'Kaffeehaus & Behörden', 'Кофейня и учреждения', 'ferris', 48.21, 16.37),
    ('b2-zuerich', 'B2', 'Zürich', 'CH', 'Bonus: Mehrsprachigkeit', 'Бонус: многоязычие', 'cheese', 47.38, 8.54),
    ('b2-bern', 'B2', 'Bern', 'CH', 'Bonus: Politik & Medien', 'Бонус: политика и СМИ', 'bear', 46.95, 7.45),
]
# Schematische Kartenposition (viewBox 360×520) und Seite des Namens: r/l/t/b
MAP_POS = {'a1-hamburg': (140, 48, 'r'), 'a1-berlin': (268, 92, 'l'), 'a1-leipzig': (215, 165, 'r'), 'a2-koeln': (48, 205, 'r'), 'a2-frankfurt': (112, 262, 'r'), 'a2-heidelberg': (70, 322, 'r'), 'b1-stuttgart': (122, 380, 'r'), 'b1-muenchen': (188, 438, 'b'), 'b1-salzburg': (250, 392, 't'), 'b2-linz': (282, 318, 'l'), 'b2-graz': (300, 478, 'l'), 'b2-wien': (330, 398, 'b'), 'b2-zuerich': (60, 450, 'r'), 'b2-bern': (36, 500, 'r')}
LEVELS = ('A1', 'A2', 'B1', 'B2')
EX_TYPES = ('choice', 'tf', 'gap', 'order', 'table')
POS = ('Adj.', 'Adv.', 'Präp.', 'Konj.', 'Pron.', 'Num.', 'Art.', 'Phrase', 'Nomen', 'Partikel', 'Interj.', 'Verb')


class BuildError(Exception):
    pass


errors = []
EXCLUDE = []  # --exclude a2-koeln,a2-… : Einheiten in Arbeit beim Build überspringen


def err(where, msg):
    errors.append(f'{where}: {msg}')


def fold(s):
    s = s.lower()
    for a, b in (('ä', 'a'), ('ö', 'o'), ('ü', 'u'), ('ß', 'ss')):
        s = s.replace(a, b)
    return s


def slug(s):
    s = fold(s)
    s = re.sub(r'^(der|die|das|sich) ', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:40] or 'x'


# ---------- Wortschatz ----------

def contains_form(example, forms):
    ex = fold(example)
    return any(f and fold(f) in ex for f in forms)


def noun_forms(word, plural):
    w = word
    forms = [w, w + 's', w + 'es', w + 'n', w + 'en']
    if len(w) > 4 and w.endswith('e'):
        forms.append(w[:-1])
    if plural not in ('Sg.', 'Pl.'):
        forms.append(plural)
    # Komposita/Adjektivnomen: Stamm ohne letzte 1–2 Buchstaben bei längeren Wörtern
    if len(w) >= 7:
        forms.append(w[:-2])
    return forms


def verb_forms(inf, p3, prat, perf):
    base = inf.replace('sich ', '').replace('·', '')
    sep = inf.replace('sich ', '').split('·')
    core = sep[-1]
    stem = re.sub(r'(e?n)$', '', core)
    forms = [base, core, stem if len(stem) >= 3 else core]
    for f in (p3, prat, perf):
        words = [x for x in f.replace('sich', '').split() if x not in ('hat', 'ist', 'hat/ist')]
        forms += words
    return forms


def parse_vocab(path, unit_id, level):
    out = []
    group = ''
    prefix = unit_id.replace('-', '')[:5]
    with open(path, encoding='utf-8') as f:
        for n, raw in enumerate(f, 1):
            line = raw.strip()
            where = f'{os.path.relpath(path, ROOT)}:{n}'
            if not line or (line.startswith('#') and not line.startswith('##')):
                continue
            if line.startswith('##'):
                group = line.lstrip('#').strip()
                continue
            kind, _, rest = line.partition(' ')
            if kind not in ('N', 'V', 'W'):
                err(where, f'unbekannter Typ „{kind}“ (erlaubt: N, V, W)')
                continue
            parts = [p.strip() for p in rest.split(' | ')]
            need = {'N': 5, 'V': 7, 'W': 5}[kind]
            if len(parts) < need:
                err(where, f'zu wenige Felder ({len(parts)} statt {need}): {line[:60]}')
                continue
            main, opt = parts[:need], parts[need:]
            extra = {}
            for o in opt:
                k, sep_, v = o.partition(':')
                if not sep_ or k.strip() not in ('AT', 'form', 'note', 'rek'):
                    err(where, f'unbekanntes Zusatzfeld „{o}“ (erlaubt: AT:, form:, note:, rek:)')
                    continue
                extra[k.strip()] = v.strip()
            e = {'type': kind, 'level': level, 'unit': unit_id, 'group': group}
            if any(not p for p in main):
                err(where, 'leeres Pflichtfeld')
                continue
            if kind == 'N':
                head, pl, ru, ex, exru = main
                m = re.match(r'^(der|die|das) (\S.*)$', head)
                if not m:
                    err(where, f'Nomen ohne Artikel: „{head}“')
                    continue
                e.update(art=m.group(1), de=m.group(2), pl=pl, ru=ru, ex=ex, ex_ru=exru)
                if pl == 'Pl.' and m.group(1) != 'die':
                    err(where, 'Pluralwort (Pl.) muss den Artikel „die“ haben')
                forms = noun_forms(m.group(2), pl)
            elif kind == 'V':
                inf, p3, prat, perf, ru, ex, exru = main
                if not re.match(r'^(hat|ist|hat/ist) ', perf):
                    err(where, f'Perfekt muss mit hat/ist beginnen: „{perf}“')
                e.update(de=inf.replace('·', ''), inf=inf, p3=p3, prat=prat, perf=perf, ru=ru, ex=ex, ex_ru=exru)
                forms = verb_forms(inf, p3, prat, perf)
            else:
                word, pos, ru, ex, exru = main
                if pos not in POS:
                    err(where, f'unbekannte Wortart „{pos}“ (erlaubt: {", ".join(POS)})')
                e.update(de=word, pos=pos, ru=ru, ex=ex, ex_ru=exru)
                w = re.sub(r'^(der|die|das) ', '', word).rstrip('!?.')
                forms = [w] + ([w[:-1]] if len(w) > 4 else []) + ([w[:-2]] if len(w) > 7 else [])
                if ' ' in w:
                    forms += [w.split()[0]]
            if 'form' in extra:
                if fold(extra['form']) not in fold(e['ex']):
                    err(where, f'form „{extra["form"]}“ steht nicht im Beispiel')
            elif not contains_form(e['ex'], forms):
                err(where, f'Beispiel enthält das Wort nicht (ggf. form: angeben): „{e["de"]}“ / „{e["ex"]}“')
            if 'AT' in extra:
                e['at'] = extra['AT']
            if 'note' in extra:
                e['note'] = extra['note']
            if 'rek' in extra:
                e['rek'] = extra['rek']
            e['id'] = f'{prefix}-{kind.lower()}-{slug(e["de"])}'
            out.append(e)
    # doppelte IDs innerhalb der Einheit eindeutig machen
    seen = {}
    for e in out:
        base = e['id']
        if base in seen:
            seen[base] += 1
            e['id'] = f'{base}-{seen[base]}'
        else:
            seen[base] = 1
    return out


# ---------- Übungen & Einheiten ----------

def check_ex(ex, where, need_ru=False):
    if not isinstance(ex, dict):
        err(where, 'Übung ist kein Objekt')
        return
    t = ex.get('type')
    if t not in EX_TYPES:
        err(where, f'unbekannter Übungstyp „{t}“')
        return
    if need_ru and not str(ex.get('ru', '')).strip():
        err(where, 'Frage ohne russische Übersetzung (ru)')
    if t in ('choice', 'tf', 'gap') and not str(ex.get('q', '')).strip():
        err(where, 'Frage (q) fehlt')
    if t == 'choice':
        opts = ex.get('options') or []
        if not isinstance(opts, list) or len(opts) < 2:
            err(where, 'choice braucht mindestens 2 options')
        ex['options'] = [str(o) for o in opts]
        if str(ex.get('answer')) not in ex['options']:
            err(where, f'richtige Antwort „{ex.get("answer")}“ ist nicht unter den Optionen {ex["options"]}')
        ex['answer'] = str(ex.get('answer'))
        if len(set(ex['options'])) != len(ex['options']):
            err(where, 'doppelte Optionen')
    elif t == 'tf':
        if not isinstance(ex.get('answer'), bool):
            err(where, 'tf: answer muss true oder false sein')
    elif t == 'gap':
        ans = ex.get('answer')
        ans = ans if isinstance(ans, list) else [ans]
        ans = [str(a) for a in ans if a is not None and str(a).strip()]
        if not ans:
            err(where, 'gap: answer fehlt')
        ex['answer'] = ans
        if str(ex.get('q', '')).count('___') != 1:
            err(where, 'gap: genau eine Lücke ___ nötig')
    elif t == 'order':
        ans = str(ex.get('answer', '')).strip()
        if not ans:
            err(where, 'order: answer fehlt')
        toks = ex.get('tokens')
        if toks:
            joined = ' '.join(str(x) for x in toks)
            clean = re.sub(r'[.!?]$', '', ans)
            if fold(joined) != fold(clean):
                err(where, f'order: tokens ergeben nicht die Antwort („{joined}“ ≠ „{clean}“)')
            ex['tokens'] = [str(x) for x in toks]
            for a in ex.get('also') or []:
                if sorted(fold(re.sub(r'[.!?]$', '', a)).replace(',', ' ,').split()) != sorted(fold(clean).replace(',', ' ,').split()):
                    err(where, f'order: Alternative „{a}“ benutzt andere Wörter')
    elif t == 'table':
        rows = ex.get('rows') or []
        if not rows or not any(str(c).startswith('?') for r in rows for c in r):
            err(where, 'table: mindestens eine Zelle mit ? nötig')
        ex['rows'] = [[str(c) for c in r] for r in rows]
        if ex.get('head'):
            ex['head'] = [str(c) for c in ex['head']]


def req(obj, keys, where):
    for k in keys:
        v = obj.get(k)
        if v is None or (isinstance(v, (str, list, dict)) and not v):
            err(where, f'Pflichtfeld „{k}“ fehlt')


def check_unit(u, path, ids):
    where = os.path.relpath(path, ROOT)
    req(u, ('id', 'level', 'city', 'title', 'title_ru'), where)
    if u.get('level') not in LEVELS:
        err(where, f'Niveau fehlt oder ungültig: {u.get("level")}')

    def uid(obj, w):
        i = obj.get('id')
        if not i:
            err(w, 'id fehlt')
        elif i in ids:
            err(w, f'doppelte id „{i}“ (auch in {ids[i]})')
        else:
            ids[i] = w

    for g in u.get('grammar') or []:
        w = f'{where} grammar/{g.get("id")}'
        uid(g, w)
        req(g, ('title', 'title_ru', 'terms', 'meaning', 'steps', 'table', 'exam', 'exercises'), w)
        for t in g.get('terms') or []:
            if not (isinstance(t, dict) and t.get('t') and t.get('ru')):
                err(w, f'Begriff unvollständig: {t}')
        tb = g.get('table') or {}
        if not tb.get('rows'):
            err(w, 'Tabelle ohne rows')
        else:
            tb['rows'] = [[str(c) for c in r] for r in tb['rows']]
            tb['head'] = [str(c) for c in tb.get('head') or []]
        exs = g.get('exercises') or []
        if len(exs) < 6:
            err(w, f'zu wenige Übungen ({len(exs)}, mindestens 6)')
        for k, ex in enumerate(exs):
            check_ex(ex, f'{w} exercises[{k}]')
    for d in u.get('dialogues') or []:
        w = f'{where} dialogues/{d.get("id")}'
        uid(d, w)
        req(d, ('title', 'situation_ru', 'start', 'nodes'), w)
        nodes = d.get('nodes') or {}
        if d.get('start') not in nodes:
            err(w, f'start „{d.get("start")}“ existiert nicht')
        if not any((n or {}).get('end') for n in nodes.values()):
            err(w, 'kein Endknoten (end: true)')
        for nid, n in nodes.items():
            n = n or {}
            if not n.get('say'):
                err(w, f'Knoten {nid}: say fehlt')
            if not n.get('end'):
                opts = n.get('options') or []
                if not opts:
                    err(w, f'Knoten {nid}: keine options und nicht end')
                for o in opts:
                    if o.get('next') not in nodes:
                        err(w, f'Knoten {nid}: next „{o.get("next")}“ existiert nicht')
                    if not o.get('t'):
                        err(w, f'Knoten {nid}: Option ohne t')
                    if o.get('ok') is False and not o.get('fb'):
                        err(w, f'Knoten {nid}: falsche Option ohne fb')
        # Erreichbarkeit eines Endes
        seen, stack = set(), [d.get('start')]
        while stack:
            x = stack.pop()
            if x in seen or x not in nodes:
                continue
            seen.add(x)
            for o in (nodes[x] or {}).get('options') or []:
                stack.append(o.get('next'))
        if not any((nodes[x] or {}).get('end') for x in seen):
            err(w, 'Ende vom Start aus nicht erreichbar')
    for t in u.get('texts') or []:
        w = f'{where} texts/{t.get("id")}'
        uid(t, w)
        req(t, ('kind', 'title', 'text', 'questions'), w)
        for k, ex in enumerate(t.get('questions') or []):
            check_ex(ex, f'{w} questions[{k}]', need_ru=True)
    for h in u.get('listening') or []:
        w = f'{where} listening/{h.get("id")}'
        uid(h, w)
        req(h, ('kind', 'title', 'lines', 'questions'), w)
        for ln in h.get('lines') or []:
            if not (isinstance(ln, dict) and ln.get('t')):
                err(w, f'Zeile ohne t: {ln}')
            else:
                ln['s'] = str(ln.get('s', 'A'))
        for k, ex in enumerate(h.get('questions') or []):
            check_ex(ex, f'{w} questions[{k}]', need_ru=True)
    for s in u.get('writing') or []:
        w = f'{where} writing/{s.get("id")}'
        uid(s, w)
        req(s, ('exam', 'kind', 'task', 'task_ru', 'points', 'words', 'redemittel', 'model', 'checklist'), w)
    for s in u.get('speaking') or []:
        w = f'{where} speaking/{s.get("id")}'
        uid(s, w)
        req(s, ('task', 'task_ru'), w)
    test = u.get('test') or []
    if len(test) < 8:
        err(where, f'Mini-Test zu kurz ({len(test)}, mindestens 8)')
    for k, ex in enumerate(test):
        check_ex(ex, f'{where} test[{k}]')


SKILLS = {'hoeren': 'Hören', 'lesen': 'Lesen', 'schreiben': 'Schreiben', 'sprechen': 'Sprechen'}


def check_test(tst, path, ids):
    where = os.path.relpath(path, ROOT)
    req(tst, ('id', 'level', 'exam', 'title', 'parts'), where)
    if tst.get('id') != os.path.basename(path)[:-5]:
        err(where, 'id passt nicht zum Dateinamen')
    if tst.get('id') in ids:
        err(where, f'doppelte id {tst.get("id")}')
    ids[tst.get('id')] = where
    if tst.get('level') not in LEVELS:
        err(where, 'Niveau ungültig')
    for part in tst.get('parts') or []:
        w = f'{where} {part.get("id")}'
        if part.get('id') not in SKILLS:
            err(w, 'Teil-id muss hoeren/lesen/schreiben/sprechen sein')
            continue
        req(part, ('minutes', 'instructions'), w)
        if part['id'] in ('hoeren', 'lesen'):
            n = 0
            for si, sec in enumerate(part.get('sections') or []):
                for bi, b in enumerate(sec.get('blocks') or []):
                    if part['id'] == 'hoeren' and not b.get('lines'):
                        err(f'{w} Teil {si + 1} Block {bi + 1}', 'Hören-Block ohne lines')
                    for ln in b.get('lines') or []:
                        ln['s'] = str(ln.get('s', 'A'))
                    for k, ex in enumerate(b.get('items') or []):
                        check_ex(ex, f'{w} Teil {si + 1} Block {bi + 1} [{k}]', need_ru=True)
                        n += 1
            if not n:
                err(w, 'keine Aufgaben')
            part['n'] = n
        elif part['id'] == 'schreiben':
            for x in part.get('writing') or []:
                req(x, ('task', 'points', 'model'), f'{w} {x.get("id")}')
            part['n'] = part.get('max_points', 0)
        else:
            for x in part.get('speaking') or []:
                req(x, ('task',), f'{w} {x.get("id")}')
            part['n'] = part.get('max_points', 0)


def build(only=None, write=True):
    ids = {}
    units = {}
    vocab_ids = {}
    for path in sorted(glob.glob(os.path.join(SRC, 'units', '*.yaml'))):
        uid_ = os.path.basename(path)[:-5]
        if only and uid_ != only:
            continue
        if any(uid_.startswith(x) for x in EXCLUDE):
            continue
        try:
            with open(path, encoding='utf-8') as f:
                u = yaml.safe_load(f)
        except yaml.YAMLError as e:
            err(os.path.relpath(path, ROOT), f'YAML-Fehler: {e}')
            continue
        if not isinstance(u, dict):
            err(path, 'leer oder kein Objekt')
            continue
        if u.get('id') != uid_:
            err(os.path.relpath(path, ROOT), f'id „{u.get("id")}“ passt nicht zum Dateinamen')
        check_unit(u, path, ids)
        vpath = os.path.join(SRC, 'vocab', uid_ + '.txt')
        if not os.path.exists(vpath):
            err(os.path.relpath(path, ROOT), 'Wortliste fehlt: ' + os.path.relpath(vpath, ROOT))
            u['vocab'] = []
        else:
            u['vocab'] = parse_vocab(vpath, uid_, u.get('level'))
            for e in u['vocab']:
                if e['id'] in vocab_ids:
                    err(vpath, f'Wort-ID doppelt: {e["id"]} (auch in {vocab_ids[e["id"]]})')
                vocab_ids[e['id']] = uid_
        units[uid_] = u
    # dasselbe Wort darf nur in einer Einheit stehen
    seen_words = {}
    for uid_, u in units.items():
        for e in u['vocab']:
            k = (e['type'], e['de'])
            if k in seen_words:
                err(f'content-source/vocab/{uid_}.txt', f'Wort „{e["de"]}“ steht schon in {seen_words[k]}')
            seen_words[k] = uid_
    tests = {}
    if not only:
        for path in sorted(glob.glob(os.path.join(SRC, 'pruefung', '*.yaml'))):
            if any(os.path.basename(path).startswith(x) for x in EXCLUDE):
                continue
            try:
                with open(path, encoding='utf-8') as f:
                    tst = yaml.safe_load(f)
            except yaml.YAMLError as e:
                err(os.path.relpath(path, ROOT), f'YAML-Fehler: {e}')
                continue
            check_test(tst or {}, path, ids)
            tests[os.path.basename(path)[:-5]] = tst
    if errors:
        return units
    if not write:
        return units
    for f in glob.glob(os.path.join(DATA, 'pruefung-*.js')):
        os.remove(f)
    test_index = []
    for tid, tst in tests.items():
        with open(os.path.join(DATA, f'pruefung-{tid}.js'), 'w', encoding='utf-8') as f:
            f.write(f'DR.extra[{json.dumps("pruefung-" + tid)}] = ' + json.dumps(tst, ensure_ascii=False, separators=(',', ':')) + ';\n')
        test_index.append({'id': tid, 'level': tst['level'], 'exam': tst['exam'], 'title': tst['title'], 'title_ru': tst.get('title_ru', ''),
                           'parts': [{'id': p['id'], 'skill': SKILLS[p['id']], 'minutes': p.get('minutes'), 'n': p.get('n', 0)} for p in tst['parts']]})
    os.makedirs(DATA, exist_ok=True)
    for f in glob.glob(os.path.join(DATA, 'unit-*.js')):
        os.remove(f)
    index = []
    for i, (rid, lvl, city, country, title, title_ru, emoji, lat, lon) in enumerate(ROUTE):
        u = units.get(rid)
        x, y, side = MAP_POS[rid]
        meta = {'id': rid, 'n': i + 1, 'level': lvl, 'city': city, 'country': country, 'emoji': emoji, 'x': x, 'y': y, 'side': side,
                'title': (u or {}).get('title', title), 'title_ru': (u or {}).get('title_ru', title_ru), 'ready': bool(u)}
        if u:
            meta['intro'] = u.get('intro', '')
            meta['words'] = len(u['vocab'])
            for key in ('grammar', 'texts', 'listening', 'dialogues', 'writing', 'speaking'):
                meta[key] = [{'id': x['id'], 'title': x.get('title') or x.get('task'), 'title_ru': x.get('title_ru') or x.get('task_ru', ''),
                              'kind': x.get('kind', '')} for x in u.get(key) or []]
            meta['test'] = len(u.get('test') or [])
            with open(os.path.join(DATA, f'unit-{rid}.js'), 'w', encoding='utf-8') as f:
                f.write(f'DR.units[{json.dumps(rid)}] = ' + json.dumps(u, ensure_ascii=False, separators=(',', ':')) + ';\n')
        index.append(meta)
    for extra in units.keys() - {r[0] for r in ROUTE}:
        err('content-source/units', f'Einheit {extra} ist nicht in ROUTE eingetragen')
    if errors:
        return units
    stamp = time.strftime('%Y%m%d%H%M%S')
    with open(os.path.join(DATA, 'index.js'), 'w', encoding='utf-8') as f:
        f.write('DR.INDEX = ' + json.dumps({'build': stamp, 'units': index, 'tests': test_index}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    bump_sw()
    return units


def bump_sw():
    """Cache-Version = Hash über alle ausgelieferten Dateien → jede Änderung ergibt einen neuen Cache."""
    h = hashlib.sha1()
    files = []
    for dp, _, fns in os.walk(APP):
        for fn in fns:
            p = os.path.join(dp, fn)
            rel = os.path.relpath(p, APP).replace(os.sep, '/')
            if rel == 'sw.js':
                continue
            files.append(rel)
    for rel in sorted(files):
        if rel.startswith('data/index.js'):
            continue  # enthält Zeitstempel
        with open(os.path.join(APP, rel), 'rb') as f:
            h.update(rel.encode() + f.read())
    ver = h.hexdigest()[:10]
    sw = os.path.join(APP, 'sw.js')
    with open(sw, encoding='utf-8') as f:
        s = f.read()
    core = [f for f in sorted(files) if f.endswith(('.html', '.css', '.js', '.json', '.webmanifest')) or f.startswith('assets/emoji/')]
    s = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{ver}';", s)
    s = re.sub(r'const CORE = \[[^\]]*\];', 'const CORE = ' + json.dumps(['./'] + core) + ';', s, flags=re.S)
    with open(sw, 'w', encoding='utf-8') as f:
        f.write(s)
    # auch in index.html für ?v= beim Nachladen von Daten
    ih = os.path.join(APP, 'index.html')
    with open(ih, encoding='utf-8') as f:
        s = f.read()
    s = re.sub(r"DR.BUILD = '[^']*';", f"DR.BUILD = '{ver}';", s)
    s = re.sub(r'\?v=[0-9a-f]{10}', f'?v={ver}', s)
    with open(ih, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Cache-Version:', ver)


def main():
    args = sys.argv[1:]
    only = None
    if '--exclude' in args:
        EXCLUDE.extend(args[args.index('--exclude') + 1].split(','))
    if '--only' in args:
        only = args[args.index('--only') + 1]
    check = '--check' in args or only is not None
    units = build(only=only, write=not check)
    if errors:
        print(f'\n✗ {len(errors)} Fehler:\n')
        for e in errors[:300]:
            print(' -', e)
        sys.exit(1)
    nv = sum(len(u['vocab']) for u in units.values())
    ng = sum(len(u.get('grammar') or []) for u in units.values())
    nex = sum(len(g.get('exercises') or []) for u in units.values() for g in u.get('grammar') or [])
    print(f'✓ {len(units)} Einheiten, {nv} Wörter, {ng} Grammatikthemen, {nex} Grammatikübungen — alles gültig.')


if __name__ == '__main__':
    main()
