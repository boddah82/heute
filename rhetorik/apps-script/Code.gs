/** @OnlyCurrentDoc */
// ↑ Zugriff nur auf diese eine Tabelle, nicht auf alle Tabellen im Konto.
// Rhetorik-App: liest die „Skript-Übersicht“ und gibt die Skripte an die App weiter.
// Nur lesen – dieses Skript ändert nichts im Sheet.
// Einrichtung: siehe Einstellungen in der Rhetorik-App („Skripte verbinden“).

function doGet(e) {
  const key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || !e || !e.parameter || e.parameter.key !== key) {
    return json_({ ok: false, error: 'Schlüssel falsch oder fehlt' });
  }
  // Alle Tabs mit einer Spalte „Sprechtext“: der erste Tab (veröffentlichte Videos) und „Zum Üben“ (noch nicht aufgenommen)
  const skripte = [];
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(sheet => {
    const rows = sheet.getDataRange().getDisplayValues();
    if (rows.length < 2) return;
    const head = rows.shift().map(h => String(h).trim().toLowerCase());
    const col = name => head.findIndex(h => h.indexOf(name) === 0);
    const c = {
      code: col('code'), datum: col('datum'), titel: col('titel'), thema: col('thema'),
      hook: col('hook'), sprechtext: col('sprechtext'), status: col('status'), format: col('format'),
    };
    if (c.sprechtext < 0) return;
    const uebung = /üben/i.test(sheet.getName());
    const get = (r, k) => (c[k] >= 0 ? String(r[c[k]] || '').trim() : '');
    rows.forEach((r, i) => {
      const s = {
        code: get(r, 'code') || (uebung ? 'U' + (i + 2) : ''), datum: get(r, 'datum'), titel: get(r, 'titel'), thema: get(r, 'thema'),
        hook: get(r, 'hook'), sprechtext: get(r, 'sprechtext'), status: get(r, 'status') || (uebung ? 'bereit zum Aufnehmen' : ''), format: get(r, 'format'),
      };
      if (s.code && s.sprechtext) skripte.push(s);
    });
  });
  return json_({ ok: true, skripte: skripte });
}

// Einmal von Hand ausführen: erzeugt den geheimen Schlüssel und zeigt ihn im Protokoll.
function schluesselErzeugen() {
  const key = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('KEY', key);
  Logger.log('Dein Schlüssel für die Rhetorik-App: ' + key);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
