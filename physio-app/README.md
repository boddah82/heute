# Reiz-Reaktions-Tracker

Web-App (Next.js, PWA-fähig) für Patienten mit längerfristigen Schmerzen, um Alltags-/Trainingsreize und die Schmerzreaktion darauf zu tracken – mit automatischem Ampel-Feedback.

## MVP-Umfang (Modul 1)

- Auswahl der Körperregion (Knie, Rücken, Schulter, Nacken, Sehne, Hüfte, individuell)
- Check-in: Reiz/Aktivität, Schmerz davor/danach, optional Dauer und Notizen
- Nachtragen von Schmerz nach 24h/48h zur Erholungsbewertung
- Automatische Ampel-Logik über drei Dimensionen (Intensität, Anstieg, Erholung) mit Empfehlung
- Daten werden lokal im Browser gespeichert (LocalStorage, offline-fähig)

Weitere Module aus der Spezifikation (Rule-of-10-Rechner, PDDM-Spinnennetz-Assessment, Wissens-Hub) sind für spätere Ausbaustufen vorgesehen.

## Entwicklung

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).
