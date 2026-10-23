// Rhetorik-Training: Lagen (Kategorien), Werkzeuge mit Beispielpaar (Muster entdecken) und Aufgaben.
// Aufgaben sind allgemein gehalten – keine echten Namen oder internen Details (Inhalte gehen an Claude).
window.RH = {
  cats: {
    widerspruch: {
      label: 'Widerspruch', icon: '⚡', sec: 60,
      tool: 'Erst spiegeln, dann Position',
      steps: [
        ['Spiegeln', 'In eigenen Worten sagen, was der andere meint – und kurz nachfragen, ob du es richtig verstanden hast.'],
        ['Anerkennen', 'Sagen, was an seiner Sicht stimmt. Das kostet dich nichts.'],
        ['Deine Sicht', 'Deine Position mit einem Grund oder einer Beobachtung.'],
        ['Angebot', 'Einen nächsten Schritt oder eine Frage zurück.'],
      ],
      example: {
        ctx: 'Fallbesprechung. Ein Arzt sagt:',
        say: 'Bewegungstherapie bringt in der Entzugsphase nichts. Die Patienten sollen sich erst mal schonen.',
        a: 'Das stimmt so nicht. Bewegung hilft immer, das ist eindeutig belegt.',
        b: [
          ['Sie meinen, in der Entzugsphase ist die Belastung sowieso hoch und wir sollten nicht noch mehr draufpacken – hab ich das richtig verstanden?', 0],
          ['Da gebe ich Ihnen recht, die ersten Tage sind heikel.', 1],
          ['Meine Erfahrung ist aber, dass kurze, leichte Bewegung vielen gerade dann hilft, weil sie wieder etwas selbst steuern können.', 2],
          ['Wollen wir es bei zwei Patienten mit sehr niedriger Dosis versuchen und nach einer Woche schauen?', 3],
        ],
        insight: 'A macht zu: „stimmt nicht“, „immer“, „eindeutig“ – da bleibt dem anderen nur Gegenangriff oder Rückzug. B bleibt genauso klar in der Sache, lässt aber Spielraum. Und durch das Spiegeln fühlt sich zuerst der andere verstanden – danach hört er dir eher zu.',
      },
    },
    wissen: {
      label: 'Frage ohne Antwort', icon: '❓', sec: 45,
      tool: 'Ehrlich – was ich weiß – wie es weitergeht',
      steps: [
        ['Ehrlich', 'Kurz und ruhig sagen, dass du es gerade nicht genau weißt. Ohne Entschuldigungs-Schleife.'],
        ['Was ich weiß', 'Das sagen, was du sicher weißt – auch wenn es nur ein Teil ist.'],
        ['Weg', 'Konkret sagen, wie und bis wann du es klärst – oder wer es weiß.'],
      ],
      example: {
        ctx: 'Sitzung. Eine Kollegin fragt dich:',
        say: 'Wie lange darf man eigentlich am Stück arbeiten, bevor eine Pause Pflicht ist?',
        a: 'Äh, also, ich glaube acht Stunden? Oder sechs? Sorry, das müsste ich eigentlich wissen …',
        b: [
          ['Die genaue Grenze habe ich gerade nicht sicher im Kopf.', 0],
          ['Was ich weiß: Das Arbeitszeitgesetz schreibt nach einer bestimmten Zeit eine Pause vor, und die gilt auch bei uns.', 1],
          ['Ich schaue es bis morgen nach und schicke es dir.', 2],
        ],
        insight: 'A rät, entschuldigt sich und wertet sich ab („müsste ich wissen“) – das wirkt unsicherer als die Wissenslücke selbst. B gibt die Lücke in einem Satz zu und zeigt dann, was er weiß und dass er sich kümmert. Niemand weiß alles. Souverän wirkt, wer mit der Lücke ruhig umgeht.',
        extra: 'Zeit gewinnen ist erlaubt: „Meinst du A oder B?“ – eine Rückfrage zeigt, dass du mitdenkst.',
      },
    },
    position: {
      label: 'Position mit Spielraum', icon: '🧭', sec: 90,
      tool: 'Klar in der Sache, offen im Ton',
      steps: [
        ['Position', 'In einem Satz sagen, was du willst oder denkst.'],
        ['Grund', 'Eine konkrete Beobachtung oder ein Grund – lieber eins als drei.'],
        ['Spielraum', 'Ehrlich sagen, wofür es gilt: „in den meisten Fällen“, „nach meiner Erfahrung“, „bisher“.'],
        ['Tür auf', 'Die anderen einladen: „Was spricht aus eurer Sicht dagegen?“'],
      ],
      example: {
        ctx: 'Teambesprechung, Punkt Arbeitssicherheit:',
        say: 'Gibt es noch was zur Arbeitssicherheit?',
        a: 'Ja, der Boden im Therapieraum ist eine Katastrophe. Da bricht sich garantiert bald jemand das Bein. Das muss sofort geändert werden.',
        b: [
          ['Ja. Ich möchte, dass wir die Reinigungszeit im Therapieraum ändern.', 0],
          ['Zweimal in diesem Monat war der Boden um acht Uhr noch nass, als die erste Gruppe kam.', 1],
          ['Passiert ist bisher nichts, aber das Risiko für einen Sturz ist da.', 2],
          ['Mein Vorschlag wäre, am Nachmittag zu reinigen. Spricht aus eurer Sicht etwas dagegen?', 3],
        ],
        insight: 'A klingt stark, ist aber angreifbar: „garantiert“, „Katastrophe“, „sofort“ – wer einen Gegenbeweis findet, kippt die ganze Aussage. B ist genauso klar („Ich möchte …“), belegt es mit einer Beobachtung und lässt eine Tür offen. Widerspruch wird dann zu einem Gespräch über die Sache statt über dich.',
      },
    },
    erklaeren: {
      label: 'Erklären', icon: '💡', sec: 60,
      tool: 'Kernsatz – Beispiel – Was heißt das für dich',
      steps: [
        ['Kernsatz', 'Die Antwort in einem einfachen Satz.'],
        ['Beispiel', 'Ein konkretes Beispiel aus dem Alltag des anderen.'],
        ['Für dich', 'Was heißt das jetzt praktisch für ihn?'],
      ],
      example: {
        ctx: 'Ein Patient fragt:',
        say: 'Wenn es weh tut, mache ich doch was kaputt, oder?',
        a: 'Nein, das ist ein nozizeptives Signal, bei chronischem Schmerz kommt eine zentrale Sensibilisierung dazu, das heißt, die Schmerzverarbeitung ist verändert …',
        b: [
          ['Schmerz ist echt, aber er zeigt nicht zuverlässig, wie viel Schaden da ist.', 0],
          ['Wenn Sie zum Beispiel lange nicht gelaufen sind, meldet sich der Körper oft schon bei harmloser Belastung.', 1],
          ['Für Sie heißt das: Ein bisschen Schmerz bei der Übung ist in Ordnung, solange es am nächsten Tag nicht deutlich schlimmer ist.', 2],
        ],
        insight: 'A stimmt fachlich, kommt aber nicht an. B sagt zuerst die Antwort, dann ein Beispiel aus dem Leben des Patienten und am Ende, was er tun kann. Fachwörter nur, wenn du sie gleich einfach erklärst.',
      },
    },
    ansprache: {
      label: 'Ansprache', icon: '📣', sec: 60,
      tool: 'Ein Thema – kurz – ein Auftrag',
      steps: [
        ['Ein Thema', 'Nur das Wichtigste. Eins, nicht fünf.'],
        ['Warum', 'Ein Satz, warum es jetzt zählt.'],
        ['Auftrag', 'Was genau sollen alle jetzt tun?'],
      ],
      example: {
        ctx: 'Halbzeit, ihr liegt 0:2 hinten. Alle schauen dich an.',
        say: '',
        a: 'Leute, so geht das nicht. Wir laufen nicht, wir reden nicht, die Pässe kommen nicht an, hinten stehen wir offen, und vorne passiert auch nichts …',
        b: [
          ['Wir verlieren die Bälle im Mittelfeld.', 0],
          ['Wir stehen zu weit auseinander, deshalb hat keiner eine Anspielstation.', 1],
          ['Zweite Halbzeit: enger zusammen, kurze Pässe, und nach Ballverlust sucht jeder sofort den nächsten Mann. Los geht’s.', 2],
        ],
        insight: 'A zählt alles auf, was schiefläuft – danach weiß keiner, was er anders machen soll. B nimmt ein Thema, erklärt es in einem Satz und gibt einen klaren Auftrag.',
      },
    },
    video: {
      label: 'Video', icon: '🎬', sec: 60,
      tool: 'Aussage – Einwand vorweg – zurück zur Position – ein Schritt',
      steps: [
        ['Aussage', 'Gleich mit der Kernaussage oder Frage anfangen – ohne das Format zu erklären.'],
        ['Einwand vorweg', 'Den naheliegenden Einwand selbst aussprechen und ernst nehmen.'],
        ['Zurück', 'Zurück zu deiner Position, mit Grund.'],
        ['Ein Schritt', 'Was kann der Zuschauer konkret tun?'],
      ],
      example: {
        ctx: 'Thema: Schonung bei Rückenschmerz.',
        say: '',
        a: 'Hallo und willkommen zu einem neuen Video. Heute geht es um Rückenschmerz. Schonung ist absolut falsch, das sollte man nie machen.',
        b: [
          ['Wenn der Rücken weh tut, ist Schonen das Naheliegendste.', 0],
          ['Und ein paar Tage etwas weniger zu machen, ist auch völlig in Ordnung.', 1],
          ['Schwierig wird es, wenn aus ein paar Tagen Wochen werden. Dann wird der Rücken nicht stärker, sondern empfindlicher.', 2],
          ['Fang mit einem kurzen Spaziergang an und schau, wie es dir am nächsten Tag geht.', 3],
        ],
        insight: 'A verschenkt den Anfang mit der Begrüßung und macht dann eine absolute Aussage, gegen die sofort jemand widerspricht. B fängt mitten im Thema an, nimmt den Einwand vorweg („ist auch in Ordnung“) und kommt dann zurück zur Position.',
      },
    },
  },
  // Schwerpunkt laut Nutzer (23.10.2026): Widerspruch, spontane Fragen, absolute Aussagen
  focus: ['widerspruch', 'wissen', 'position'],
  tasks: [
    // Widerspruch
    { id: 'w1', cat: 'widerspruch', ctx: 'Fallbesprechung. Eine Kollegin aus der Psychotherapie sagt über einen Patienten:', say: 'Ich glaube, er übertreibt seine Schmerzen, damit er nicht in die Gruppen muss.', task: 'Du nimmst seine Schmerzen ernst und siehst es differenzierter.' },
    { id: 'w2', cat: 'widerspruch', ctx: 'Teambesprechung. Jemand aus der Pflege sagt:', say: 'Die Physio ist doch eher Wellness. Für die Abstinenz bringt das nichts.', task: 'Erkläre ruhig, wofür eure Arbeit da ist.' },
    { id: 'w3', cat: 'widerspruch', ctx: 'Gespräch zwischen MAV und Leitung. Die Leitung sagt:', say: 'Die neue Dienstplanregel ist mit allen abgesprochen. Da gibt es nichts mehr zu diskutieren.', task: 'Die MAV wurde aus deiner Sicht nicht ausreichend beteiligt. Sag das, ohne anzugreifen.' },
    { id: 'w4', cat: 'widerspruch', ctx: 'Sicherheitsbegehung. Ein Bereichsleiter sagt:', say: 'Das Kabel quer über den Flur? Da ist noch nie was passiert, das ist doch übertrieben.', task: 'Du willst, dass es geändert wird.' },
    { id: 'w5', cat: 'widerspruch', ctx: 'Ein Patient sagt:', say: 'Mein Orthopäde hat gesagt, meine Bandscheibe ist kaputt. Da mache ich bestimmt keine Kniebeugen.', task: 'Nimm seine Sorge ernst und erkläre, warum du trotzdem einen kleinen Versuch vorschlägst.' },
    { id: 'w6', cat: 'widerspruch', ctx: 'Ein Physio-Kollege sagt:', say: 'Dein biopsychosoziales Zeug ist doch nur eine Ausrede, wenn man nicht findet, wo es mechanisch hakt.', task: 'Gib ihm teilweise recht und bleib trotzdem bei deiner Sicht.' },
    { id: 'w7', cat: 'widerspruch', ctx: 'Ein Vater am Spielfeldrand:', say: 'Mein Sohn muss mehr spielen. Der ist besser als die Hälfte deiner Startelf.', task: 'Bleib freundlich und erkläre deine Entscheidung.' },
    { id: 'w8', cat: 'widerspruch', ctx: 'Kommentar unter deinem Video:', say: 'Schmerz ist also alles nur im Kopf? Was für ein Unsinn.', task: 'Antworte so, als würdest du ein kurzes Antwortvideo aufnehmen.' },
    { id: 'w9', cat: 'widerspruch', ctx: 'Ein Freund sagt beim Essen:', say: 'Ach, Studien findest du doch für alles. Das sagt gar nichts.', task: 'Du siehst das anders.' },
    // Frage ohne Antwort
    { id: 'q1', cat: 'wissen', ctx: 'Fallbesprechung. Ein Arzt fragt dich:', say: 'Wie wirkt sich denn seine Medikation auf die Belastbarkeit im Training aus?', task: 'Du weißt es nicht genau.' },
    { id: 'q2', cat: 'wissen', ctx: 'Eine Kollegin fragt dich als MAV-Mitglied:', say: 'Darf die Leitung mich eigentlich einfach so in einen anderen Bereich versetzen?', task: 'Du bist dir nicht sicher, wie die Regelung genau ist.' },
    { id: 'q3', cat: 'wissen', ctx: 'Ein Mitarbeiter fragt dich als Sicherheitsbeauftragten:', say: 'Wie oft müssen die Feuerlöscher eigentlich geprüft werden?', task: 'Du kennst die genaue Frist nicht.' },
    { id: 'q4', cat: 'wissen', ctx: 'Ein Patient fragt:', say: 'Was halten Sie von Kurkuma gegen Entzündungen? Das soll ja super wirken.', task: 'Du kennst die Studienlage nicht genau.' },
    { id: 'q5', cat: 'wissen', ctx: 'Im Schmerzkurs fragt ein Teilnehmer:', say: 'Sie sagen, Schmerz ist ein Schutzsignal. Wie erklären Sie dann Phantomschmerzen?', task: 'Sag, was du sicher weißt, und sei ehrlich, wo es für dich aufhört.' },
    { id: 'q6', cat: 'wissen', ctx: 'Ein Spieler fragt beim Aufwärmen:', say: 'Trainer, warum dehnen wir eigentlich nicht mehr vor dem Spiel?', task: 'Du hast einen Grund, kennst aber die Studien nicht im Detail.' },
    { id: 'q7', cat: 'wissen', ctx: 'Live-Frage oder Kommentar unter deinem Video:', say: 'Welche Studie genau belegt das?', task: 'Dir fällt die Studie gerade nicht ein.' },
    { id: 'q8', cat: 'wissen', ctx: 'Die Leitung fragt dich nach deinem Vorschlag:', say: 'Und was würde das kosten?', task: 'Du hast keine Zahl parat.' },
    { id: 'q9', cat: 'wissen', ctx: 'Fallbesprechung. Jemand fragt dich ganz direkt:', say: 'Du bist doch Physio. Was ist denn genau der Unterschied zwischen Arthrose und Arthritis?', task: 'Du bist dir gerade nicht ganz sicher, ob du es sauber erklären kannst.' },
    // Position mit Spielraum
    { id: 'p1', cat: 'position', ctx: 'Teambesprechung. Die Moderation fragt:', say: 'Gibt es von der Physio noch Punkte?', task: 'Du möchtest, dass Patienten mit chronischen Schmerzen schon in der ersten Woche einen Termin bei dir bekommen.' },
    { id: 'p2', cat: 'position', ctx: 'Gespräch zwischen MAV und Leitung. Die Leitung sagt:', say: 'Die MAV wollte noch etwas zu den Überstunden sagen?', task: 'Bring das Thema Überstunden in einem Team ein. Klar, aber ohne Vorwurf.' },
    { id: 'p3', cat: 'position', ctx: 'Teambesprechung, Punkt Arbeitssicherheit:', say: 'Gibt es noch was zur Arbeitssicherheit?', task: 'Eine Liege im Therapieraum ist seit Wochen defekt. Du willst, dass die Reparatur vorgezogen wird.' },
    { id: 'p4', cat: 'position', ctx: 'Teambesprechung. Die Leitung sagt:', say: 'Du wolltest uns deine Idee für den Schmerzkurs vorstellen.', task: 'Stell den Kurs vor und sag, was du dafür brauchst.' },
    { id: 'p5', cat: 'position', ctx: 'Elternabend. Eine Mutter fragt:', say: 'Wie handhabst du das eigentlich mit der Spielzeit?', task: 'Erkläre deine Haltung.' },
    { id: 'p6', cat: 'position', ctx: 'Ein Bekannter fragt:', say: 'Was hältst du eigentlich von diesen Rücken-Influencern?', task: 'Bezieh Stellung, ohne pauschal zu werden.' },
    { id: 'p7', cat: 'position', ctx: 'Ein Bekannter fragt:', say: 'Was ist denn die beste Übung gegen Rückenschmerzen?', task: 'Gib eine klare Antwort – ohne Rangliste und ohne auszuweichen.' },
    // Erklären
    { id: 'e1', cat: 'erklaeren', ctx: 'Ein Patient fragt:', say: 'Warum soll ich trainieren, wenn mir doch alles weh tut?', task: 'Erkläre es einfach.' },
    { id: 'e2', cat: 'erklaeren', ctx: 'Ein Patient sagt:', say: 'Im MRT steht Arthrose. Heißt das, mein Knie ist verbraucht?', task: 'Erkläre es, ohne Angst zu machen und ohne etwas zu versprechen.' },
    { id: 'e3', cat: 'erklaeren', ctx: 'Im Schmerzkurs fragt jemand:', say: 'Und woher soll ich wissen, wie viel ich machen darf?', task: 'Erkläre, wie man Belastung selbst steuert.' },
    { id: 'e4', cat: 'erklaeren', ctx: 'Eine Kollegin aus der Psychotherapie fragt:', say: 'Was macht ihr in der Physio eigentlich genau mit den Schmerzpatienten?', task: 'Erkläre es in einer Minute.' },
    { id: 'e5', cat: 'erklaeren', ctx: 'Ein neuer Mitarbeiter fragt dich als Sicherheitsbeauftragten:', say: 'Was mache ich, wenn ich mich hier bei der Arbeit verletze?', task: 'Erkläre die wichtigsten Schritte so, wie es bei euch im Haus geregelt ist.' },
    { id: 'e6', cat: 'erklaeren', ctx: 'Ein Spieler fragt:', say: 'Warum müssen wir eigentlich so viel laufen?', task: 'Erkläre es so, dass er Lust darauf bekommt.' },
    // Ansprache
    { id: 'a1', cat: 'ansprache', ctx: 'Halbzeit. Ihr liegt hinten, die Mannschaft wirkt müde.', say: '', task: 'Halte eine kurze Kabinenansprache.' },
    { id: 'a2', cat: 'ansprache', ctx: 'Vor dem Spiel gegen den Tabellenführer.', say: '', task: 'Sprich die Mannschaft an.' },
    { id: 'a3', cat: 'ansprache', ctx: 'Nach einer klaren Niederlage, kurz vor dem Duschen.', say: '', task: 'Sag ein paar Sätze, mit denen alle nach Hause gehen.' },
    { id: 'a4', cat: 'ansprache', ctx: 'Erster Termin im Schmerzkurs. Die Gruppe wirkt skeptisch.', say: '', task: 'Begrüße die Gruppe und sag, worum es geht.' },
    { id: 'a5', cat: 'ansprache', ctx: 'Teambesprechung.', say: 'Stell dich doch kurz als Sicherheitsbeauftragter vor.', task: 'Sag, wofür man zu dir kommen kann.' },
    { id: 'a6', cat: 'ansprache', ctx: 'Mitarbeiterversammlung.', say: 'Die MAV hat jetzt eine Minute.', task: 'Berichte kurz, woran die MAV gerade arbeitet (allgemein, ohne Interna).' },
    // Video
    { id: 'v1', cat: 'video', ctx: 'Kurzvideo, 60 Sekunden.', say: '', task: 'Warum Schonung bei Rückenschmerz oft nicht hilft.' },
    { id: 'v2', cat: 'video', ctx: 'Kurzvideo, 60 Sekunden.', say: '', task: 'Was „Veränderungen im MRT“ ab 40 bedeuten – und was nicht.' },
    { id: 'v3', cat: 'video', ctx: 'Kurzvideo, 60 Sekunden.', say: '', task: 'Wie fange ich mit Training an, wenn ich lange nichts gemacht habe?' },
    { id: 'v4', cat: 'video', ctx: 'Antwortvideo auf einen Kommentar:', say: 'Mit 50 braucht man keine Kniebeugen mehr.', task: 'Antworte in 60 Sekunden.' },
    { id: 'v5', cat: 'video', ctx: 'Kurzvideo, 60 Sekunden.', say: '', task: 'Erzähl, warum du Physiotherapeut geworden bist.' },
  ],
};
