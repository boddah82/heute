// Jugend-Modus: Vorlage-Inseln und Gesprächsthemen für Jugendliche. Namen/Details sind Beispiele zum Anpassen.
window.TEEN = {
  islands: {
    it: [
      { title: 'Über mich (Jugend)', sentences: `
Mi chiamo Anna.|Ich heiße Anna.
Ho quattordici anni.|Ich bin vierzehn Jahre alt.
Vengo dalla Germania.|Ich komme aus Deutschland.
Vado a scuola ogni giorno.|Ich gehe jeden Tag zur Schule.
Ho un fratello e una sorella.|Ich habe einen Bruder und eine Schwester.
Il mio colore preferito è il blu.|Meine Lieblingsfarbe ist Blau.
Mi piace ascoltare la musica.|Ich höre gern Musik.
Nel tempo libero esco con i miei amici.|In meiner Freizeit gehe ich mit meinen Freunden raus.
Ho un cane che si chiama Max.|Ich habe einen Hund, der Max heißt.
Studio l'italiano e l'inglese.|Ich lerne Italienisch und Englisch.
` },
      { title: 'Schule', sentences: `
La mia materia preferita è la matematica.|Mein Lieblingsfach ist Mathe.
Oggi abbiamo una verifica di inglese.|Heute schreiben wir einen Englischtest.
Non ho capito i compiti.|Ich habe die Hausaufgaben nicht verstanden.
Posso andare in bagno?|Darf ich auf die Toilette gehen?
Mi presti una penna?|Leihst du mir einen Stift?
A che ora finisce la scuola?|Wann ist die Schule aus?
La nostra insegnante è molto simpatica.|Unsere Lehrerin ist sehr nett.
Dopo la scuola faccio i compiti.|Nach der Schule mache ich die Hausaufgaben.
La ricreazione dura quindici minuti.|Die Pause dauert fünfzehn Minuten.
` },
      { title: 'Freunde & Freizeit', sentences: `
Che cosa fai questo fine settimana?|Was machst du dieses Wochenende?
Andiamo al cinema stasera?|Gehen wir heute Abend ins Kino?
Ci vediamo alle quattro in piazza.|Wir treffen uns um vier auf dem Platz.
Che musica ti piace?|Welche Musik magst du?
Mi mandi un messaggio?|Schreibst du mir eine Nachricht?
Gioco a pallavolo due volte a settimana.|Ich spiele zweimal pro Woche Volleyball.
Prendiamo un gelato?|Holen wir uns ein Eis?
Sono stanca, torno a casa.|Ich bin müde, ich gehe nach Hause.
Che bello vederti!|Wie schön, dich zu sehen!
` },
    ],
    en: [
      { title: 'Über mich (Jugend)', sentences: `
My name is Anna.|Ich heiße Anna.
I'm fourteen years old.|Ich bin vierzehn Jahre alt.
I'm from Germany.|Ich komme aus Deutschland.
I go to school every day.|Ich gehe jeden Tag zur Schule.
I've got a brother and a sister.|Ich habe einen Bruder und eine Schwester.
My favourite colour is blue.|Meine Lieblingsfarbe ist Blau.
I like listening to music.|Ich höre gern Musik.
In my free time I hang out with my friends.|In meiner Freizeit treffe ich mich mit meinen Freunden.
I've got a dog called Max.|Ich habe einen Hund, der Max heißt.
I'm learning Italian and English.|Ich lerne Italienisch und Englisch.
` },
      { title: 'Schule', sentences: `
My favourite subject is maths.|Mein Lieblingsfach ist Mathe.
We've got an English test today.|Heute schreiben wir einen Englischtest.
I didn't understand the homework.|Ich habe die Hausaufgaben nicht verstanden.
May I go to the toilet, please?|Darf ich bitte auf die Toilette gehen?
Can I borrow a pen?|Kann ich mir einen Stift leihen?
What time does school finish?|Wann ist die Schule aus?
Our teacher is really nice.|Unsere Lehrerin ist echt nett.
After school I do my homework.|Nach der Schule mache ich meine Hausaufgaben.
Break lasts fifteen minutes.|Die Pause dauert fünfzehn Minuten.
` },
      { title: 'Freunde & Freizeit', sentences: `
What are you doing this weekend?|Was machst du dieses Wochenende?
Shall we go to the cinema tonight?|Wollen wir heute Abend ins Kino gehen?
Let's meet at four in the town square.|Lass uns um vier auf dem Platz treffen.
What music do you like?|Welche Musik magst du?
Can you text me?|Kannst du mir schreiben?
I play volleyball twice a week.|Ich spiele zweimal pro Woche Volleyball.
Shall we get an ice cream?|Wollen wir uns ein Eis holen?
I'm tired, I'm going home.|Ich bin müde, ich gehe nach Hause.
It's great to see you!|Schön, dich zu sehen!
` },
    ],
  },
  // Gesprächsthemen im Jugend-Modus (ersetzen Hotel/Arzt usw.)
  scenarios: {
    describe: { label: '🔎 Beschreiben', it: 'Description practice ("describe what you see"). Give the learner a small real-world mission: ask them to look around them and find one concrete thing that suits their level (e.g. their school bag, a tree, the sky, their shoes, a pet). Ask them to describe it in 2–3 short sentences: colour, where it is, size or shape, and whether they like it. After each description: react briefly, then ask ONE follow-up question about the same thing. After 2–3 follow-up questions, give a new mission. If the learner sends a photo, use it and ask about details you can see – but never comment on people\'s faces or bodies.' },
    free: { label: 'Freies Gespräch', it: 'Casual chat like a friendly peer or exchange partner: school day, hobbies, music, films, sport, weekend plans.' },
    meet: { label: 'Neue Austauschschülerin', it: 'You are a friendly exchange student of the same age who just arrived at the learner\'s school. Get to know each other.' },
    school: { label: 'In der Schule', it: 'Talk about school: subjects, timetable, teachers (no names), homework, tests, break time.' },
    hobby: { label: 'Hobbys & Musik', it: 'Talk about hobbies, music, sport, films and series (age-appropriate).' },
    icecream: { label: 'In der Eisdiele', it: 'You work at an ice cream shop in {city}. The learner orders. Stay in role.' },
    way: { label: 'Nach dem Weg fragen', it: 'You are a friendly local in {city}. The learner asks for directions. Stay in role.' },
    holiday: { label: 'Ferien & Reisen', it: 'Talk about holidays: where the learner went or would like to go, what they did, food, weather.' },
  },
  // Satzbaukasten-Einträge, die im Jugend-Modus ausgeblendet werden
  hideBuilder: { adjectives: ['sposato', 'married'], likes: ['vino', 'wine'], verbs: ['caffe', 'coffee'] },
};
