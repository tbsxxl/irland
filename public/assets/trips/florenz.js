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
    date: "Mi 11.11.", title: "Ankommen, Altstadt & Piazzale Michelangelo", tip: "Sonnenuntergang ca. 16:50",
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
    date: "Do 12.11.", title: "Duomo, Kuppel & David", tip: "Kuppel nur mit gebuchtem Zeitfenster",
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
    date: "Fr 13.11.", title: "Uffizien, Palazzo Vecchio & Santa Croce", tip: "Uffizien: 8:15-Slot ist am ruhigsten",
    stops: [
      { time: "08:15", icon: "palette", text: "Uffizien: Geburt der Venus, Primavera, Leonardo, Michelangelo, Raffael, Caravaggio", place: "uffizi",
        links: [{ label: "Tickets", url: "https://www.uffizi.it/en/tickets" }] },
      { time: "12:30", icon: "sandwich", text: "Schiacciata bei All’Antico Vinaio", place: "vinaio" },
      { time: "14:00", icon: "castle", text: "Palazzo Vecchio – die Turmbesteigung lohnt sich", place: "vecchio" },
      { time: "16:00", icon: "church", text: "Santa Croce: Gräber von Michelangelo, Galileo & Machiavelli", place: "santacroce" },
      { time: "17:30", icon: "ice-cream-cone", text: "Gelato bei Vivoli", place: "vivoli" },
      { time: "20:00", icon: "wine", text: "Abend im Viertel Santa Croce / Sant’Ambrogio" }
    ]
  },
  {
    date: "Sa 14.11.", title: "Tagesausflug Rom", tip: "Zug ca. 1:30 Std. – früh buchen spart viel",
    alt: "Vatikan statt Kolosseum möglich",
    stops: [
      { time: "07:00", icon: "train-front", text: "Frecciarossa ab Firenze S.M.N. nach Roma Termini", place: "smn",
        links: [{ label: "Trenitalia", url: "https://www.trenitalia.com/" }, { label: "Italo", url: "https://www.italotreno.com/" }] },
      { time: "08:45", icon: "landmark", text: "Kolosseum, Forum Romanum & Palatin (ca. 3 Std., Kombiticket mit Zeitfenster)",
        links: [{ label: "Tickets", url: "https://parcocolosseo.it/" }] },
      { time: "12:00", icon: "footprints", text: "Zu Fuß über die Piazza Venezia zum Pantheon" },
      { time: "13:00", icon: "utensils", text: "Mittagessen in der Nähe: Cacio e Pepe oder Carbonara" },
      { time: "14:30", icon: "droplets", text: "Trevi-Brunnen (Besucherlimit bzw. kleine Gebühr)" },
      { time: "15:30", icon: "footprints", text: "Spanische Treppe, danach eventuell Piazza Navona" },
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
    date: "Mo 16.11.", title: "Ausflug Pisa & Lucca", tip: "Montags haben Uffizien, Accademia & Pitti zu",
    alt: "Oder: Siena, San Gimignano & Chianti (Tour oder Mietwagen)",
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
    date: "Di 17.11.", title: "Freier Tag, Shopping & Abschied", tip: "Leder: Scuola del Cuoio & Märkte um San Lorenzo",
    stops: [
      { time: "10:00", icon: "shopping-bag", text: "Leder-Shopping: Scuola del Cuoio hinter Santa Croce", place: "cuoio" },
      { time: "12:30", icon: "shopping-basket", text: "Mercato di Sant’Ambrogio & Lunch bei Da Rocco", place: "santambrogio" },
      { time: "14:30", icon: "store", text: "Lederstände um San Lorenzo & Werkstätten im Oltrarno", place: "sanlorenzomarkt" },
      { time: "16:00", icon: "spray-can", text: "Officina Profumo-Farmaceutica di Santa Maria Novella", place: "farmaceutica" },
      { time: "16:45", icon: "camera", text: "Noch einmal Ponte Vecchio zum Sonnenuntergang", place: "pontevecchio" },
      { time: "20:00", icon: "beef", text: "Abschiedsessen: Bistecca alla fiorentina (Buca Mario)", place: "bucamario" }
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
  rom:      { label: "Rom-Tag",        icon: "landmark", color: "#a8323e" }
};

/* Orte. Koordinaten gerundet; ohne lat/lng nur in der Liste. */
const PLACES = [
  // Museen & Kunst
  { id: "uffizi", cats: ["kunst"], name: "Uffizien", rating: 4.7, note: "Botticelli, Leonardo, Raffael – montags zu", lat: 43.76780, lng: 11.25530, url: "https://www.uffizi.it/en/the-uffizi" },
  { id: "accademia", cats: ["kunst"], name: "Galleria dell’Accademia", rating: 4.6, note: "Michelangelos David – montags zu", lat: 43.77680, lng: 11.25870, url: "https://www.galleriaaccademiafirenze.it/en/" },
  { id: "vecchio", cats: ["kunst", "aussicht"], name: "Palazzo Vecchio", rating: 4.7, note: "Rathaus mit Prunksälen und Turm", lat: 43.76940, lng: 11.25620 },
  { id: "pitti", cats: ["kunst"], name: "Palazzo Pitti", rating: 4.5, note: "Medici-Palast, Galerien – montags zu", lat: 43.76510, lng: 11.25000, url: "https://www.uffizi.it/en/pitti-palace" },
  { id: "bargello", cats: ["kunst"], name: "Museo del Bargello", rating: 4.6, note: "Renaissance-Skulpturen: Donatello, Michelangelo", lat: 43.77050, lng: 11.25820 },
  { id: "medici", cats: ["kunst", "kirche"], name: "Medici-Kapellen", rating: 4.5, note: "Neue Sakristei von Michelangelo", lat: 43.77490, lng: 11.25330 },
  { id: "sanmarco", cats: ["kunst"], name: "Museo di San Marco", rating: 4.6, note: "Klosterzellen mit Fresken von Fra Angelico", lat: 43.77810, lng: 11.25880 },
  { id: "opera", cats: ["kunst"], name: "Museo dell’Opera del Duomo", rating: 4.8, note: "Originale der Dom-Kunstwerke, Pietà von Michelangelo", lat: 43.77360, lng: 11.25730, url: "https://duomo.firenze.it/" },
  { id: "galileo", cats: ["kunst"], name: "Museo Galileo", rating: 4.6, note: "Wissenschaftsgeschichte, gleich neben den Uffizien", lat: 43.76770, lng: 11.25630 },
  { id: "strozzi", cats: ["kunst"], name: "Palazzo Strozzi", rating: 4.5, note: "Wechselausstellungen, Innenhof frei", lat: 43.77120, lng: 11.25180 },
  { id: "brancacci", cats: ["kunst", "kirche"], name: "Cappella Brancacci", rating: 4.5, note: "Masaccio-Fresken in Santa Maria del Carmine", lat: 43.76800, lng: 11.24370 },

  // Kirchen
  { id: "duomo", cats: ["kirche", "aussicht"], name: "Dom & Brunelleschi-Kuppel", rating: 4.8, note: "Kirche frei, Kuppel/Campanile mit Pass & Zeitfenster", lat: 43.77310, lng: 11.25600, url: "https://duomo.firenze.it/" },
  { id: "battistero", cats: ["kirche"], name: "Baptisterium San Giovanni", rating: 4.6, note: "Goldmosaiken, Paradiespforte", lat: 43.77320, lng: 11.25510 },
  { id: "campanile", cats: ["kirche", "aussicht"], name: "Campanile di Giotto", rating: 4.7, note: "414 Stufen, Blick auf die Kuppel", lat: 43.77300, lng: 11.25540 },
  { id: "santacroce", cats: ["kirche"], name: "Santa Croce", rating: 4.6, note: "Gräber von Michelangelo, Galileo, Machiavelli", lat: 43.76860, lng: 11.26220 },
  { id: "smnchiesa", cats: ["kirche", "kunst"], name: "Santa Maria Novella", rating: 4.7, note: "Masaccios Dreifaltigkeit, gegenüber vom Bahnhof", lat: 43.77430, lng: 11.24930 },
  { id: "sanlorenzo", cats: ["kirche"], name: "San Lorenzo", rating: 4.5, note: "Medici-Pfarrkirche von Brunelleschi", lat: 43.77470, lng: 11.25400 },
  { id: "sanminiato", cats: ["kirche", "aussicht"], name: "San Miniato al Monte", rating: 4.8, note: "Romanische Kirche oberhalb des Piazzale, frei", free: true, lat: 43.75950, lng: 11.26500 },
  { id: "santospirito", cats: ["kirche"], name: "Santo Spirito", rating: 4.6, note: "Brunelleschi-Kirche, Platz mit Bars", lat: 43.76740, lng: 11.24740 },

  // Aussicht & Gärten
  { id: "piazzale", cats: ["aussicht"], name: "Piazzale Michelangelo", rating: 4.8, note: "Der Stadtblick – zum Sonnenuntergang", free: true, lat: 43.76290, lng: 11.26500 },
  { id: "pontevecchio", cats: ["aussicht", "markt"], name: "Ponte Vecchio", rating: 4.7, note: "Goldschmiede auf der Brücke", free: true, lat: 43.76800, lng: 11.25310 },
  { id: "signoria", cats: ["aussicht", "kunst"], name: "Piazza della Signoria", rating: 4.8, note: "Loggia dei Lanzi mit Skulpturen, frei", free: true, lat: 43.76960, lng: 11.25580 },
  { id: "boboli", cats: ["aussicht"], name: "Boboli-Garten", rating: 4.5, note: "Hinter dem Palazzo Pitti", lat: 43.76250, lng: 11.24860 },
  { id: "bardini", cats: ["aussicht"], name: "Giardino Bardini", rating: 4.7, note: "Ruhiger Garten mit Blick auf den Dom", lat: 43.76460, lng: 11.25720 },
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
  { id: "mercato", cats: ["markt", "food"], name: "Mercato Centrale", rating: 4.4, note: "Unten Markt, oben Food-Hall", lat: 43.77650, lng: 11.25340 },
  { id: "santambrogio", cats: ["markt"], name: "Mercato di Sant’Ambrogio", rating: 4.5, note: "Markt der Einheimischen, vormittags", lat: 43.77000, lng: 11.26720 },
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

  // Rom-Tag (ohne Koordinaten: nur in der Liste, nicht auf der Florenz-Karte)
  { id: "kolosseum", cats: ["rom"], name: "Kolosseum, Forum Romanum & Palatin", note: "Kombiticket mit Zeitfenster, ca. 3 Std. – früh buchen", url: "https://parcocolosseo.it/" },
  { id: "pantheon", cats: ["rom"], name: "Pantheon", note: "Über die Piazza Venezia zu Fuß erreichbar" },
  { id: "trevi", cats: ["rom"], name: "Trevi-Brunnen", note: "Besucherlimit bzw. kleine Gebühr für den Zugang" },
  { id: "spanischetreppe", cats: ["rom"], name: "Spanische Treppe", note: "Danach eventuell noch zur Piazza Navona" },
  { id: "navona", cats: ["rom"], name: "Piazza Navona", note: "Barockplatz mit Berninis Vierströmebrunnen" },
  { id: "vatikan", cats: ["rom"], name: "Vatikan (Alternative)", note: "Petersdom & Vatikanische Museen – statt Kolosseum, beides an einem Tag ist zu viel", url: "https://www.museivaticani.va/" },
  { id: "termini", cats: ["rom", "info"], name: "Roma Termini", note: "Hauptbahnhof, Ankunft & Abfahrt der Schnellzüge" }
];

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
