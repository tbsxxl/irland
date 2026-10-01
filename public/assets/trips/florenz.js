/* Reise: Florenz (November 2026). Aufbau siehe README.md.
   ENTWURF: Hotel und Flugzeiten fehlen noch – hotel eintragen, dann rechnet die Seite Entfernungen ab dem Hotel. */
(() => {
const TRIP = {
  id: "florenz",
  title: "Florenz",
  icon: "/icons/florenz.svg",
  theme: "florenz", themeColor: "#9A4126",
  subtitle: "Toskana · Kunst, Essen & Ausflüge",
  start: "2026-11-11",
  end: "2026-11-18",
  center: { lat: 43.7700, lng: 11.2545, zoom: 15, name: "Florenz" },
  near: 1,
  tz: "Europe/Rome",
  notice: "Entwurf: Hotel und Flugzeiten fehlen noch. Bis dahin gelten Entfernungen ab dem Dom.",
  cost: "",
  hotel: null,
  base: { name: "Dom (Santa Maria del Fiore)", label: "vom Dom", around: "um den Dom", lat: 43.77310, lng: 11.25600 },
  facts: [
    { label: "Dauer", value: "8 Tage / 7 Nächte" },
    { label: "Wetter November", value: "8–15 °C, regnerisch, Sonnenuntergang ca. 16:50" },
    { label: "Ausflüge", value: "Sa Rom · Mo Pisa & Lucca (oder Siena & Chianti)" }
  ]
};

const IMAGES = {};

/* Tagesplan nach Tobis Vorschlag (7 Programmtage + Abreise).
   Rom am Samstag, Oltrarno am Sonntag (Pitti offen), Ausflug am Montag (Uffizien, Accademia, Pitti zu). */
const DAYS = [
  {
    date: "Mi 11.11.", image: "florenz", title: "Ankommen, Altstadt & Piazzale Michelangelo", tip: "Sonnenuntergang ca. 16:50",
    stops: [
      { time: "14:00", icon: "plane", text: "Ankunft & Transfer ins Hotel (ab FLR: Tram T2 bis Unità, ca. 20 Min.)" },
      { time: "15:15", icon: "footprints", text: "Erster Rundgang: Piazza della Signoria & Altstadt", place: "signoria" },
      { time: "16:00", icon: "camera", text: "Ponte Vecchio im Abendlicht", place: "pontevecchio" },
      { time: "16:30", icon: "sunset", text: "Piazzale Michelangelo zum Sonnenuntergang", place: "piazzale" },
      { time: "17:15", icon: "church", text: "Ein Stück weiter oben: San Miniato al Monte – ruhiger und genauso schön", place: "sanminiato" },
      { time: "19:30", icon: "wine", text: "Aperitivo am Weinfenster: I Fratellini", place: "fratellini" },
      { time: "20:30", icon: "utensils", text: "Dinner: Trattoria Za Za oder Buca Mario", place: "zaza" }
    ]
  },
  {
    date: "Do 12.11.", image: "david", title: "Duomo, Kuppel & David", tip: "Kuppel nur mit gebuchtem Zeitfenster",
    stops: [
      { time: "08:30", icon: "church", text: "Kuppel des Brunelleschi besteigen (463 Stufen)", place: "duomo",
        links: [{ label: "Tickets", url: "https://duomo.firenze.it/" }] },
      { time: "10:00", icon: "landmark", text: "Kombiticket: Campanile, Baptisterium & Dommuseum", place: "opera" },
      { time: "12:30", icon: "sandwich", text: "Mercato Centrale: Lampredotto bei Da Nerbone oder Schiacciata", place: "mercato" },
      { time: "14:30", icon: "person-standing", text: "Galleria dell’Accademia: Michelangelos David im Original", place: "accademia",
        links: [{ label: "Tickets", url: "https://www.galleriaaccademiafirenze.it/en/" }] },
      { time: "16:30", icon: "coffee", text: "Pause im Caffè Gilli an der Piazza della Repubblica", place: "gilli" },
      { time: "20:00", icon: "utensils", text: "Dinner: Trattoria Sostanza (Butterhähnchen, reservieren)", place: "sostanza" }
    ]
  },
  {
    date: "Fr 13.11.", image: "venus", title: "Uffizien, Palazzo Vecchio & Santa Croce", tip: "Uffizien: 8:15-Slot ist am ruhigsten",
    stops: [
      { time: "08:15", icon: "palette", text: "Uffizien: Geburt der Venus, Primavera, Leonardo, Michelangelo, Raffael, Caravaggio", place: "uffizi",
        links: [{ label: "Tickets", url: "https://www.uffizi.it/en/tickets" }] },
      { time: "12:30", icon: "sandwich", text: "Schiacciata bei All’Antico Vinaio oder I’ Girone De’ Ghiotti", place: "vinaio" },
      { time: "14:00", icon: "castle", text: "Palazzo Vecchio – die Turmbesteigung lohnt sich", place: "vecchio" },
      { time: "16:00", icon: "church", text: "Santa Croce: Gräber von Michelangelo, Galileo & Machiavelli", place: "santacroce" },
      { time: "17:30", icon: "ice-cream-cone", text: "Gelato bei Vivoli", place: "vivoli" },
      { time: "20:00", icon: "wine", text: "Abend im Viertel Santa Croce / Sant’Ambrogio" },
      { time: "21:30", icon: "moon", text: "Optional: Abendtour „Die dunkle Seite von Florenz“ (ab 3 €)", place: "darkside" }
    ]
  },
  {
    date: "Sa 14.11.", image: "kolosseum", title: "Tagesausflug Rom", tip: "Zug ca. 1:30 Std. – früh buchen spart viel",
    alt: "Vatikan statt Kolosseum möglich",
    stops: [
      { time: "07:00", icon: "train-front", text: "Frecciarossa ab Firenze S.M.N. nach Roma Termini", place: "smn",
        links: [{ label: "Trenitalia", url: "https://www.trenitalia.com/" }, { label: "Italo", url: "https://www.italotreno.com/" }] },
      { time: "08:45", icon: "landmark", text: "Kolosseum, Forum Romanum & Palatin (ca. 3 Std., Kombiticket mit Zeitfenster)",
        links: [{ label: "Tickets", url: "https://parcocolosseo.it/" }] },
      { time: "12:00", icon: "footprints", text: "Über Kapitolsplatz und Piazza Venezia zum Pantheon", place: "kapitol" },
      { time: "12:45", icon: "landmark", text: "Pantheon, gleich dahinter Santa Maria sopra Minerva", place: "pantheon" },
      { time: "13:15", icon: "utensils", text: "Cacio e Pepe oder Carbonara: Come ’na Vorta (Torre Argentina) oder Mimì & Cocò", place: "comenavorta" },
      { time: "14:30", icon: "church", text: "Auf dem Weg: Sant’Ignazio mit der Scheinkuppel", place: "ignazio" },
      { time: "15:00", icon: "droplets", text: "Trevi-Brunnen (Besucherlimit bzw. kleine Gebühr)", place: "trevi" },
      { time: "15:45", icon: "footprints", text: "Spanische Treppe", place: "spanischetreppe" },
      { time: "16:45", icon: "palette", text: "Eventuell Piazza Navona & Caravaggios in San Luigi dei Francesi", place: "navona" },
      { time: "18:00", icon: "wine", text: "Aperitivo, dann zurück nach Termini" },
      { time: "20:30", icon: "train-front", text: "Frecciarossa zurück nach Florenz (ca. 22:00 an)" }
    ]
  },
  {
    date: "So 15.11.", title: "Oltrarno: Palazzo Pitti & Boboli", tip: "Werkstätten haben sonntags oft zu – Shopping am Dienstag",
    stops: [
      { time: "09:00", icon: "landmark", text: "Palazzo Pitti & Boboli-Gärten", place: "pitti",
        links: [{ label: "Tickets", url: "https://www.uffizi.it/en/pitti-palace" }] },
      { time: "13:00", icon: "utensils", text: "Lunch im Oltrarno: Trattoria 4 Leoni", place: "quattroleoni" },
      { time: "14:30", icon: "palette", text: "Cappella Brancacci (Masaccio-Fresken)", place: "brancacci" },
      { time: "15:30", icon: "church", text: "Santo Spirito – Kirche, Platz & Gassen", place: "santospirito" },
      { time: "16:30", icon: "sunset", text: "Giardino Bardini mit Blick auf den Dom", place: "bardini" },
      { time: "19:30", icon: "wine", text: "Dinner im Oltrarno: Il Santo Bevitore oder Osteria Santo Spirito", place: "santobevitore" }
    ]
  },
  {
    date: "Mo 16.11.", image: "pisa", title: "Ausflug Pisa & Lucca", tip: "Montags haben Uffizien, Accademia & Pitti zu",
    alt: "Oder als Tour: Siena, San Gimignano, Pisa & Weingut (ab 86 €)",
    stops: [
      { time: "08:30", icon: "train-front", text: "Regionalzug nach Pisa Centrale (ca. 1 Std.)", place: "smn",
        links: [{ label: "Trenitalia", url: "https://www.trenitalia.com/" }] },
      { time: "10:00", icon: "castle", text: "Piazza dei Miracoli: Schiefer Turm, Dom, Baptisterium" },
      { time: "13:00", icon: "train-front", text: "Weiter nach Lucca (ca. 30 Min.)" },
      { time: "13:45", icon: "utensils", text: "Mittagessen in der Altstadt" },
      { time: "15:00", icon: "bike", text: "Mit dem Rad auf der Stadtmauer rund um Lucca" },
      { time: "17:30", icon: "train-front", text: "Rückfahrt nach Florenz (ca. 1 Std. 20 Min.)" }
    ]
  },
  {
    date: "Di 17.11.", image: "pontevecchio", title: "Freier Tag, Shopping & Abschied", tip: "Leder: Scuola del Cuoio & Märkte um San Lorenzo",
    alt: "Oder: Pastakochkurs mit Wein (ab 25 €)",
    stops: [
      { time: "10:00", icon: "shopping-bag", text: "Leder-Shopping: Scuola del Cuoio hinter Santa Croce", place: "cuoio" },
      { time: "12:30", icon: "shopping-basket", text: "Mercato di Sant’Ambrogio & Lunch bei Da Rocco", place: "santambrogio" },
      { time: "14:30", icon: "store", text: "Lederstände um San Lorenzo & Werkstätten im Oltrarno", place: "sanlorenzomarkt" },
      { time: "16:00", icon: "spray-can", text: "Officina Profumo-Farmaceutica di Santa Maria Novella", place: "farmaceutica" },
      { time: "16:45", icon: "camera", text: "Noch einmal Ponte Vecchio zum Sonnenuntergang", place: "pontevecchio" },
      { time: "20:00", icon: "beef", text: "Abschiedsessen Bistecca: Buca Mario, La Buchetta oder Osteria Vecchio Cancello", place: "bucamario" }
    ]
  },
  {
    date: "Mi 18.11.", title: "Abreise", tip: "Flugzeit noch eintragen",
    stops: [
      { time: "07:30", icon: "camera", text: "Optional: Ponte Vecchio früh morgens – fast menschenleer", place: "pontevecchio" },
      { time: "09:00", icon: "coffee", text: "Letzter Cappuccino (Ditta Artigianale)", place: "ditta" },
      { time: "11:00", icon: "luggage", text: "Check-out & Transfer zum Flughafen" }
    ]
  }
];

const CATS = {
  kunst:    { label: "Museen & Kunst", icon: "palette", color: "#8e4c8a" },
  kirche:   { label: "Kirchen",        icon: "church", color: "#4a5fa8" },
  aussicht: { label: "Aussicht & Gärten", icon: "sunset", color: "#2f7d4f" },
  food:     { label: "Essen",          icon: "utensils", color: "#c24f2b" },
  wein:     { label: "Wein & Aperitivo", icon: "wine", color: "#8a2436" },
  gelato:   { label: "Gelato & Café",  icon: "ice-cream-cone", color: "#c2701e" },
  markt:    { label: "Märkte & Shopping", icon: "shopping-basket", color: "#5e6b3a" },
  info:     { label: "Praktisch",      icon: "train-front", color: "#34566f" },
  trip:     { label: "Tagesausflüge",  icon: "bus", color: "#6b5a3a" },
  touren:   { label: "Touren & Kurse", icon: "users", color: "#2f6f8f" },
  rom:      { label: "Rom-Tag",        icon: "landmark", color: "#a8323e" }
};

/* Orte. Koordinaten gerundet; ohne lat/lng nur in der Liste. */
const PLACES = [
  // Museen & Kunst
  { id: "uffizi", cats: ["kunst"], name: "Uffizien", rating: 4.6, reviews: 39746, note: "Botticelli, Leonardo, Raffael – montags zu", lat: 43.76780, lng: 11.25530, url: "https://www.uffizi.it/en/the-uffizi" },
  { id: "accademia", cats: ["kunst"], name: "Galleria dell’Accademia", rating: 4.6, reviews: 32530, note: "Michelangelos David – montags zu", lat: 43.77680, lng: 11.25870, url: "https://www.galleriaaccademiafirenze.it/en/" },
  { id: "vecchio", cats: ["kunst", "aussicht"], name: "Palazzo Vecchio", rating: 4.6, reviews: 9497, note: "Rathaus mit Prunksälen und Turm", lat: 43.76940, lng: 11.25620 },
  { id: "pitti", cats: ["kunst"], name: "Palazzo Pitti", rating: 4.4, reviews: 6165, note: "Medici-Palast, Galerien – montags zu", lat: 43.76510, lng: 11.25000, url: "https://www.uffizi.it/en/pitti-palace" },
  { id: "bargello", cats: ["kunst"], name: "Museo del Bargello", rating: 4.6, reviews: 3121, note: "Renaissance-Skulpturen: Donatello, Michelangelo", lat: 43.77050, lng: 11.25820 },
  { id: "medici", cats: ["kunst", "kirche"], name: "Medici-Kapellen", rating: 4.5, reviews: 2209, note: "Neue Sakristei von Michelangelo", lat: 43.77490, lng: 11.25330 },
  { id: "sanmarco", cats: ["kunst"], name: "Museo di San Marco", rating: 4.7, reviews: 2044, note: "Klosterzellen mit Fresken von Fra Angelico", lat: 43.77810, lng: 11.25880 },
  { id: "opera", cats: ["kunst"], name: "Museo dell’Opera del Duomo", rating: 4.6, reviews: 3510, note: "Originale der Dom-Kunstwerke, Pietà von Michelangelo", lat: 43.77360, lng: 11.25730, url: "https://duomo.firenze.it/" },
  { id: "galileo", cats: ["kunst"], name: "Museo Galileo", rating: 4.3, reviews: 2434, note: "Wissenschaftsgeschichte, gleich neben den Uffizien", lat: 43.76770, lng: 11.25630 },
  { id: "strozzi", cats: ["kunst"], name: "Palazzo Strozzi", rating: 4.3, reviews: 1029, note: "Wechselausstellungen, Innenhof frei", lat: 43.77120, lng: 11.25180 },
  { id: "brancacci", cats: ["kunst", "kirche"], name: "Cappella Brancacci", rating: 4.5, note: "Masaccio-Fresken in Santa Maria del Carmine", lat: 43.76800, lng: 11.24370 },

  // Kirchen
  { id: "duomo", cats: ["kirche", "aussicht"], name: "Dom & Brunelleschi-Kuppel", rating: 4.6, reviews: 29345, note: "Kirche frei, Kuppel/Campanile mit Pass & Zeitfenster", lat: 43.77310, lng: 11.25600, url: "https://duomo.firenze.it/" },
  { id: "battistero", cats: ["kirche"], name: "Baptisterium San Giovanni", rating: 4.6, reviews: 4513, note: "Goldmosaiken, Paradiespforte", lat: 43.77320, lng: 11.25510 },
  { id: "campanile", cats: ["kirche", "aussicht"], name: "Campanile di Giotto", rating: 4.7, reviews: 8654, note: "414 Stufen, Blick auf die Kuppel", lat: 43.77300, lng: 11.25540 },
  { id: "santacroce", cats: ["kirche"], name: "Santa Croce", rating: 4.7, reviews: 9425, note: "Gräber von Michelangelo, Galileo, Machiavelli", lat: 43.76860, lng: 11.26220 },
  { id: "smnchiesa", cats: ["kirche", "kunst"], name: "Santa Maria Novella", rating: 4.5, reviews: 3892, note: "Masaccios Dreifaltigkeit, gegenüber vom Bahnhof", lat: 43.77430, lng: 11.24930 },
  { id: "sanlorenzo", cats: ["kirche"], name: "San Lorenzo", rating: 4.1, reviews: 1151, note: "Medici-Pfarrkirche von Brunelleschi", lat: 43.77470, lng: 11.25400 },
  { id: "sanminiato", cats: ["kirche", "aussicht"], name: "San Miniato al Monte", rating: 4.7, reviews: 5418, note: "Romanische Kirche oberhalb des Piazzale, frei", free: true, lat: 43.75950, lng: 11.26500 },
  { id: "santospirito", cats: ["kirche"], name: "Santo Spirito", rating: 4.3, reviews: 434, note: "Brunelleschi-Kirche, Platz mit Bars", lat: 43.76740, lng: 11.24740 },

  // Aussicht & Gärten
  { id: "piazzale", cats: ["aussicht"], name: "Piazzale Michelangelo", rating: 4.7, reviews: 34209, note: "Der Stadtblick – zum Sonnenuntergang", free: true, lat: 43.76290, lng: 11.26500 },
  { id: "pontevecchio", cats: ["aussicht", "markt"], name: "Ponte Vecchio", rating: 4.3, reviews: 21503, note: "Goldschmiede auf der Brücke", free: true, lat: 43.76800, lng: 11.25310 },
  { id: "signoria", cats: ["aussicht", "kunst"], name: "Piazza della Signoria", rating: 4.7, reviews: 17306, note: "Loggia dei Lanzi mit Skulpturen, frei", free: true, lat: 43.76960, lng: 11.25580 },
  { id: "boboli", cats: ["aussicht"], name: "Boboli-Garten", rating: 3.6, reviews: 5397, note: "Hinter dem Palazzo Pitti", lat: 43.76250, lng: 11.24860 },
  { id: "bardini", cats: ["aussicht"], name: "Giardino Bardini", rating: 4.3, reviews: 1178, note: "Ruhiger Garten mit Blick auf den Dom", lat: 43.76460, lng: 11.25720 },
  { id: "rose", cats: ["aussicht"], name: "Giardino delle Rose", rating: 4.6, note: "Weg zum Piazzale, frei", free: true, lat: 43.76370, lng: 11.26280 },
  { id: "belvedere", cats: ["aussicht"], name: "Forte Belvedere", rating: 4.6, note: "Festung mit Rundblick (Öffnung prüfen)", lat: 43.76270, lng: 11.25350 },

  // Essen
  { id: "sostanza", cats: ["food"], name: "Trattoria Sostanza", rating: 4.5, price: "€€", kind: "Florentinisch · Butterhähnchen", lat: 43.77270, lng: 11.24760 },
  { id: "zaza", cats: ["food"], name: "Trattoria Za Za", rating: 4.4, price: "€€", kind: "Toskanisch", lat: 43.77660, lng: 11.25360 },
  { id: "bucamario", cats: ["food"], name: "Buca Mario", rating: 4.4, price: "€€€", kind: "Bistecca im Gewölbekeller", lat: 43.77150, lng: 11.25050 },
  { id: "mario", cats: ["food"], name: "Trattoria Mario", rating: 4.5, price: "€", kind: "Nur mittags, Gemeinschaftstische", lat: 43.77630, lng: 11.25360 },
  { id: "vinaio", cats: ["food"], name: "All’Antico Vinaio", rating: 4.6, price: "€", kind: "Schiacciata", lat: 43.76840, lng: 11.25720 },
  { id: "quattroleoni", cats: ["food"], name: "Trattoria 4 Leoni", rating: 4.4, price: "€€", kind: "Toskanisch, Oltrarno", lat: 43.76620, lng: 11.25050 },
  { id: "santobevitore", cats: ["food", "wein"], name: "Il Santo Bevitore", rating: 4.5, price: "€€", kind: "Modern toskanisch", lat: 43.77000, lng: 11.24680 },
  { id: "osteriasantospirito", cats: ["food"], name: "Osteria Santo Spirito", rating: 4.4, price: "€€", kind: "Trüffel-Gnocchi", lat: 43.76690, lng: 11.24710 },
  { id: "nerbone", cats: ["food"], name: "Da Nerbone", rating: 4.6, price: "€", kind: "Lampredotto im Mercato Centrale", lat: 43.77650, lng: 11.25350 },
  { id: "darocco", cats: ["food"], name: "Da Rocco", rating: 4.5, price: "€", kind: "Mittagstisch im Mercato di Sant’Ambrogio", lat: 43.77000, lng: 11.26720 },

  // Wein & Aperitivo
  { id: "fratellini", cats: ["wein"], name: "I Fratellini", rating: 4.6, price: "€", kind: "Weinbar seit 1875", note: "Panini & Glas Wein im Stehen", lat: 43.77030, lng: 11.25550 },
  { id: "volpi", cats: ["wein"], name: "Le Volpi e l’Uva", rating: 4.6, price: "€€", kind: "Weinbar", note: "Kleine Winzer, nahe Ponte Vecchio", lat: 43.76730, lng: 11.25300 },
  { id: "pitti_gola", cats: ["wein"], name: "Pitti Gola e Cantina", rating: 4.6, price: "€€", kind: "Enoteca", note: "Gegenüber vom Palazzo Pitti", lat: 43.76540, lng: 11.25050 },
  { id: "verrazzano", cats: ["wein", "gelato"], name: "Cantinetta dei Verrazzano", rating: 4.5, price: "€", kind: "Bäckerei & Weinbar", lat: 43.77120, lng: 11.25480 },

  // Gelato & Café
  { id: "vivoli", cats: ["gelato"], name: "Vivoli", rating: 4.5, price: "€", kind: "Gelato seit 1929", lat: 43.77000, lng: 11.26000 },
  { id: "neri", cats: ["gelato"], name: "Gelateria dei Neri", rating: 4.6, price: "€", kind: "Gelato", lat: 43.76800, lng: 11.25900 },
  { id: "carraia", cats: ["gelato"], name: "La Carraia", rating: 4.6, price: "€", kind: "Gelato am Arno", lat: 43.76970, lng: 11.24470 },
  { id: "gilli", cats: ["gelato"], name: "Caffè Gilli", rating: 4.3, price: "€€", kind: "Historisches Café", lat: 43.77180, lng: 11.25410 },
  { id: "ditta", cats: ["gelato"], name: "Ditta Artigianale", rating: 4.5, price: "€", kind: "Specialty Coffee", lat: 43.76800, lng: 11.25670 },

  // Märkte & Shopping
  { id: "mercato", cats: ["markt", "food"], name: "Mercato Centrale", rating: 4.3, reviews: 16888, note: "Unten Markt, oben Food-Hall", lat: 43.77650, lng: 11.25340 },
  { id: "santambrogio", cats: ["markt"], name: "Mercato di Sant’Ambrogio", rating: 4.4, reviews: 305, note: "Markt der Einheimischen, vormittags", lat: 43.77000, lng: 11.26720 },
  { id: "farmaceutica", cats: ["markt"], name: "Officina Profumo-Farmaceutica di S. M. Novella", rating: 4.6, note: "Klosterapotheke seit 1612", lat: 43.77370, lng: 11.24790 },
  { id: "cuoio", cats: ["markt"], name: "Scuola del Cuoio", rating: 4.6, note: "Lederschule hinter Santa Croce, Werkstatt zum Zuschauen", lat: 43.76820, lng: 11.26290 },
  { id: "sanlorenzomarkt", cats: ["markt"], name: "Lederstände San Lorenzo", note: "Märkte rund um San Lorenzo und den Mercato Centrale – Qualität prüfen, handeln erlaubt", lat: 43.77560, lng: 11.25390 },
  { id: "scarpelli", cats: ["markt"], name: "Werkstätten im Oltrarno", note: "Via Maggio, Via Santo Spirito: Buchbinder, Leder, Restauratoren", lat: 43.76700, lng: 11.24900 },

  // Praktisch
  { id: "smn", cats: ["info"], name: "Bahnhof Santa Maria Novella", note: "Züge nach Pisa, Lucca, Bologna; Busse nach Siena", lat: 43.77640, lng: 11.24800 },
  { id: "flr", cats: ["info"], name: "Flughafen Florenz (FLR)", note: "Tram T2 bis Unità, ca. 20 Min." },

  // Tagesausflüge
  { id: "pisa", cats: ["trip"], name: "Pisa", note: "Schiefer Turm & Piazza dei Miracoli · Zug ca. 1 Std." },
  { id: "lucca", cats: ["trip"], name: "Lucca", note: "Stadtmauer zum Radfahren · Zug ca. 1 Std. 20 Min." },
  { id: "siena", cats: ["trip"], name: "Siena", note: "Piazza del Campo & Dom · Bus ca. 1 Std. 15 Min." },
  { id: "sangimignano", cats: ["trip"], name: "San Gimignano", note: "Mittelalterliche Türme, am besten per Tour" },
  { id: "chianti", cats: ["trip", "wein"], name: "Chianti", note: "Weingüter, Greve & Castellina – per Tour oder Mietwagen" },
  { id: "rom", cats: ["trip", "rom"], name: "Rom", note: "Frecciarossa ab S.M.N. ca. 1:30 Std. bis Roma Termini · hin gegen 7 Uhr, zurück gegen 20–21 Uhr", url: "https://www.trenitalia.com/" },
  { id: "pisalucca", cats: ["trip"], name: "Pisa & Lucca", note: "Gut an einem Tag kombinierbar, in Lucca Rad fahren auf der Stadtmauer" },
  { id: "bologna", cats: ["trip", "food"], name: "Bologna", note: "Essen & Arkaden · Schnellzug nur ca. 40 Min." },

  // Weitere Sehenswürdigkeiten (Tripadvisor-Bestenliste, Okt. 2026)
  { id: "loggia", cats: ["kunst", "aussicht"], rating: 4.6, reviews: 2178, name: "Loggia dei Lanzi", note: "Freiluft-Skulpturen an der Piazza della Signoria, u. a. Cellinis Perseus", free: true, lat: 43.76930, lng: 11.25560 },
  { id: "orsanmichele", cats: ["kirche", "kunst"], rating: 4.5, reviews: 1037, name: "Orsanmichele", note: "Kirche & Museum mit Original-Statuen der Zünfte", lat: 43.77080, lng: 11.25470 },
  { id: "medicicardi", cats: ["kunst"], rating: 4.1, reviews: 1071, name: "Palazzo Medici Riccardi", note: "Medici-Palast, Kapelle mit dem Zug der Heiligen Drei Könige", lat: 43.77520, lng: 11.25590 },
  { id: "laurenziana", cats: ["kunst"], rating: 4.5, reviews: 262, name: "Biblioteca Medicea Laurenziana", note: "Michelangelos Treppe und Lesesaal bei San Lorenzo", lat: 43.77460, lng: 11.25370 },
  { id: "davanzati", cats: ["kunst"], rating: 4.5, reviews: 710, name: "Palazzo Davanzati", note: "So wohnte man im Florenz des 14. Jahrhunderts – ruhig, oft leer", lat: 43.77020, lng: 11.25220 },
  { id: "opificio", cats: ["kunst"], rating: 4.7, reviews: 380, name: "Opificio delle Pietre Dure", note: "Steinintarsien – kleines, besonderes Museum", lat: 43.77660, lng: 11.25930 },
  { id: "vasari", cats: ["kunst"], rating: 4.2, reviews: 1145, name: "Corridoio Vasariano", note: "Geheimgang der Medici von den Uffizien zum Palazzo Pitti – nur mit Ticket/Führung", lat: 43.76790, lng: 11.25320 },
  { id: "stibbert", cats: ["kunst"], rating: 4.5, reviews: 781, name: "Museo Stibbert", note: "Rüstungen & Sammlerhaus, etwas außerhalb im Norden", lat: 43.79060, lng: 11.24790 },
  { id: "annunziata", cats: ["kirche"], rating: 4.6, reviews: 445, name: "Santissima Annunziata", note: "Prächtige Kirche am Platz mit Brunelleschis Findelhaus", lat: 43.77690, lng: 11.26010 },
  { id: "ognissanti", cats: ["kirche"], rating: 4.6, reviews: 495, name: "Ognissanti", note: "Grab Botticellis, Fresken von Ghirlandaio", free: true, lat: 43.77260, lng: 11.24650 },
  { id: "porcellino", cats: ["aussicht", "markt"], rating: 4.0, reviews: 858, name: "Fontana del Porcellino", note: "Bronze-Eber am Mercato Nuovo – Schnauze reiben bringt Glück", free: true, lat: 43.76960, lng: 11.25390 },
  { id: "repubblica", cats: ["aussicht"], rating: 4.1, reviews: 1249, name: "Piazza della Repubblica", note: "Mit Karussell und historischen Cafés", free: true, lat: 43.77150, lng: 11.25400 },
  { id: "scarpellimosaici", cats: ["markt", "kunst"], rating: 4.9, reviews: 82, name: "Scarpelli Mosaici", note: "Werkstatt für Florentiner Steinmosaike nahe der Accademia", lat: 43.77630, lng: 11.25770 },
  { id: "jimmys", cats: ["markt"], rating: 4.9, reviews: 1054, name: "Jimmy’s Leather Collection", note: "Ledergeschäft im Viertel San Lorenzo, sehr gut bewertet" },
  { id: "dogane", cats: ["wein"], rating: 4.9, reviews: 203, name: "Antiche Dogane", note: "Weinprobe im Domviertel" },

  // Essen laut Tripadvisor (nicht gesponsert) – ohne genaue Adresse nur in der Liste
  { id: "vecchiocancello", cats: ["food"], rating: 4.8, reviews: 3619, price: "€€–€€€", kind: "Toskanisch · Geheimtipp", name: "Osteria Vecchio Cancello" },
  { id: "lucignolo", cats: ["food"], rating: 4.9, reviews: 1103, price: "€€–€€€", kind: "Steakhaus", name: "Osteria Lucignolo" },
  { id: "ghiotti", cats: ["food"], rating: 4.9, reviews: 5155, price: "€", kind: "Toskanische Sandwiches", note: "Alternative zu All’Antico Vinaio", name: "I’ Girone De’ Ghiotti", lat: 43.77040, lng: 11.25560 },
  { id: "ghibellina", cats: ["gelato"], rating: 4.9, reviews: 758, price: "€", kind: "Bäckerei & Café", name: "Antico Forno Ghibellina" },
  { id: "livio", cats: ["food"], rating: 4.8, reviews: 2856, price: "€", kind: "Pizza", name: "Pizzeria Livio" },
  { id: "agnolino", cats: ["food"], rating: 4.9, reviews: 790, price: "€€€€", kind: "Florentinisch", name: "Trattoria Dell’agnolino" },
  { id: "buchetta", cats: ["food"], rating: 4.7, reviews: 3856, price: "€€–€€€", kind: "Bistecca", name: "La Buchetta" },
  { id: "pandemonio", cats: ["food"], rating: 4.7, reviews: 2870, price: "€€–€€€", kind: "Rustikal, Bistecca · Oltrarno", name: "Trattoria Pandemonio di Casa Brogi" },
  { id: "bambi", cats: ["food"], rating: 4.9, reviews: 1238, price: "€", kind: "Lampredotto & Trippa", name: "Bambi Trippa e Lampredotto" },
  { id: "paninitoscani", cats: ["food"], rating: 4.8, reviews: 5656, price: "€", kind: "Panini am Dom", name: "Panini Toscani" },
  { id: "latini", cats: ["food"], rating: 4.0, reviews: 8082, price: "€€–€€€", kind: "Klassiker, Michelin Bib Gourmand", name: "Il Latini" },
  { id: "fagioli", cats: ["food"], rating: 4.4, reviews: 1661, price: "€€–€€€", kind: "Michelin-gelistet · nur Bargeld, reservieren", name: "Ristorante Del Fagioli" },
  { id: "gozzi", cats: ["food"], rating: 4.5, reviews: 1401, price: "€€–€€€", kind: "Mittags bei San Lorenzo", name: "Trattoria Sergio Gozzi" },
  { id: "dalloste", cats: ["food"], rating: 4.7, reviews: 4378, price: "€€–€€€", kind: "Bistecca", name: "Trattoria dall’Oste" },
  { id: "fettunta", cats: ["food"], rating: 4.6, reviews: 4710, price: "€", kind: "Günstig & satt", name: "La Fettunta" },
  { id: "degusteria", cats: ["food"], rating: 4.8, reviews: 1490, price: "€€€€", kind: "Michelin-gelistet, Trüffel", name: "Degusteria Italiana agli Uffizi" },

  // Touren & Kurse (Tripadvisor, Preise „ab“ pro Person)
  { id: "pastakurs", cats: ["touren"], rating: 5.0, reviews: 8057, price: "ab 25 €", kind: "2–3 Std.", name: "Pastakochkurs mit unbegrenztem Wein", url: "https://www.tripadvisor.de/Search?q=Pastakochkurs%20mit%20unbegrenztem%20Wein%20Florenz" },
  { id: "storyteller", cats: ["touren"], rating: 5.0, reviews: 13454, price: "ab 3 € (Trinkgeld)", kind: "2–3 Std.", name: "Renaissance & Medici – Tour mit Geschichtenerzähler", note: "Guter Einstieg am ersten Tag", url: "https://www.tripadvisor.de/Search?q=Renaissance%20Medici%20Tales%20Florenz" },
  { id: "darkside", cats: ["touren"], rating: 4.9, reviews: 3200, price: "ab 3 €", kind: "Abendtour, 1–2 Std.", name: "Die dunkle Seite von Florenz", note: "Geister, Morde, Legenden", url: "https://www.tripadvisor.de/Search?q=Die%20dunkle%20Seite%20von%20Florenz" },
  { id: "toskanatour", cats: ["touren", "trip"], rating: 4.9, reviews: 6562, price: "ab 86 €", kind: "Ganztags", name: "Toskana an einem Tag: Siena, San Gimignano, Pisa + Weingut", note: "Alternative für Montag – alles in einem Tag", url: "https://www.tripadvisor.de/Search?q=Toskana%20Tagesausflug%20Siena%20San%20Gimignano%20Pisa%20Mittagessen%20Weingut" },
  { id: "weinprobe", cats: ["touren", "wein"], rating: 4.9, reviews: 3777, price: "ab 89 €", kind: "4–5 Std.", name: "Weinprobe in kleiner Gruppe in der Toskana", url: "https://www.tripadvisor.de/Search?q=Weinprobe%20kleine%20Gruppe%20Toskana%20Florenz" },
  { id: "chiantihalb", cats: ["touren", "wein"], rating: 4.8, reviews: 2353, price: "ab 55 €", kind: "Halbtags", name: "Chianti-Weinprobe mit zwei Weingütern", url: "https://www.tripadvisor.de/Search?q=Halbt%C3%A4gige%20Chianti%20Weinprobe%20zwei%20Weing%C3%BCtern" },
  { id: "sunsetfood", cats: ["touren", "food"], rating: 5.0, reviews: 4538, price: "ab 109 €", kind: "3–4 Std.", name: "Sunset Food & Wine Tour (Eating Europe)", url: "https://www.tripadvisor.de/Search?q=Florenz%20Sunset%20Food%20Wine%20Tour%20Eating%20Europe" },
  { id: "farmkurs", cats: ["touren"], rating: 5.0, reviews: 4348, price: "ab 64 €", kind: "5 Std.", name: "Pizza- oder Pastakurs mit Gelato auf einem Toskana-Hof", url: "https://www.tripadvisor.de/Search?q=Florence%20Pizza%20Pasta%20Class%20Gelato%20Tuscan%20Farm" },
  { id: "cinqueterre", cats: ["touren", "trip"], rating: 4.9, reviews: 2962, price: "ab 50 €", kind: "Ganztags", name: "Tagesausflug Cinque Terre", url: "https://www.tripadvisor.de/Search?q=Tagesausflug%20Cinque%20Terre%20ab%20Florenz" },
  { id: "uffizifuehrung", cats: ["touren", "kunst"], rating: 4.8, reviews: 3236, price: "ab 68 €", kind: "Kleingruppe, auch Deutsch", name: "Uffizien-Führung", url: "https://www.tripadvisor.de/Search?q=Uffizien%20Galerie%20Kleingruppenf%C3%BChrung" },
  { id: "accademiafuehrung", cats: ["touren", "kunst"], rating: 4.9, reviews: 2605, price: "ab 37 €", kind: "Mit festem Ticket, auch Deutsch", name: "Accademia-Führung inkl. Eintritt", url: "https://www.tripadvisor.de/Search?q=Florence%20Accademia%20Galerie%20Tour%20Eintrittskarten%20mit%20fester%20Zeit" },
  { id: "oper", cats: ["touren"], rating: 4.6, reviews: 229, price: "ab 35 €", kind: "Abends, 1 Std.", name: "Opernkonzert in der Kirche Santa Monaca", url: "https://www.tripadvisor.de/Search?q=Opernkonzert%20Santa%20Monaca%20Florenz" },

  // Rom-Tag (nur Liste, liegt außerhalb der Florenz-Karte). Bewertungen: Tripadvisor, Okt. 2026
  { id: "kolosseum", cats: ["rom"], city: "Rom", rating: 4.6, reviews: 151297, name: "Kolosseum", note: "Kombiticket mit Forum & Palatin, Zeitfenster früh buchen", url: "https://parcocolosseo.it/" },
  { id: "forum", cats: ["rom"], city: "Rom", rating: 4.6, reviews: 25448, name: "Forum Romanum", note: "Im Kombiticket mit dem Kolosseum" },
  { id: "palatin", cats: ["rom"], city: "Rom", rating: 4.6, reviews: 25483, name: "Palatin", note: "Hügel über dem Forum – Ausblick, im Kombiticket" },
  { id: "kapitol", cats: ["rom"], city: "Rom", rating: 4.5, reviews: 1451, name: "Kapitolsplatz", note: "Michelangelos Platz, auf dem Weg zur Piazza Venezia – Blick aufs Forum" },
  { id: "vittoriano", cats: ["rom"], city: "Rom", rating: 4.5, reviews: 12547, name: "Vittoriano (Piazza Venezia)", note: "„Hochzeitstorte“ – Panorama-Terrasse" },
  { id: "valentini", cats: ["rom"], city: "Rom", rating: 4.7, reviews: 3776, name: "Domus Romane di Palazzo Valentini", note: "Unterirdische römische Häuser mit Projektionen, Ticket nötig" },
  { id: "pantheon", cats: ["rom"], city: "Rom", rating: 4.7, reviews: 80565, name: "Pantheon", note: "Größte unbewehrte Kuppel der Welt – Ticket mit Zeitfenster" },
  { id: "minerva", cats: ["rom"], city: "Rom", rating: 4.6, reviews: 1936, name: "Santa Maria sopra Minerva", note: "Gotische Kirche direkt hinter dem Pantheon", free: true },
  { id: "argentina", cats: ["rom"], city: "Rom", rating: 4.5, reviews: 1056, name: "Largo di Torre Argentina", note: "Wo Caesar starb – heute Katzenschutzgebiet" },
  { id: "ignazio", cats: ["rom"], city: "Rom", rating: 4.7, reviews: 4000, name: "Sant’Ignazio di Loyola", note: "Zwischen Pantheon und Trevi – Scheinkuppel an der Decke", free: true },
  { id: "trevi", cats: ["rom"], city: "Rom", rating: 4.4, reviews: 104629, name: "Trevi-Brunnen", note: "Besucherlimit bzw. kleine Gebühr für den Zugang" },
  { id: "spanischetreppe", cats: ["rom"], city: "Rom", rating: 3.9, reviews: 23256, name: "Spanische Treppe", note: "Riesig, voll, schöner Blick" },
  { id: "navona", cats: ["rom"], city: "Rom", rating: 4.5, reviews: 40169, name: "Piazza Navona", note: "Mit Berninis Vierströmebrunnen (4,6)" },
  { id: "sanluigi", cats: ["rom"], city: "Rom", rating: 4.7, reviews: 5527, name: "San Luigi dei Francesi", note: "Drei Caravaggios, zwischen Pantheon und Navona", free: true },
  { id: "vatikan", cats: ["rom"], city: "Rom", rating: 4.3, reviews: 42071, name: "Vatikanische Museen (Alternative)", note: "Statt Kolosseum – beides an einem Tag ist zu viel", url: "https://www.museivaticani.va/" },
  { id: "engelsburg", cats: ["rom"], city: "Rom", rating: 4.5, reviews: 14822, name: "Engelsburg", note: "Nahe Vatikan, toller Blick" },
  { id: "trastevere", cats: ["rom"], city: "Rom", rating: 4.6, reviews: 17578, name: "Trastevere", note: "Viertel mit Bars & Restaurants – fürs Abendessen, wenn Zeit bleibt" },
  { id: "borghese", cats: ["rom"], city: "Rom", rating: 4.6, reviews: 18368, name: "Galleria Borghese", note: "Bernini & Caravaggio – nur mit Reservierung" },
  { id: "mariamaggiore", cats: ["rom"], city: "Rom", rating: 4.7, reviews: 16763, name: "Santa Maria Maggiore", note: "Patriarchalbasilika, 10 Min. von Termini", free: true },
  { id: "termini", cats: ["rom", "info"], city: "Rom", name: "Roma Termini", note: "Hauptbahnhof, Ankunft & Abfahrt der Schnellzüge" },
  // Essen in Rom (Tripadvisor, nicht gesponsert)
  { id: "comenavorta", cats: ["rom", "food"], city: "Rom", rating: 4.8, reviews: 1962, price: "€€–€€€", kind: "Pasta & Wein", name: "Come ’na Vorta – Torre Argentina", note: "Mittagessen nah am Pantheon" },
  { id: "mimicoco", cats: ["rom", "food"], city: "Rom", rating: 4.7, reviews: 11568, price: "€€–€€€", kind: "Römisch, Carbonara", name: "Mimì & Cocò" },
  { id: "cipasso", cats: ["rom", "food"], city: "Rom", rating: 4.9, reviews: 4455, price: "€€–€€€", kind: "Michelin-gelistet", name: "Cipasso" },
  { id: "sistina52", cats: ["rom", "food"], city: "Rom", rating: 4.9, reviews: 1070, price: "€€–€€€", kind: "Nahe Spanischer Treppe", name: "Sistina 52" },
  { id: "adhoc", cats: ["rom", "food"], city: "Rom", rating: 4.9, reviews: 1042, price: "€€€€", kind: "Nahe Kolosseum", name: "Ad Hoc – Circo Massimo" },
  { id: "tonnarello", cats: ["rom", "food"], city: "Rom", rating: 4.9, reviews: 558, price: "€€–€€€", kind: "Römisch · Trastevere", name: "Tonnarello" },
  { id: "vaccinari", cats: ["rom", "food"], city: "Rom", rating: 4.9, reviews: 1823, price: "€€–€€€", kind: "Authentisch römisch", name: "I Vaccinari" }
];

/* Weitere Einträge aus den Tripadvisor-Listen (Stand Okt. 2026, ohne gesponserte Einträge).
   Ohne Koordinaten: erscheinen nur in der Liste, „Suchen“ öffnet die Kartensuche. */
const TA = (q) => "https://www.tripadvisor.de/Search?q=" + encodeURIComponent(q);
const fl = (id, cats, name, rating, reviews, extra = {}) => ({ id, cats, name, rating, reviews, ...extra });
const eat = (id, name, rating, reviews, price, kind, extra = {}) => ({ id, cats: ["food"], name, rating, reviews, price, kind, ...extra });
const tour = (id, name, rating, reviews, price, kind, extra = {}) =>
  ({ id, cats: ["touren", ...(extra.cats || [])], name, rating, reviews, price: "ab " + price + " €", kind, url: TA(name + (extra.city ? " " + extra.city : " Florenz")), ...extra, ...(extra.cats ? { cats: ["touren", ...extra.cats] } : {}) });
const rom = (id, name, rating, reviews, note, extra = {}) => ({ id, cats: ["rom"], city: "Rom", name, rating, reviews, note, ...extra });
const romEat = (id, name, rating, reviews, price, kind, extra = {}) => ({ id, cats: ["rom", "food"], city: "Rom", name, rating, reviews, price, kind, ...extra });

PLACES.push(
  // Florenz: Sehenswürdigkeiten
  fl("piazzaduomo", ["aussicht"], "Piazza del Duomo", 4.7, 22823, { note: "Meistbesuchter Platz, Blick auf Dom, Campanile & Baptisterium", free: true, lat: 43.77310, lng: 11.25560 }),
  fl("kuppel", ["aussicht", "kirche"], "Cupola del Brunelleschi", 4.7, 6809, { note: "Aufstieg nur mit Zeitfenster (Kombiticket)", url: "https://duomo.firenze.it/" }),
  fl("palvecchiomuseo", ["kunst"], "Museo di Palazzo Vecchio", 4.6, 1515, { note: "Prunkräume & Blick vom Turm" }),
  fl("nettuno", ["aussicht"], "Fontana del Nettuno", 4.3, 1165, { note: "Neptunbrunnen an der Piazza della Signoria", free: true }),
  fl("perseus", ["kunst"], "Perseus mit dem Haupt der Medusa (Cellini)", 4.7, 1798, { note: "In der Loggia dei Lanzi", free: true }),
  fl("leonardomuseo", ["kunst"], "Museo Leonardo da Vinci", 4.4, 2135, { note: "Nachgebaute Maschinen zum Ausprobieren, nahe Dom" }),
  fl("leonardointeractive", ["kunst"], "Leonardo Interactive Museum", 4.2, 1217, { note: "Interaktive Maschinen, gut bei Regen" }),
  fl("palatina", ["kunst"], "Galleria Palatina (Palazzo Pitti)", 4.5, 1576, { note: "Raffael & Tizian, im Pitti-Ticket" }),
  fl("piazzasantacroce", ["aussicht"], "Piazza di Santa Croce", 4.3, 1166, { free: true }),
  fl("piazzasantospirito", ["aussicht", "wein"], "Piazza Santo Spirito", 4.3, 583, { note: "Abends voller Bars – schönster Platz der Oltrarno", free: true }),
  fl("oltrarno", ["aussicht", "markt"], "Oltrarno", 4.4, 219, { note: "Viertel jenseits des Arno: Werkstätten, Trattorien" }),
  fl("oblate", ["kunst", "gelato"], "Biblioteca delle Oblate", 4.4, 184, { note: "Bibliothek mit Dachcafé und Blick auf die Kuppel", free: true }),
  fl("arsetfides", ["kirche"], "Ars et Fides", 5.0, 528, { note: "Ehrenamtliche Führungen in Kirchen (Spende)" }),
  fl("cascine", ["markt"], "Mercato delle Cascine", 3.9, 87, { note: "Großer Wochenmarkt dienstags vormittags im Cascine-Park" }),
  fl("david2", ["markt"], "David 2 Leather Factory", 4.6, 149, { note: "Lederjacken nach Maß, nahe Dom" }),
  fl("guccigarden", ["kunst", "markt"], "Gucci Garden", 3.9, 752, { note: "Modemuseum an der Piazza della Signoria" }),
  fl("serialkiller", ["kunst"], "Museum Serial Killer", 4.9, 37, { note: "Klein & schaurig" }),

  // Florenz: Essen (Tripadvisor-Rangliste)
  eat("niccolini", "Caffè del Teatro Niccolini", 4.9, 1221, "€€–€€€", "Café & Frühstück, Blick auf den Dom", { cats: ["gelato"] }),
  eat("alagrande", "Ala Grande Caffè", 4.8, 912, "€", "Café", { cats: ["gelato"] }),
  eat("cancellomacci", "Osteria Cancello dei Macci", 4.9, 1026, "€€€€", "Toskanisch, gehoben"),
  eat("mamaeat", "Mama Eat Firenze", 4.8, 1780, "€€–€€€", "Pizza, auch glutenfrei"),
  eat("bottaio", "Antico Bottaio", 4.9, 647, "€€–€€€", "Meeresfrüchte"),
  eat("giglio", "Osteria Giglio d’oro", 4.9, 2517, "€€–€€€", "Steakhaus"),
  eat("conviviale", "Braceria Conviviale", 5.0, 147, "€€–€€€", "Steakhaus"),
  eat("cupola", "Ristorante La Cupola", 4.8, 2070, "€€€€", "Steakhaus"),
  eat("brandolino", "Ristorante Brandolino", 4.8, 1650, "€€–€€€", "Toskanisch"),
  eat("carnivori", "I Carnivori Firenze", 4.9, 734, "€€–€€€", "Steakhaus"),
  eat("volo", "Il Volo Steakhouse", 4.9, 270, "€€–€€€", "Steakhaus"),
  eat("granaio", "Ristorante Il Granaio", 4.9, 807, "€€–€€€", "Steakhaus"),
  eat("dolcevita", "Osteria La Dolce Vita", 4.8, 900, "€€–€€€", "Steakhaus"),
  eat("boccanegra", "Boccanegra", 4.6, 2347, "€€–€€€", "Italienisch"),
  eat("manzo", "Manzo Firenze", 4.7, 854, "€€–€€€", "Steakhaus"),
  eat("cavurrino", "Osteria Cavurrino", 4.9, 309, "€€–€€€", "Steakhaus · „keine Touristenfalle“"),
  eat("pizzagnolo", "PizzAgnolo", 4.8, 1801, "€€–€€€", "Pizza"),
  eat("vinsanto", "Casa del Vin Santo", 4.8, 853, "€€–€€€", "Toskanisch & Pizza"),
  eat("fratellinitratt", "Trattoria I Fratellini", 4.9, 2472, "€€€€", "Bistecca (nicht die Weinbar)"),
  eat("buchettasc", "La Buchetta Santa Croce", 5.0, 255, "€€–€€€", "Steakhaus"),
  eat("aldone", "Steakhouse Da Aldone", 4.8, 221, "€€–€€€", "Steakhaus"),
  eat("barretto", "Il Barretto", 4.7, 2267, "€€–€€€", "Meeresfrüchte, Toskanisch"),
  eat("trepanche", "Osteria delle Tre Panche", 4.3, 878, "€€–€€€", "Toskanisch"),
  eat("tuscani", "I’ Tuscani San Pancrazio", 4.7, 3625, "€€–€€€", "Bistecca"),
  eat("taj", "Ristorante Taj Palace", 4.9, 1647, "€€–€€€", "Indisch"),
  eat("alfredo", "Trattoria Alfredo", 4.6, 2593, "€€–€€€", "Toskanisch, „wie bei Mama“"),
  eat("vecchiomercato", "Trattoria Vecchio Mercato", 4.5, 2359, "€€–€€€", "Italienisch"),
  eat("bucaniccolini", "Buca Niccolini", 4.7, 4013, "€€–€€€", "Italienisch & Pizza"),
  eat("brindellone", "I’Brindellone", 4.5, 2615, "€€–€€€", "Toskanisch, Oltrarno"),
  eat("allagriglia", "Ristorante Alla Griglia", 4.5, 2791, "€€–€€€", "Steakhaus"),
  eat("museobistecca", "Museo della Bistecca", 4.8, 811, "€€–€€€", "Steakhaus"),
  eat("lorenzomedici", "Pizzeria Lorenzo de’ Medici", 4.3, 4300, "€€–€€€", "Pizza"),
  eat("osteriafiore", "Osteria del Fiore", 4.7, 879, "€€–€€€", "Steakhaus, Aussicht"),
  eat("giovanniosteria", "L’Osteria di Giovanni", 4.6, 4151, "€€–€€€", "Italienisch"),
  eat("auditore", "Auditore Ristorante Braceria", 4.8, 3931, "€€–€€€", "Steakhaus, nahe Uffizien"),
  eat("tendarossa", "La Tenda Rossa", 4.8, 430, "€€–€€€", "Steakhaus"),
  eat("trattgiovanni", "Trattoria Giovanni", 4.6, 2184, "€€–€€€", "Toskanisch"),
  eat("vecchisapori", "Osteria Vini e Vecchi Sapori", 4.6, 2626, "€€–€€€", "Klein, urig, nahe Signoria"),
  eat("lavigna", "Osteria La Vigna", 4.9, 233, "€€–€€€", "Toskanisch, Bistecca"),
  eat("labistecca", "La Bistecca – Osteria Fiorentina", 4.5, 2040, "€€–€€€", "Steakhaus"),
  eat("santamaria", "Il Santa Maria Steakhouse", 4.7, 625, "€€–€€€", "Steakhaus"),
  eat("amici", "Amici di Ponte Vecchio", 4.7, 1816, "€", "Toskanisches Streetfood"),
  eat("jiawei", "Ravioleria Jiawei", 4.9, 406, "€", "Chinesische Teigtaschen, spät offen"),
  eat("braceria11", "Braceria All’11", 4.8, 571, "€€–€€€", "Steakhaus"),

  // Florenz: weitere Touren & Kurse
  tour("accademiatour2", "Accademia Gallery Tour mit Eintrittskarte", 4.9, 4437, 48, "1–2 Std., auch Deutsch"),
  tour("accademiakurz", "Accademia-Führung mit Tourleiter", 4.7, 78, 20, "1 Std., auch Deutsch"),
  tour("pastatiramisu", "Pasta & Tiramisu Kochkurs mit Wein", 5.0, 2540, 49, "3 Std."),
  tour("pizzakurs", "Pizzakurs mit Gelato & Wein", 4.9, 1713, 47, "3 Std."),
  tour("steaktour", "Kulinarische Abendtour mit Florentiner Steak & Wein", 4.8, 329, 72, "3–4 Std.", { cats: ["food"] }),
  tour("vespa", "Chianti Vespa Tour mit Weinprobe & Essen", 4.9, 1197, 105, "6–7 Std.", { cats: ["wein"] }),
  tour("weinsafari", "Weinsafari Toskana (kleine Gruppe)", 5.0, 2455, 130, "6–9 Std.", { cats: ["wein"] }),
  tour("chiantivineyard", "Halbtägiger Chianti-Ausflug mit Weinproben", 4.7, 1864, 55, "5 Std.", { cats: ["wein"] }),
  tour("chiantierlebnis", "Chianti Weinerlebnis mit Verkostungen", 4.5, 493, 35, "5–6 Std.", { cats: ["wein"] }),
  tour("monteriggioni", "San Gimignano, Siena, Monteriggioni & Chianti mit Mittagessen", 4.8, 2904, 79, "Ganztags", { cats: ["trip"] }),
  tour("pisasienasg", "Pisa, Siena, San Gimignano mit Weingut", 4.7, 4517, 65, "Ganztags", { cats: ["trip"] }),
  tour("sienasgpanorama", "Siena & San Gimignano mit Panoramablick", 4.9, 215, 49, "Ganztags, Kleingruppe", { cats: ["trip"] }),
  tour("sienachiantiwines", "Siena, San Gimignano & Chianti Wines Day Tour", 4.8, 2545, 65, "Ganztags", { cats: ["trip"] }),
  tour("domkuppeltour", "Dom-Tour mit Kuppelaufstieg", 4.9, 367, 109, "3 Std., auch Deutsch"),
  tour("domterrassen", "Dom & Terrassen oder First Entry Dome Climb", 4.8, 512, 82, "2–4 Std."),
  tour("domgefuehrt", "Dom-Führung mit Prioritätseintritt", 4.8, 124, 30, "1–2 Std."),
  tour("bestof", "David & Accademia mit Duomo (Kleingruppe)", 4.7, 754, 55, "2½–3½ Std."),
  tour("davidUffizien", "David, Accademia & Uffizien (Kleingruppe)", 4.6, 264, 45, "3 Std."),
  tour("rundgang", "Rundgang durch Florenz (Trinkgeld-Tour)", 4.9, 375, 3, "2–3 Std."),
  tour("biketour", "Florenz Highlights per Rad (E-Bike möglich)", 4.8, 84, 40, "3 Std."),
  tour("ebikehills", "E-Bike-Tour in die Hügel mit Olivenöl-Verkostung", 5.0, 41, 55, "2½ Std."),
  tour("golfcart", "Private Golfcart-Tour", 4.8, 193, 68, "1–2 Std., auch Deutsch"),
  tour("leonardoticket", "Eintritt Leonardo da Vinci-Museum", 4.5, 1499, 11, "1–1½ Std."),

  // Rom: weitere Sehenswürdigkeiten
  rom("villaborghese", "Villa Borghese", 4.5, 8195, "Großer Park, ruhiger Rückzug"),
  rom("colonna", "Palazzo Colonna", 4.8, 1256, "Prunkgalerie, nur an bestimmten Tagen offen"),
  rom("lateran", "San Giovanni in Laterano", 4.7, 8148, "Bischofskirche von Rom"),
  rom("doriapamphilj", "Galleria Doria Pamphilj", 4.6, 2815, "Privatsammlung mit Caravaggio & Velázquez, vormittags leer"),
  rom("centrostorico", "Centro Storico", 4.8, 6150, "Gassen zwischen Pantheon, Navona und Campo de’ Fiori"),
  rom("palazzomassimo", "Palazzo Massimo (Museo Nazionale Romano)", 4.7, 2475, "Antike Fresken der Villa der Livia, nahe Termini"),
  rom("welcometorome", "Welcome to Rome", 4.8, 1568, "Multimedia-Show zur Stadtgeschichte"),
  rom("vierstroeme", "Vierströmebrunnen", 4.6, 5270, "Berninis Brunnen auf der Piazza Navona", { free: true }),
  rom("clemente", "San Clemente", 4.7, 4457, "Kirche über Kirche über römischem Haus – „Stadt unter der Stadt“"),
  rom("mariatrastevere", "Santa Maria in Trastevere", 4.6, 4213, "Goldene Mosaiken", { free: true }),
  rom("popolo", "Piazza del Popolo", 4.3, 4426, "Großer Platz am Nordende der Via del Corso", { free: true }),
  rom("capitolini", "Kapitolinische Museen", 4.5, 3029, "Am Kapitolsplatz, Blick aufs Forum"),
  rom("kapuziner", "Kapuzinergruft", 4.2, 2692, "Knochenkapellen an der Via Veneto"),
  rom("caracalla", "Caracalla-Thermen", 4.4, 2678, "Riesige Ruinen der Kaiserthermen"),
  rom("campofiori", "Campo de’ Fiori", 4.1, 3696, "Markt am Vormittag, abends Bars"),
  rom("vincoli", "San Pietro in Vincoli", 4.6, 5557, "Michelangelos Moses – 10 Min. vom Kolosseum", { free: true }),
  rom("callisto", "Katakomben von San Callisto", 4.4, 2218, "An der Via Appia, nur mit Führung"),
  rom("domusaurea", "Domus Aurea", 4.5, 1521, "Neros Goldenes Haus, Führung mit VR"),
  rom("angeli", "Santa Maria degli Angeli e dei Martiri", 4.7, 2847, "Michelangelos Kirche in den Diokletiansthermen, nahe Termini", { free: true }),
  rom("corso", "Via del Corso", 4.2, 1441, "Einkaufsstraße zwischen Piazza Venezia und Popolo"),
  rom("piazzavenezia", "Piazza Venezia", 4.5, 3478, "Verkehrsknoten vor dem Vittoriano"),
  rom("gianicolo", "Gianicolo", 4.6, 1726, "Aussichtshügel über Trastevere"),
  rom("stadioolimpico", "Stadio Olimpico", 3.8, 1656, "Lazio & AS Rom – Spielplan prüfen"),
  rom("gesu", "Chiesa del Gesù", 4.7, 1606, "Barocke Jesuitenkirche", { free: true }),
  rom("barberini", "Palazzo Barberini", 4.2, 1239, "Caravaggio & Deckenfresken"),
  rom("coppede", "Quartiere Coppedè", 4.6, 684, "Verspieltes Jugendstil-Viertel"),
  rom("vittoria", "Santa Maria della Vittoria", 4.7, 2652, "Berninis Verzückung der heiligen Theresa", { free: true }),
  rom("testaccio", "Mercato di Testaccio", 4.3, 376, "Markthalle mit Streetfood"),
  rom("trionfale", "Mercato Trionfale", 4.4, 375, "Bauernmarkt nahe Vatikan"),
  rom("farnesina", "Villa Farnesina", 4.6, 868, "Raffael-Fresken in Trastevere"),
  rom("paolo", "San Paolo fuori le Mura", 4.8, 2242, "Patriarchalbasilika, weniger überlaufen"),
  rom("leonardorom", "Museo Leonardo da Vinci (Rom)", 3.8, 745, "Eher enttäuschend laut Bewertungen"),
  rom("prassede", "Santa Prassede", 4.7, 1264, "Byzantinische Mosaiken nahe Santa Maria Maggiore", { free: true }),
  rom("mariapopolo", "Santa Maria del Popolo", 4.6, 1389, "Zwei Caravaggios an der Piazza del Popolo", { free: true }),
  rom("domitian", "Domitian-Stadion", 4.4, 924, "Antikes Stadion unter der Piazza Navona"),

  // Rom: Restaurants (Tripadvisor-Rangliste)
  romEat("comenavortadorotea", "Come ’na Vorta – Santa Dorotea", 4.9, 1393, "€€–€€€", "Römisch · Trastevere"),
  romEat("adeva", "ADEVA Cucina Moderna", 4.9, 1688, "€€–€€€", "Modern italienisch"),
  romEat("ornelli", "Ornelli Black Angus Steakhouse", 4.8, 2627, "€€€€", "Steakhaus"),
  romEat("docenobistrot", "DOC EnoBistrot", 4.9, 2680, "€€–€€€", "Italienisch & Steak"),
  romEat("bonosanpietro", "Bono Bottega Nostrana – San Pietro", 4.9, 2151, "€", "Deli, nahe Vatikan"),
  romEat("acasatua", "A Casa Tua", 4.9, 1178, "€€–€€€", "Römisch"),
  romEat("sushisen", "Sushisen", 4.5, 2232, "€€–€€€", "Sushi, Michelin-gelistet"),
  romEat("comenavortarufina", "Come ’na Vorta – Rufina", 4.9, 604, "€€–€€€", "Pasta & Pizza"),
  romEat("bonocucina", "Bono Cucina", 4.8, 1705, "€€–€€€", "Italienisch"),
  romEat("comenavortaflorida", "Come ’na Vorta – Via Florida", 4.8, 4838, "€€–€€€", "Pasta, nahe Torre Argentina"),
  romEat("tonnarellomaria", "Tonnarello Santa Maria", 4.8, 708, "€€–€€€", "Römisch"),
  romEat("rame", "Ramè Sushi Naturale Italiano", 4.9, 212, "€€–€€€", "Sushi"),
  romEat("bonosantacroce", "Bono Bottega Nostrana – Santa Croce", 5.0, 91, "€", "Sandwiches & Frühstück"),
  romEat("fuorinorma", "Fuorinorma", 4.8, 1548, "€", "Deli"),
  romEat("dacicero", "Da Cicero", 4.9, 2861, "€€–€€€", "Pizza & Pinsa"),
  romEat("colonnette", "Le Colonnette", 4.9, 644, "€€€€", "Meeresfrüchte"),
  romEat("lume", "Lume – Osteria alle Scalette", 4.9, 604, "€€–€€€", "Italienisch"),
  romEat("enotico", "Enotico Bistrot", 4.9, 840, "€€–€€€", "Italienisch"),
  romEat("parola", "Osteria della Parola", 4.9, 168, "€€–€€€", "Einfache römische Küche"),
  romEat("cantinacucina", "Cantina & Cucina", 4.7, 18788, "€€–€€€", "Italienisch, nahe Navona"),
  romEat("tonnarellopietro", "Tonnarello San Pietro", 4.8, 2192, "€€–€€€", "Römisch, nahe Vatikan"),
  romEat("primo", "Primo Urban Bistrot", 5.0, 446, "€€–€€€", "Italienisch"),
  romEat("mimicocoroma", "Mimì e Cocò Roma", 4.9, 791, "€€–€€€", "Carbonara-Tipp"),
  romEat("iolanda", "Iolanda Vino e Cucina", 5.0, 318, "€€€€", "Gehobene Küche"),
  romEat("ferrofuoco", "Il Ferro e il Fuoco", 4.9, 480, "€€€€", "Gehobene Küche"),
  romEat("adhocpopolo", "Ad Hoc – Piazza del Popolo", 4.7, 7446, "€€€€", "Gehobene Küche"),
  romEat("enea", "Enea Ristorante", 4.9, 346, "€€€€", "Gehobene Küche"),

  // Rom: Food-Touren (nur mit späterem Rückzug sinnvoll)
  tour("trasteveretwilight", "Rome Twilight Trastevere Food Tour (Eating Europe)", 4.9, 6598, 104, "4 Std., abends", { city: "Rom", cats: ["rom", "food"] }),
  tour("romkulinarik", "Kulinarische Tour durch Rom mit ortskundigem Guide", 4.8, 2651, 47, "2½ Std.", { city: "Rom", cats: ["rom", "food"] }),
  tour("rom15", "Rom Essen & Wein: 15 Verkostungen in Trastevere & Ghetto", 4.9, 3707, 73, "2 Std.", { city: "Rom", cats: ["rom", "food"] })
);

/* Bilder (Wikimedia Commons). Lädt ein Bild nicht, blendet die Seite es aus. */
const WMF = (file) => ({
  src: "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=960",
  page: "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file)
});
Object.assign(IMAGES, {
  david: { ...WMF("Michelangelo's David 2015.jpg"), alt: "Michelangelos David in der Accademia" },
  venus: { ...WMF("Sandro Botticelli - La nascita di Venere - Google Art Project - edited.jpg"), alt: "Botticellis Geburt der Venus, Uffizien" },
  kolosseum: { ...WMF("Colosseo 2020.jpg"), alt: "Das Kolosseum in Rom" },
  pisa: { ...WMF("The Leaning Tower of Pisa SB.jpeg"), alt: "Der Schiefe Turm von Pisa" },
  florenz: { ...WMF("Florence Duomo from Michelangelo hill.jpg"), alt: "Blick vom Piazzale Michelangelo auf Florenz" },
  pontevecchio: { ...WMF("Ponte Vecchio, Florence, Italy.jpg"), alt: "Ponte Vecchio über dem Arno" }
});

const CHECKLISTS = [
  {
    id: "book", title: "Buchungen",
    items: [
      { id: "hotel", text: "Hotel eintragen (Seite rechnet dann ab Hotel)" },
      { id: "flights", text: "Flugzeiten eintragen" },
      { id: "duomo", text: "Dom-Kombiticket mit Kuppel-Zeitfenster – Do 08:30" },
      { id: "accademia", text: "Accademia (David) – Do 14:30" },
      { id: "sostanza", text: "Tisch bei Sostanza – Do" },
      { id: "uffizi", text: "Uffizien – Fr 08:15" },
      { id: "romzug", text: "Frecciarossa Florenz ⇄ Rom (hin ~7 Uhr, zurück ~20:30) – Sa" },
      { id: "kolosseum", text: "Kolosseum, Forum & Palatin mit Zeitfenster – Sa" },
      { id: "pitti", text: "Palazzo Pitti & Boboli – So" },
      { id: "brancacci", text: "Cappella Brancacci (Reservierung prüfen) – So" },
      { id: "ausflug", text: "Mo: Zug Pisa/Lucca – oder Tour Siena/San Gimignano/Chianti" }
    ]
  },
  {
    id: "pack", title: "Packliste",
    items: [
      { id: "id", text: "Personalausweis" },
      { id: "shoes", text: "Bequeme, regenfeste Schuhe (Kopfsteinpflaster!)" },
      { id: "umbrella", text: "Regenschirm & warme Jacke" },
      { id: "scarf", text: "Schal/Tuch – Schultern in Kirchen bedecken" },
      { id: "power", text: "Powerbank & Ladekabel" },
      { id: "cash", text: "Etwas Bargeld für Märkte & Kurtaxe" }
    ]
  }
];

const INFOS = [
  { icon: "ticket", title: "Tickets vorab", text: "Dom-Kuppel (Kombiticket mit Campanile, Baptisterium & Dommuseum), Uffizien, Accademia und Kolosseum haben Zeitfenster und sind oft ausgebucht – vor der Reise online buchen." },
  { icon: "camera", title: "Beste Zeit für Fotos", text: "Ponte Vecchio früh morgens oder zum Sonnenuntergang. Piazzale Michelangelo zum Sonnenuntergang (im November ca. 16:50)." },
  { icon: "calendar-x", title: "Montags geschlossen", text: "Uffizien, Accademia und Palazzo Pitti haben montags Ruhetag. Deshalb ist Montag der Ausflugstag." },
  { icon: "plane", title: "Flughafen → Stadt", text: "Von Florenz (FLR) mit der Tram T2 bis Unità in ca. 20 Min. Von Pisa (PSA) mit dem PisaMover und Zug in ca. 1 Std. 15 Min." },
  { icon: "train-front", title: "Zug", text: "Regionalzüge (Pisa, Lucca) am Bahnsteig oder in der Trenitalia-App kaufen; Papiertickets vor der Fahrt entwerten." },
  { icon: "church", title: "Kirchen", text: "Schultern und Knie bedeckt, sonst kein Einlass. Während Messen keine Besichtigung." },
  { icon: "euro", title: "Bezahlen & Trinkgeld", text: "„Coperto“ (Gedeck) steht auf der Rechnung und ist normal. Trinkgeld freiwillig, Aufrunden reicht. Kurtaxe zahlt man im Hotel." },
  { icon: "coffee", title: "Café wie die Italiener", text: "Espresso am Tresen ist deutlich günstiger als am Tisch. Cappuccino nur bis mittags." },
  { icon: "train-front", title: "Tagesausflug Rom (Sa)", text: "Frecciarossa ab Firenze S.M.N. in ca. 1:30 Std. bis Roma Termini, früh gebucht deutlich günstiger. Hin gegen 7 Uhr, zurück gegen 20–21 Uhr. Für den Vatikan bleibt neben dem Kolosseum keine Zeit – wenn er dir wichtiger ist, tausch ihn gegen das Kolosseum." },
  { icon: "siren", title: "Notruf", text: "112 – europaweite Notrufnummer." }
];

(window.TRIPS ||= []).push({ ...TRIP, images: IMAGES, days: DAYS, cats: CATS, places: PLACES, checklists: CHECKLISTS, infos: INFOS });
})();
