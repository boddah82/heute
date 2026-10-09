// Wortpakete nach Alltagssituationen (zusätzlich zur Häufigkeitsliste). Format wie die Wortlisten: ziel|deutsch.
// „!“ am Zeilenanfang: im Jugend-Modus ausgeblendet. Übersetzungen ungeprüft – in der App per ✎ korrigierbar.
window.PACKS = {
  it: [
    { k: 'greet', l: '👋 Begrüßung & Höflichkeit', words: `
ciao|hallo / tschüss
buongiorno|guten Morgen / guten Tag
buonasera|guten Abend
buonanotte|gute Nacht
arrivederci|auf Wiedersehen
per favore|bitte (bei einer Bitte)
grazie|danke
prego|bitte (gern geschehen)
scusa|Entschuldigung (zu einer Person, die man duzt)
scusi|Entschuldigung (Sie-Form)
piacere|freut mich
come stai?|wie geht's dir?
sto bene|mir geht's gut
a presto|bis bald
di niente|keine Ursache
permesso|darf ich? (beim Vorbeigehen oder Eintreten)` },
    { k: 'talk', l: '💬 Smalltalk & Verstehen', words: `
come ti chiami?|wie heißt du?
di dove sei?|woher kommst du?
!che lavoro fai?|was machst du beruflich?
davvero?|wirklich?
che bello!|wie schön!
non lo so|ich weiß es nicht
secondo me|meiner Meinung nach
sono d'accordo|ich bin einverstanden
non ho capito|ich habe nicht verstanden
può ripetere?|können Sie das wiederholen?
più piano, per favore|langsamer, bitte
come si dice …?|wie sagt man …?
cosa vuol dire?|was bedeutet das?
dai!|komm schon! / na los!
magari|vielleicht / schön wär's
allora|also / dann` },
    { k: 'time', l: '🕒 Zeit & Tage', words: `
oggi|heute
domani|morgen
ieri|gestern
adesso|jetzt
dopo|später / nachher
presto|früh / bald
tardi|spät
che ore sono?|wie spät ist es?
il fine settimana|das Wochenende
lunedì|Montag
venerdì|Freitag
la settimana|die Woche
il mese|der Monat
mezzogiorno|Mittag (12 Uhr)
sempre|immer
mai|nie` },
    { k: 'travel', l: '🚆 Unterwegs & Reisen', words: `
la stazione|der Bahnhof
il biglietto|die Fahrkarte / das Ticket
il treno|der Zug
l'autobus|der Bus
la fermata|die Haltestelle
il binario|das Gleis
in ritardo|verspätet
a destra|rechts
a sinistra|links
dritto|geradeaus
vicino|nah
lontano|weit
dov'è …?|wo ist …?
l'albergo|das Hotel
la camera|das Zimmer
la valigia|der Koffer` },
    { k: 'shop', l: '🛒 Einkaufen', words: `
quanto costa?|was kostet das?
il negozio|das Geschäft
il supermercato|der Supermarkt
il mercato|der Markt
la cassa|die Kasse
lo scontrino|der Kassenbon
caro|teuer
economico|günstig
lo sconto|der Rabatt
la taglia|die Kleidergröße
provare|anprobieren / probieren
pagare|bezahlen
con la carta|mit Karte
in contanti|bar
un chilo di …|ein Kilo …
il sacchetto|die Tüte` },
    { k: 'food', l: '🍝 Essen & Restaurant', words: `
il tavolo|der Tisch
il menù|die Speisekarte
il cameriere|der Kellner
ordinare|bestellen
il conto|die Rechnung
l'acqua frizzante|Wasser mit Kohlensäure
l'acqua naturale|stilles Wasser
!il vino rosso|der Rotwein
!la birra|das Bier
il primo|der erste Gang (Pasta, Reis, Suppe)
il secondo|der Hauptgang (Fleisch, Fisch)
il contorno|die Beilage
il dolce|der Nachtisch
buon appetito|guten Appetit
vorrei …|ich hätte gern …
è buonissimo|es ist sehr lecker` },
    { k: 'work', l: '💼 Arbeit', adult: true, words: `
il lavoro|die Arbeit
l'ufficio|das Büro
il collega|der Kollege
la collega|die Kollegin
il capo|der Chef / die Chefin
la riunione|die Besprechung
il progetto|das Projekt
la scadenza|die Frist
la mail|die E-Mail
lo stipendio|das Gehalt
la pausa|die Pause
lavorare|arbeiten
le ferie|der Urlaub
il cliente|der Kunde
l'appuntamento|der Termin` },
    { k: 'school', l: '🏫 Schule', teen: true, words: `
la scuola|die Schule
la classe|die Klasse
i compiti|die Hausaufgaben
la verifica|die Klassenarbeit / der Test
l'interrogazione|die mündliche Abfrage
il voto|die Note
la materia|das Schulfach
la matematica|Mathe
l'insegnante|der Lehrer / die Lehrerin
lo zaino|der Rucksack
il quaderno|das Heft
la penna|der Kuli / der Stift
la ricreazione|die Pause
l'orario|der Stundenplan
studiare|lernen` },
    { k: 'help', l: '🚑 Notfall & Gesundheit', words: `
aiuto!|Hilfe!
il medico|der Arzt / die Ärztin
l'ospedale|das Krankenhaus
la farmacia|die Apotheke
il pronto soccorso|die Notaufnahme
l'ambulanza|der Krankenwagen
la polizia|die Polizei
mi fa male …|mir tut … weh
la testa|der Kopf
la pancia|der Bauch
la febbre|das Fieber
sto male|mir geht's schlecht
ho perso …|ich habe … verloren
chiamate un medico!|ruft einen Arzt!
l'allergia|die Allergie` },
  ],
  en: [
    { k: 'greet', l: '👋 Begrüßung & Höflichkeit', words: `
hello|hallo
good morning|guten Morgen
good evening|guten Abend
goodbye|auf Wiedersehen
bye|tschüss
please|bitte (bei einer Bitte)
thank you|danke
cheers|danke / tschüss (umgangssprachlich, britisch)
you're welcome|gern geschehen
sorry|Entschuldigung / tut mir leid
excuse me|Entschuldigung (um jemanden anzusprechen)
nice to meet you|freut mich
how are you?|wie geht's?
I'm fine, thanks|mir geht's gut, danke
see you soon|bis bald
no worries|kein Problem` },
    { k: 'talk', l: '💬 Smalltalk & Verstehen', words: `
what's your name?|wie heißt du?
where are you from?|woher kommst du?
!what do you do?|was machst du beruflich?
really?|wirklich?
how lovely!|wie schön!
I don't know|ich weiß nicht
I think …|ich glaube / finde …
I agree|ich stimme zu
sorry, I didn't catch that|Entschuldigung, das habe ich nicht verstanden
could you repeat that?|könnten Sie das wiederholen?
more slowly, please|langsamer, bitte
how do you say …?|wie sagt man …?
what does … mean?|was bedeutet …?
fair enough|na gut / verstehe
brilliant!|super!
to be honest|ehrlich gesagt` },
    { k: 'time', l: '🕒 Zeit & Tage', words: `
today|heute
tomorrow|morgen
yesterday|gestern
now|jetzt
later|später
early|früh
late|spät
what time is it?|wie spät ist es?
the weekend|das Wochenende
Monday|Montag
Friday|Freitag
the week|die Woche
the month|der Monat
midday|Mittag (12 Uhr)
always|immer
never|nie` },
    { k: 'travel', l: '🚆 Unterwegs & Reisen', words: `
the station|der Bahnhof
the ticket|die Fahrkarte / das Ticket
a return ticket|eine Hin- und Rückfahrkarte
a single ticket|eine einfache Fahrkarte
the platform|der Bahnsteig / das Gleis
the train|der Zug
the bus stop|die Bushaltestelle
the Underground|die U-Bahn (London)
delayed|verspätet
on the left|links
on the right|rechts
straight on|geradeaus
where is …?|wo ist …?
the luggage|das Gepäck
the room|das Zimmer` },
    { k: 'shop', l: '🛒 Einkaufen', words: `
how much is it?|was kostet das?
the shop|das Geschäft
the supermarket|der Supermarkt
the till|die Kasse
the receipt|der Kassenbon
expensive|teuer
cheap|billig / günstig
the sale|der Ausverkauf
the size|die Größe
to try on|anprobieren
to pay|bezahlen
by card|mit Karte
in cash|bar
a carrier bag|eine Tragetasche
the queue|die Schlange (zum Anstehen)
the change|das Wechselgeld` },
    { k: 'food', l: '🍝 Essen & Restaurant', words: `
a table for two|ein Tisch für zwei
the menu|die Speisekarte
the waiter|der Kellner
to order|bestellen
the bill|die Rechnung
still water|stilles Wasser
sparkling water|Wasser mit Kohlensäure
!a pint|ein Pint (Bier, ca. 0,57 l)
the starter|die Vorspeise
the main course|das Hauptgericht
the pudding|der Nachtisch (britisch)
chips|Pommes (britisch)
crisps|Chips (britisch)
I'd like …|ich hätte gern …
delicious|lecker
to book a table|einen Tisch reservieren` },
    { k: 'work', l: '💼 Arbeit', adult: true, words: `
the job|die Stelle / der Job
the office|das Büro
the colleague|der Kollege / die Kollegin
the boss|der Chef / die Chefin
the meeting|die Besprechung
the project|das Projekt
the deadline|die Frist
the email|die E-Mail
the salary|das Gehalt
the break|die Pause
to work|arbeiten
annual leave|der Jahresurlaub
the customer|der Kunde / die Kundin
the appointment|der Termin
to be off sick|krankgeschrieben sein` },
    { k: 'school', l: '🏫 Schule', teen: true, words: `
school|die Schule
the class|die Klasse
homework|die Hausaufgaben
the test|der Test
the exam|die Prüfung
the mark|die Note (britisch)
the subject|das Schulfach
maths|Mathe (britisch)
the teacher|der Lehrer / die Lehrerin
the rucksack|der Rucksack
the exercise book|das Heft
the pen|der Kuli
break time|die Pause
the timetable|der Stundenplan
to revise|lernen (für eine Prüfung, britisch)
the uniform|die Schuluniform` },
    { k: 'help', l: '🚑 Notfall & Gesundheit', words: `
help!|Hilfe!
the doctor|der Arzt / die Ärztin
the hospital|das Krankenhaus
the chemist's|die Apotheke (britisch)
A&E|die Notaufnahme (britisch)
the ambulance|der Krankenwagen
the police|die Polizei
my … hurts|mein … tut weh
a headache|Kopfschmerzen
a stomach ache|Bauchschmerzen
a temperature|Fieber
I feel ill|ich fühle mich krank
I've lost …|ich habe … verloren
call an ambulance!|ruf einen Krankenwagen!
an allergy|eine Allergie
999|britische Notrufnummer` },
  ],
};
