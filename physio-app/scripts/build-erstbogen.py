#!/usr/bin/env python3
"""Erzeugt den Papier-Erstbogen (docs/erstbogen.html + .pdf) aus denselben
Fragen wie die App (lib/pddm.ts, lib/intake.ts, lib/regions.ts), damit
Bogen und Eingabemaske nie auseinanderlaufen.
Aufruf: python3 scripts/build-erstbogen.py  (PDF braucht Playwright/Chromium)"""
import re, html, pathlib, glob, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
pddm = (ROOT / "lib/pddm.ts").read_text()
intake = (ROOT / "lib/intake.ts").read_text()
regions = (ROOT / "lib/regions.ts").read_text()

def strval(block, key):
    m = re.search(key + r':\s*("([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\')', block)
    return m.group(1)[1:-1] if m else None

arr = pddm[pddm.index("export const PDDM_QUESTIONS"):]
arr = arr[: arr.index("\n];")]
questions = []
for block in re.findall(r"\{\s*\n(.*?)\n\s*\}", arr, re.S):
    q = {"id": strval(block, "id"), "domain": strval(block, "domain"), "type": strval(block, "type"),
         "text": strval(block, "text"), "hint": strval(block, "hint")}
    m = re.search(r"scaleLabels:\s*\[([^\]]*)\]", block)
    q["labels"] = re.findall(r'"([^"]*)"', m.group(1)) if m else None
    questions.append(q)

dom_labels = dict(re.findall(r'(\w+): "([^"]*)"', pddm[pddm.index("PDDM_DOMAIN_LABELS"):pddm.index("};")]))
hints_block = pddm[pddm.index("PDDM_DOMAIN_HINTS"):]
dom_hints = dict(re.findall(r'(\w+): "([^"]*)"', hints_block[: hints_block.index("};")]))
red_flags = re.findall(r'\{ id: "(\w+)", text: "([^"]*)" \}', intake)
region_labels = [l for l in re.findall(r'label: "([^"]*)"', regions) if l != "Individuell"]

e = html.escape
def boxes(labels):
    return "".join(f'<span class="opt"><span class="cb"></span>{e(l)}</span>' for l in labels)
def scale(left, right):
    cells = "".join(f'<span class="n">{i}</span>' for i in range(11))
    return f'<div class="scale"><span class="end">{e(left)}</span>{cells}<span class="end">{e(right)}</span></div>'
def line(w="100%"):
    return f'<div class="line" style="width:{w}"></div>'

DOMAINS = ["nociceptive", "nervousSystem", "comorbidities", "cognitiveEmotional", "contextual"]
FRIENDLY = {
    "nociceptive": "Bewegung und Haltung",
    "nervousSystem": "Empfindlichkeit und Nerven",
    "comorbidities": "Schlaf, Stress und Gesundheit",
    "cognitiveEmotional": "Gedanken und Sorgen",
    "contextual": "Arbeit und Umfeld",
}

partB = []
for i, d in enumerate(DOMAINS, 1):
    items = []
    for q in [q for q in questions if q["domain"] == d]:
        if q["type"] == "text":
            items.append(f'<div class="q"><p>{e(q["text"])}{" (optional)" if "Details" in q["text"] else ""}</p>{line()}{line()}</div>')
            continue
        labels = q["labels"] or ["Ja", "Nein"]
        hint = f'<p class="hint">{e(q["hint"])}</p>' if q["hint"] else ""
        items.append(f'<div class="q"><p>{e(q["text"])}</p>{hint}<div class="opts">{boxes(labels)}</div></div>')
    partB.append(f'<section class="dom"><h3>B{i}. {e(FRIENDLY[d])}</h3><p class="sub">{e(dom_hints.get(d, ""))}</p>{"".join(items)}</section>')

rf = "".join(f'<tr><td>{e(t)}</td><td class="yn"><div class="opts">{boxes(["Ja", "Nein"])}</div></td></tr>' for _, t in red_flags)
goals = "".join(f'<div class="goal"><span class="gn">{i}.</span>{line("100%")}</div>{scale("geht gar nicht", "wie vor den Beschwerden")}' for i in range(1, 4))

doc = f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Erstbogen</title><style>
@page{{size:A4;margin:13mm 14mm 14mm}}
*{{box-sizing:border-box}}
body{{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10.6pt;line-height:1.35;margin:0}}
h1{{font-size:18pt;margin:0}} h2{{break-after:avoid;font-size:13pt;margin:5mm 0 2mm;padding-bottom:1mm;border-bottom:1.5px solid #1f3a50;color:#1f3a50}}
h3{{font-size:11.5pt;margin:3.5mm 0 1mm;break-after:avoid}}
.top{{display:flex;justify-content:space-between;gap:8mm;align-items:flex-end}}
.meta{{font-size:10pt;line-height:2}} .fill{{display:inline-block;border-bottom:1px solid #333;min-width:45mm}}
.intro{{background:#f1f5f9;border-radius:2mm;padding:2.5mm 3.5mm;margin-top:3mm;font-size:10pt}}
.sub{{color:#555;font-size:9.4pt;margin:0 0 1.5mm}} .hint{{color:#555;font-size:9pt;margin:0 0 1mm;font-style:italic}}
.q{{margin:1.8mm 0;break-inside:avoid}} .q p{{margin:0 0 1mm}}
.opts{{display:flex;flex-wrap:wrap;gap:2mm 6mm}}
.opt{{display:inline-flex;align-items:center;gap:1.8mm;white-space:nowrap}}
.cb{{width:4.2mm;height:4.2mm;border:1.3px solid #333;border-radius:0.8mm;display:inline-block}}
.scale{{display:flex;align-items:center;gap:1.2mm;margin:1.5mm 0 2.5mm}}
.scale .n{{width:7mm;height:7mm;border:1.2px solid #333;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9pt}}
.scale .end{{font-size:8.4pt;color:#444;width:24mm;text-align:center;line-height:1.15}}
.line{{border-bottom:1px solid #555;height:6.5mm}}
.goal{{display:flex;align-items:flex-end;gap:2mm}} .gn{{width:5mm}}
table{{width:100%;border-collapse:collapse;break-inside:avoid}} .dom{{break-inside:avoid}} td{{border-bottom:1px solid #ddd;padding:1.6mm 1mm;vertical-align:middle}}
td.yn{{width:36mm;white-space:nowrap}} td.yn .opts{{gap:5mm}}
.note{{font-size:9pt;color:#444}}
.pb{{break-before:page}}

.foot{{margin-top:5mm;font-size:8.6pt;color:#555;border-top:1px solid #ccc;padding-top:2mm}}
.row{{display:flex;gap:6mm;align-items:center;flex-wrap:wrap}}
</style></head><body>
<div class="top"><div><h1>Fragebogen zu Ihren Beschwerden</h1>
<p class="sub" style="margin-top:1mm">Bitte vor dem ersten Termin ausfüllen · Dauer etwa 10 Minuten</p></div>
<div class="meta">Name: <span class="fill"></span><br>Datum: <span class="fill"></span></div></div>
<div class="intro">Es gibt kein Richtig oder Falsch. Kreuzen Sie an, was am ehesten passt – wenn Sie unsicher sind, lassen Sie es leer oder
schreiben Sie es dazu. <b>Randnotizen sind ausdrücklich erwünscht.</b> Bei Zahlen bitte eine Zahl einkreisen.</div>

<h2>Teil A · Ihre Beschwerden</h2>
<h3>1. Wo haben Sie Beschwerden?</h3>
<div class="opts">{boxes(region_labels)}<span class="opt"><span class="cb"></span>andere: <span class="fill" style="min-width:35mm"></span></span></div>
<div class="q"><p><b>Seit wann?</b></p><div class="opts">{boxes(["unter 6 Wochen", "6 Wochen bis 3 Monate", "über 3 Monate"])}</div></div>
<div class="q"><p><b>In den letzten 2 Wochen ist es eher …</b></p><div class="opts">{boxes(["besser", "gleich", "schlechter", "wechselnd"])}</div></div>

<h3>2. Was stört Sie im Alltag am meisten?</h3>
<p class="sub">Eine Situation, z. B. „erste Schritte morgens“, „nach 30 Minuten Sitzen“, „Tasse greifen“.</p>
{line()}
<p style="margin:2mm 0 0">Wie stark ist der Schmerz in dieser Situation?</p>{scale("kein Schmerz", "stärkster Schmerz")}
<p>Bis es danach wieder besser ist, dauert es etwa <span class="fill" style="min-width:18mm"></span> Minuten.</p>

<h3>3. Was möchten Sie wieder (besser) können?</h3>
<p class="sub">Bis zu 3 Tätigkeiten, die Ihnen wichtig sind. Kreisen Sie ein, wie gut das <b>heute</b> geht.</p>
{goals}

<h3>4. Schlaf</h3>
<p style="margin:0">Wie erholt wachen Sie meistens auf?</p>{scale("gar nicht erholt", "voll erholt")}

<div style="break-inside:avoid"><h3>5. Sicherheitsfragen</h3>
<p class="sub">Ein „Ja“ ist kein Grund zur Sorge – wir sprechen es im Termin kurz an.</p>
<table>{rf}</table></div>

<h3>6. Ihre Sicht</h3>
<div class="q"><p>Was glauben Sie selbst, woher die Beschwerden kommen?</p>{line()}{line()}</div>
<div class="q"><p>Was hat man Ihnen bisher dazu gesagt (Arzt, Therapeut, Befund)?</p>{line()}{line()}</div>
<div class="q"><p>Was erhoffen Sie sich von der Behandlung?</p>{line()}</div>

<h2>Teil B · Schmerz und Einflüsse</h2>
<div class="q"><p>Schmerz <b>aktuell</b></p>{scale("kein Schmerz", "stärkster Schmerz")}</div>
<div class="q"><p>Schmerz bei <b>maximaler Belastung</b> (z. B. Treppe, Heben, längeres Gehen)</p>{scale("kein Schmerz", "stärkster Schmerz")}</div>
<div class="q"><p>Schmerz <b>danach bzw. am nächsten Tag</b></p>{scale("kein Schmerz", "stärkster Schmerz")}</div>
{"".join(partB)}

<h3>Sonst noch etwas, das wir wissen sollten?</h3>{line()}{line()}{line()}

<div class="foot">Teil B enthält die Fragen der Bereichs-Einschätzung nach dem PDDM-Modell (Pain and Disability Drivers Management),
wortgleich wie in der App. Der Bogen ersetzt keine ärztliche Untersuchung. Ihre Angaben werden vertraulich behandelt.</div>
</body></html>"""

out = ROOT / "docs/erstbogen.html"
out.write_text(doc)
print("geschrieben:", out, "| Fragen Teil B:", len([q for q in questions if q["type"] != "text"]), "| Sicherheitsfragen:", len(red_flags))

try:
    from playwright.sync_api import sync_playwright
    exe = (glob.glob("/opt/pw-browsers/chromium*/chrome-linux*/chrome") or [None])[0]
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
        pg = b.new_page(); pg.goto(out.as_uri())
        pdf = ROOT / "docs/Erstbogen.pdf"
        pg.pdf(path=str(pdf), print_background=True, prefer_css_page_size=True)
        b.close()
        print("PDF:", pdf)
except Exception as ex:
    print("PDF übersprungen:", ex, file=sys.stderr)
