/* Reise: Dublin & Nordirland (Oktober 2025). Aufbau siehe README.md. */
(() => {
const TRIP = {
  id: "irland",
  title: "Dublin & Nordirland",
  icon: "/icons/irland.svg",
  theme: "irland", themeColor: "#1E6A4E",
  center: { lat: 53.3455, lng: -6.2635, zoom: 14, name: "Dublin" },
  near: 2,
  tz: "Europe/Dublin",
  subtitle: "Solo-Reise · Dublin, Belfast & Westküste",
  start: "2025-10-16",          // Tag 1 (für „Heute“-Markierung und Countdown)
  end: "2025-10-23",
  cost: "€1.050–1.250 ohne Flug",
  hotel: {
    name: "Staycity Aparthotels Dublin City Quay",
    short: "Staycity City Quay",
    address: "City Quay, Dublin 2",
    lat: 53.34623, lng: -6.25207,
    url: "https://www.staycity.com/dublin/city-quay"
  },
  facts: [
    { label: "Dauer", value: "8 Tage / 7 Nächte" },
    { label: "Wetter Oktober", value: "10–14 °C, oft Schauer" },
    { label: "ÖPNV", value: "Leap Visitor Card (3 Tage) für Bus, Luas & DART" }
  ]
};

/* Bilder von Wikimedia Commons (Lizenz/Urheber auf der jeweiligen Dateiseite). */
const WM = "https://upload.wikimedia.org/wikipedia/commons/";
const IMAGES = {
  trinity: {
    src: WM + "thumb/d/d7/The_entrance_of_the_historic_Trinity_College_%28Unsplash%29.jpg/960px-The_entrance_of_the_historic_Trinity_College_%28Unsplash%29.jpg",
    alt: "Eingang des Trinity College Dublin",
    page: "https://commons.wikimedia.org/wiki/File:The_entrance_of_the_historic_Trinity_College_(Unsplash).jpg"
  },
  causeway: {
    src: WM + "thumb/c/c0/Causeway-code_poet-4.jpg/960px-Causeway-code_poet-4.jpg",
    alt: "Basaltsäulen am Giant’s Causeway",
    page: "https://commons.wikimedia.org/wiki/File:Causeway-code_poet-4.jpg"
  },
  hedges: {
    src: WM + "thumb/b/b2/Dark_Hedges_near_Armoy%2C_Co_Antrim_%28cropped%29.jpg/960px-Dark_Hedges_near_Armoy%2C_Co_Antrim_%28cropped%29.jpg",
    alt: "Die Dark Hedges bei Armoy",
    page: "https://commons.wikimedia.org/wiki/File:Dark_Hedges_near_Armoy,_Co_Antrim_(cropped).jpg"
  },
  moher: {
    src: WM + "thumb/7/74/Cliffs_of_Moher%2C_Irland.jpg/960px-Cliffs_of_Moher%2C_Irland.jpg",
    alt: "Cliffs of Moher an der Atlantikküste",
    page: "https://commons.wikimedia.org/wiki/File:Cliffs_of_Moher,_Irland.jpg"
  }
};

/* Tagesplan. stop.place verweist auf eine Ort-ID aus PLACES (für „Karte“). */
const DAYS = [
  {
    date: "Do 16.10.", title: "Ankunft & Temple Bar", tip: "Tipp: The Cobblestone (Live-Musik)",
    stops: [
      { time: "14:00", icon: "plane", text: "Ankunft & Transfer ins Hotel (Dublin Express / Aircoach)" },
      { time: "16:00", icon: "footprints", text: "Spaziergang Liffey → Ha’penny Bridge → Temple Bar" },
      { time: "18:00", icon: "utensils", text: "Dinner: The Bank on College Green / Boxty House",
        links: [{ label: "Karte", url: "https://www.google.com/maps/search/?api=1&query=The+Bank+on+College+Green+Dublin" }] },
      { time: "20:00", icon: "beer", text: "Pub-Tour: The Church · O’Donoghue’s · The Cobblestone", place: "cobblestone",
        links: [{ label: "Tickets", url: "https://dublinpubcrawl.com/" }] }
    ]
  },
  {
    date: "Fr 17.10.", title: "Book of Kells & Guinness Storehouse", tip: "Kombi-Ticket spart ca. €7,50", image: "trinity",
    stops: [
      { time: "12:00", icon: "scroll", text: "Book of Kells Experience + Old Library", place: "kells",
        links: [{ label: "Tickets", url: "https://www.tcd.ie/library/old-library/" }] },
      { time: "14:15", icon: "beer", text: "Guinness Storehouse + Gravity Bar", place: "guinness",
        links: [{ label: "Tickets", url: "https://www.guinness-storehouse.com/" }] },
      { time: "17:00", icon: "sunset", text: "Spaziergang oder St. Stephen’s Green", place: "stephens" },
      { time: "19:00", icon: "utensils", text: "Dinner: Fade Street Social / The Church",
        links: [{ label: "Reservieren", url: "https://www.fadestreetsocial.com/" }] }
    ]
  },
  {
    date: "Sa 18.10.", title: "Game of Thrones Studio Tour", tip: "Treffpunkt Molly Malone · ca. €80 inkl. Bus", ni: true,
    stops: [
      { time: "09:45", icon: "bus", text: "Abfahrt Dublin → Banbridge (90 Min.)", place: "molly",
        links: [{ label: "Tickets", url: "https://gameofthronesstudiotour.com/" }] },
      { time: "11:15", icon: "clapperboard", text: "Selbstgeführte Tour (2–3 Std.)" },
      { time: "13:30", icon: "utensils", text: "Lunch im Studio-Café oder The Boulevard Banbridge" },
      { time: "15:00", icon: "bus", text: "Rückfahrt nach Dublin" },
      { time: "16:30", icon: "flag", text: "Ankunft City Centre" },
      { time: "19:00", icon: "utensils", text: "Abendessen: The Woollen Mills / Fade Street Social" }
    ]
  },
  {
    date: "So 19.10.", title: "Giant’s Causeway, Dark Hedges & Belfast", tip: "Treffpunkt Molly Malone Statue", ni: true, image: "causeway",
    stops: [
      { time: "06:30", icon: "bus", text: "Abfahrt College Green / Molly Malone", place: "molly",
        links: [{ label: "Tickets", url: "https://www.irishdaytours.ie/" }] },
      { time: "10:45", icon: "trees", text: "Dark Hedges (Kingsroad aus Game of Thrones)" },
      { time: "12:15", icon: "waves", text: "Giant’s Causeway (UNESCO-Welterbe)" },
      { time: "16:00", icon: "building-2", text: "Belfast City (optional Black Cab Tour)" },
      { time: "20:00", icon: "flag", text: "Rückkehr nach Dublin" }
    ]
  },
  {
    date: "Mo 20.10.", title: "Whiskey-Tag & Bohemians vs St Pat’s", tip: "Anstoß 20:45 Uhr, Dalymount Park",
    stops: [
      { time: "11:00", icon: "glass-water", text: "Teeling Whiskey Distillery – Trinity Tour mit Tasting", place: "teeling",
        links: [{ label: "Tickets", url: "https://teelingdistillery.com/" }] },
      { time: "13:00", icon: "utensils", text: "Lunch: Brother Hubbard South / The Woollen Mills" },
      { time: "16:00", icon: "glass-water", text: "Jameson Distillery Bow St. (45-Min.-Tour)", place: "jameson",
        links: [{ label: "Tickets", url: "https://www.jamesonwhiskey.com/visit-us/bow-st-dublin" }] },
      { time: "18:30", icon: "hamburger", text: "Early Dinner nahe Stadion (The Back Page)", place: "backpage" },
      { time: "20:45", icon: "goal", text: "Bohemians vs St Patrick’s Athletic", place: "dalymount" }
    ]
  },
  {
    date: "Di 21.10.", title: "Cliffs of Moher, Burren & Galway", tip: "Treffpunkt Molly Malone Statue", image: "moher",
    stops: [
      { time: "06:50", icon: "bus", text: "Abfahrt Dublin (10 Min. vorher da sein)", place: "molly",
        links: [{ label: "Tickets", url: "https://www.irishdaytours.ie/" }] },
      { time: "10:45", icon: "mountain", text: "Cliffs of Moher – Hauptstopp" },
      { time: "12:45", icon: "soup", text: "Lunch in Doolin (Gus O’Connor’s Pub)" },
      { time: "14:00", icon: "mountain", text: "The Burren – Kalksteinlandschaft" },
      { time: "15:45", icon: "music", text: "Galway – Spanish Arch & Straßenmusik" },
      { time: "19:05", icon: "flag", text: "Rückkehr nach Dublin" }
    ]
  },
  {
    date: "Mi 22.10.", title: "Parks, Kunst & Farewell", tip: "Entspannter Tag",
    stops: [
      { time: "09:30", icon: "palette", text: "Merrion Square & National Gallery / MoLI", place: "gallery" },
      { time: "13:00", icon: "utensils", text: "Lunch: Avoca Café / Tang Café", place: "tang" },
      { time: "14:30", icon: "trees", text: "Phoenix Park / Botanic Gardens oder kurzer Howth-Trip", place: "phoenix" },
      { time: "20:00", icon: "utensils", text: "Farewell-Dinner: Fade Street Social / The Church" }
    ]
  },
  {
    date: "Do 23.10.", title: "Abreise", tip: "Flug 08:55 ab DUB",
    stops: [
      { time: "06:00", icon: "luggage", text: "Check-out & Transfer (Aircoach / Dublin Express)" },
      { time: "08:55", icon: "plane", text: "Rückflug ab Dublin Airport" }
    ]
  }
];

const CATS = {
  hist:  { label: "Geschichte",  icon: "landmark", color: "#8a5a2b" },
  brau:  { label: "Whiskey & Bier", icon: "glass-water", color: "#c2701e" },
  kunst: { label: "Kunst",       icon: "palette", color: "#8e4c8a" },
  bibl:  { label: "Bibliotheken", icon: "library", color: "#4a5fa8" },
  natur: { label: "Natur",       icon: "trees", color: "#2f7d4f" },
  film:  { label: "Filmorte",    icon: "clapperboard", color: "#b0414a" },
  food:  { label: "Essen",       icon: "utensils", color: "#c24f2b" },
  night: { label: "Abends & Touren", icon: "moon", color: "#34566f" },
  trip:  { label: "Tagesausflüge", icon: "bus", color: "#5e6b3a" }
};

/* Orte. cats: erste Kategorie bestimmt die Farbe. Ohne lat/lng erscheint der Ort nur in der Liste. */
const PLACES = [
  // Geschichte & Museen
  { id: "kilmainham", cats: ["hist"], name: "Kilmainham Gaol", rating: 4.6, note: "Ehemaliges Gefängnis, Führung unbedingt vorab buchen", lat: 53.34190, lng: -6.30953, url: "https://heritageireland.ie/visit/places-to-visit/kilmainham-gaol/" },
  { id: "guinness", cats: ["hist", "brau"], name: "Guinness Storehouse", rating: 4.3, note: "Mit Gravity Bar und Blick über die Stadt", lat: 53.34190, lng: -6.28670, url: "https://www.guinness-storehouse.com/" },
  { id: "littlemuseum", cats: ["hist"], name: "The Little Museum of Dublin", rating: 4.8, note: "Stadtgeschichte & U2, am St. Stephen’s Green", lat: 53.33965, lng: -6.25973, url: "https://www.littlemuseum.ie/" },
  { id: "kells", cats: ["hist", "bibl"], name: "Book of Kells & Old Library", rating: 4.3, note: "Trinity College, Zeitfenster buchen", lat: 53.34380, lng: -6.25640, url: "https://www.tcd.ie/library/old-library/" },
  { id: "rocknroll", cats: ["hist"], name: "Irish Rock ’N’ Roll Museum", rating: 4.9, note: "Temple Bar", lat: 53.34528, lng: -6.26529, url: "https://irishrocknrollmuseum.com/" },
  { id: "epic", cats: ["hist"], name: "EPIC – Irish Emigration Museum", rating: 4.8, note: "Docklands, 5 Min. vom Hotel über die Liffey", lat: 53.34880, lng: -6.24750, url: "https://epicchq.com/" },
  { id: "stpatricks", cats: ["hist"], name: "St Patrick’s Cathedral", rating: 4.4, lat: 53.33943, lng: -6.27125, url: "https://www.stpatrickscathedral.ie/" },
  { id: "archaeology", cats: ["hist"], name: "National Museum – Archaeology", rating: 4.6, note: "Moorleichen & Keltengold, Eintritt frei", free: true, lat: 53.34050, lng: -6.25493, url: "https://www.museum.ie/en-ie/museums/archaeology" },
  { id: "glasnevin", cats: ["hist"], name: "Glasnevin Cemetery", rating: 4.8, note: "Friedhof & Museum, neben den Botanic Gardens", lat: 53.37170, lng: -6.27860, url: "https://www.glasnevinmuseum.ie/" },
  { id: "henrietta", cats: ["hist"], name: "14 Henrietta Street", rating: 4.9, note: "Georgianisches Haus & Tenement-Geschichte", lat: 53.35236, lng: -6.26996, url: "https://14henriettastreet.ie/" },
  { id: "castle", cats: ["hist", "film"], name: "Dublin Castle", rating: 4.0, note: "Drehort von „The Tudors“", lat: 53.34290, lng: -6.26740, url: "https://www.dublincastle.ie/" },
  { id: "dublinia", cats: ["hist"], name: "Dublinia", rating: 4.2, note: "Wikinger & Mittelalter", lat: 53.34330, lng: -6.27215, url: "https://dublinia.ie/" },
  { id: "croke", cats: ["hist"], name: "Croke Park Tour & GAA Museum", rating: 4.8, lat: 53.36063, lng: -6.25120, url: "https://crokepark.ie/visit" },
  { id: "jeanie", cats: ["hist"], name: "Jeanie Johnston Tall Ship", rating: 4.7, note: "Auswandererschiff, direkt gegenüber vom Hotel", lat: 53.34800, lng: -6.24560, url: "https://jeaniejohnston.ie/" },
  { id: "christchurch", cats: ["hist"], name: "Christ Church Cathedral", rating: 4.4, lat: 53.34350, lng: -6.27106, url: "https://christchurchcathedral.ie/" },
  { id: "gpo", cats: ["hist"], name: "GPO Museum", rating: 4.5, note: "Osteraufstand 1916", lat: 53.34940, lng: -6.26040, url: "https://www.gpowitnesshistory.ie/" },
  { id: "famine", cats: ["hist"], name: "Famine Memorial", rating: 4.5, note: "Skulpturen am Custom House Quay, frei", free: true, lat: 53.34813, lng: -6.24555 },

  // Whiskey
  { id: "jameson", cats: ["brau"], name: "Jameson Distillery Bow St.", rating: 4.5, note: "Tour & Verkostung, Smithfield", lat: 53.34830, lng: -6.27730, url: "https://www.jamesonwhiskey.com/visit-us/bow-st-dublin" },
  { id: "teeling", cats: ["brau"], name: "Teeling Whiskey Distillery", rating: 4.8, note: "Produktion & Tasting, Newmarket", lat: 53.33790, lng: -6.27680, url: "https://teelingdistillery.com/" },
  { id: "roe", cats: ["brau"], name: "Roe & Co Distillery", rating: 4.7, note: "Cocktail-Workshops, nahe Guinness", lat: 53.34320, lng: -6.28800, url: "https://roeandcowhiskey.com/" },
  { id: "whiskeymuseum", cats: ["brau"], name: "Irish Whiskey Museum", rating: 4.8, note: "Guter Überblick mit Tasting, gegenüber Trinity", lat: 53.34410, lng: -6.25930, url: "https://irishwhiskeymuseum.ie/" },

  // Kunst
  { id: "gallery", cats: ["kunst"], name: "National Gallery of Ireland", rating: 4.7, note: "Eintritt frei, am Merrion Square", free: true, lat: 53.34090, lng: -6.25240, url: "https://www.nationalgallery.ie/" },
  { id: "beatty", cats: ["kunst", "hist"], name: "Chester Beatty", rating: 4.7, note: "Handschriften aus aller Welt, frei", free: true, lat: 53.34263, lng: -6.26885, url: "https://chesterbeatty.ie/" },
  { id: "hughlane", cats: ["kunst", "film"], name: "Hugh Lane Gallery", rating: 4.6, note: "Francis-Bacon-Atelier, frei · Drehort „Normal People“", free: true, lat: 53.35410, lng: -6.26460, url: "https://www.hughlane.ie/" },
  { id: "imma", cats: ["kunst", "film"], name: "IMMA", rating: 4.6, note: "Moderne Kunst im Royal Hospital, meist frei", free: true, lat: 53.34300, lng: -6.30020, url: "https://imma.ie/" },
  { id: "smockalley", cats: ["kunst"], name: "Smock Alley Theatre", rating: 4.7, note: "Ältestes Theater Dublins – Spielplan prüfen", lat: 53.34500, lng: -6.27020, url: "https://smockalley.com/" },

  // Bibliotheken
  { id: "marsh", cats: ["bibl"], name: "Marsh’s Library", rating: 4.6, note: "Seit 1707 fast unverändert", lat: 53.33950, lng: -6.27160, url: "https://www.marshlibrary.ie/" },
  { id: "nli", cats: ["bibl"], name: "National Library of Ireland", rating: 4.6, note: "Yeats-Ausstellung, frei", free: true, lat: 53.34120, lng: -6.25440, url: "https://www.nli.ie/" },

  // Natur
  { id: "stephens", cats: ["natur", "film"], name: "St Stephen’s Green", rating: 4.7, note: "Historischer Stadtpark · Drehort „Once“", free: true, lat: 53.33820, lng: -6.25910 },
  { id: "phoenix", cats: ["natur"], name: "Phoenix Park", rating: 4.8, note: "Riesiger Park mit Hirschen – Fahrrad leihen lohnt sich", free: true, lat: 53.35590, lng: -6.32980 },
  { id: "zoo", cats: ["natur"], name: "Dublin Zoo", rating: 4.6, note: "Im Phoenix Park", lat: 53.35620, lng: -6.30530, url: "https://www.dublinzoo.ie/" },
  { id: "botanic", cats: ["natur", "hist"], name: "National Botanic Gardens", rating: 4.7, note: "Viktorianische Gewächshäuser, frei", free: true, lat: 53.37260, lng: -6.27160, url: "https://botanicgardens.ie/" },
  { id: "howth", cats: ["natur", "trip"], name: "Howth Cliff Walk", rating: 4.8, note: "Klippenweg am Meer, 30 Min. mit der DART", lat: 53.37880, lng: -6.06560 },

  // Film
  { id: "grafton", cats: ["film"], name: "Grafton Street", rating: 4.6, note: "Straßenmusik & Shopping · Drehort „Once“", free: true, lat: 53.34150, lng: -6.25990 },
  { id: "trinity", cats: ["film"], name: "Trinity College", rating: 4.6, note: "Drehort „Normal People“", free: true, lat: 53.34380, lng: -6.25460, url: "https://www.tcd.ie/" },
  { id: "got", cats: ["film", "trip"], name: "Game of Thrones Studio Tour", rating: 4.9, note: "Banbridge, Nordirland – Tagesausflug", url: "https://gameofthronesstudiotour.com/" },

  // Abends & Touren
  { id: "cobblestone", cats: ["night", "film"], name: "The Cobblestone", rating: 4.7, note: "Traditionelle Live-Musik jeden Abend", lat: 53.34960, lng: -6.27820, url: "https://www.thecobblestonepub.ie/" },
  { id: "cruise", cats: ["night"], name: "Liffey-Bootstour", rating: 4.6, note: "Ab Bachelors Walk", lat: 53.34690, lng: -6.26150, url: "https://dublindiscovered.ie/" },
  { id: "ghostbus", cats: ["night"], name: "Dublin Ghost Bus Tour", rating: 4.5, note: "Gruseltour mit Schauspiel, ab O’Connell Street", lat: 53.35250, lng: -6.26060 },
  { id: "darkdublin", cats: ["night"], name: "Dark Dublin Tour", note: "Folter, Mord & Mysterium – Abendführung" },
  { id: "gravedigger", cats: ["night"], name: "Gravedigger Ghost Tour", note: "2-Std.-Geisterbus mit Pub-Stopp" },
  { id: "folklore", cats: ["night"], name: "Mythologie- & Folklore-Tour", note: "Irische Legenden erzählt" },
  { id: "pubtour", cats: ["night"], name: "Pub-Tour abseits der Touristen", note: "Lokale Pubs & Tastings" },
  { id: "irishcoffee", cats: ["night"], name: "Irish Coffee Masterclass", note: "Workshop" },
  { id: "cooking", cats: ["night", "food"], name: "Irish Craic & Cuisine Kochkurs", note: "Kochen & gemeinsames Dinner" },
  { id: "dalymount", cats: ["night"], name: "Dalymount Park", note: "Stadion der Bohemians", lat: 53.36150, lng: -6.27290 },
  { id: "backpage", cats: ["night", "food"], name: "The Back Page", rating: 4.5, note: "Sport-Pub nahe Dalymount", lat: 53.35880, lng: -6.27330 },

  // Essen
  { id: "fire", cats: ["food"], name: "FIRE Steakhouse & Bar", rating: 4.8, price: "€€€€", kind: "Steak", lat: 53.34177, lng: -6.25812, url: "https://www.firesteakhouse.ie/" },
  { id: "sole", cats: ["food"], name: "Sole Seafood & Grill", rating: 4.8, price: "€€€€", kind: "Fisch", lat: 53.34086, lng: -6.25809, url: "https://www.sole.ie/" },
  { id: "ryleighs", cats: ["food"], name: "Ryleigh’s", rating: 4.8, price: "€€–€€€", kind: "Steak", lat: 53.33849, lng: -6.23588, url: "https://ryleighs.ie/" },
  { id: "brookwood", cats: ["food"], name: "Brookwood", rating: 4.6, price: "€€–€€€", kind: "Steak", lat: 53.34386, lng: -6.25866, url: "https://brookwood.ie/" },
  { id: "featherblade", cats: ["food"], name: "Featherblade", rating: 4.5, price: "€€–€€€", kind: "Steak", lat: 53.34233, lng: -6.25986, url: "https://featherblade.ie/" },
  { id: "bloom", cats: ["food"], name: "Bloom Brasserie", rating: 4.7, price: "€€–€€€", kind: "Modern", lat: 53.33676, lng: -6.25265, url: "https://www.bloombrasserie.ie/" },
  { id: "tang", cats: ["food"], name: "Tang Café", rating: 4.8, price: "€", kind: "Frühstück", lat: 53.34186, lng: -6.25963, url: "https://www.tang.ie/" },
  { id: "lennox", cats: ["food"], name: "31 Lennox", rating: 4.9, price: "€€–€€€", kind: "Frühstück", lat: 53.33160, lng: -6.26680, url: "https://31lennox.ie/" },
  { id: "urbanity", cats: ["food"], name: "Urbanity", rating: 4.7, price: "€€–€€€", kind: "Brunch", lat: 53.34764, lng: -6.27309, url: "https://urbanity.ie/" },
  { id: "lemonjelly", cats: ["food"], name: "Lemon Jelly Café", rating: 4.5, price: "€€–€€€", kind: "Frühstück", lat: 53.34714, lng: -6.26246, url: "https://lemonjelly.ie/" },
  { id: "murphys", cats: ["food"], name: "Murphy’s Bistro Café", rating: 4.7, price: "€€–€€€", kind: "Frühstück", lat: 53.35017, lng: -6.25659 },
  { id: "lovinspoon", cats: ["food"], name: "Lovinspoon", rating: 4.7, price: "€", kind: "Frühstück", lat: 53.35337, lng: -6.26015 },
  { id: "glovers", cats: ["food"], name: "Glovers Alley", rating: 4.7, price: "€€€€", kind: "Fine Dining", lat: 53.33802, lng: -6.26003, url: "https://gloversalley.com/" },
  { id: "wilde", cats: ["food"], name: "WILDE Restaurant", rating: 4.8, price: "€€€€", kind: "Fine Dining", lat: 53.33833, lng: -6.25956, url: "https://wilde.ie/" },
  { id: "gardenroom", cats: ["food"], name: "The Garden Room", rating: 4.7, price: "€€€€", kind: "Elegant", lat: 53.34120, lng: -6.26020, url: "https://www.thewestbury.ie/dining/the-garden-room" },
  { id: "r1900", cats: ["food"], name: "1900 Restaurant", rating: 4.7, price: "€€€€", kind: "Elegant", lat: 53.33773, lng: -6.25765, url: "https://onehthornton.com/1900-restaurant/" },
  { id: "corfu", cats: ["food"], name: "Corfu Greek Restaurant", rating: 4.6, price: "€€–€€€", kind: "Griechisch", lat: 53.34452, lng: -6.26513, url: "https://corfurestaurant.ie/" },
  { id: "damascus", cats: ["food"], name: "Damascus Gate", rating: 4.6, price: "€€–€€€", kind: "Libanesisch", lat: 53.33985, lng: -6.26409 },
  { id: "lamaison", cats: ["food"], name: "La Maison", rating: 4.5, price: "€€–€€€", kind: "Französisch", lat: 53.34303, lng: -6.26363, url: "https://lamaison.ie/" },
  { id: "lacaverna", cats: ["food"], name: "La Caverna", rating: 4.4, price: "€€–€€€", kind: "Italienisch", lat: 53.34558, lng: -6.26451, url: "https://lacaverna.ie/" },
  { id: "yamamori", cats: ["food"], name: "Yamamori Izakaya", rating: 4.3, price: "€€–€€€", kind: "Japanisch", lat: 53.34520, lng: -6.26519, url: "https://www.yamamori.ie/izakaya" },
  { id: "tippenyaki", cats: ["food"], name: "Tippenyaki", rating: 4.7, price: "€€–€€€", kind: "Japanisch", lat: 53.33652, lng: -6.25521 },
  { id: "bossstop", cats: ["food"], name: "Boss Stop", rating: 4.9, price: "€€–€€€", kind: "Asiatisch", lat: 53.34984, lng: -6.25994 },
  { id: "davybyrnes", cats: ["food"], name: "Davy Byrnes", rating: 4.7, price: "€€–€€€", kind: "Pub · Ulysses-Kneipe", lat: 53.34177, lng: -6.25823, url: "https://www.davybyrnes.com/" },
  { id: "bobos", cats: ["food"], name: "Bobo’s Burgers", rating: 4.4, price: "€€", kind: "Burger", lat: 53.34366, lng: -6.26342, url: "https://bobos.ie/" },
  { id: "strandhouse", cats: ["food"], name: "The Strand House – Fairview", rating: 4.9, price: "€€–€€€", kind: "Pub", lat: 53.36221, lng: -6.22969 },
  { id: "bunsen", cats: ["food"], name: "Bunsen (Temple Bar)", rating: 4.6, price: "€", kind: "Burger", lat: 53.34545, lng: -6.26437, url: "https://www.bunsen.ie/" },
  { id: "pickle", cats: ["food"], name: "Pickle", rating: 4.7, price: "€€–€€€", kind: "Nordindisch", lat: 53.33463, lng: -6.26561, url: "https://www.picklerestaurant.com/" },

  // Tagesausflüge (keine Marker: Ziele liegen außerhalb der Stadtkarte)
  { id: "molly", cats: ["trip"], name: "Treffpunkt Molly Malone", note: "Abfahrt der meisten Tagestouren (Suffolk Street)", lat: 53.34370, lng: -6.26000 },
  { id: "wicklow", cats: ["trip"], name: "Wicklow Mountains & Glendalough", note: "Seen & Klostersiedlung · ca. 1 Std.", url: "https://www.irishdaytours.ie/" },
  { id: "moher", cats: ["trip"], name: "Cliffs of Moher & Galway", note: "Atlantikküste · ca. 3 Std.", url: "https://www.irishdaytours.ie/" },
  { id: "causeway", cats: ["trip"], name: "Belfast & Giant’s Causeway", note: "UNESCO-Welterbe · ca. 2,5 Std.", url: "https://www.irishdaytours.ie/" },
  { id: "newgrange", cats: ["trip"], name: "Boyne Valley / Newgrange", note: "Steinzeit-Grabhügel · ca. 1 Std." },
  { id: "kilkenny", cats: ["trip"], name: "Kilkenny & Castle", note: "Mittelalterstadt · ca. 1,5 Std.", url: "https://kilkennycastle.ie/" }
];

/* Checklisten (Häkchen werden nur im Browser gespeichert). */
const CHECKLISTS = [
  {
    id: "book", title: "Buchungen",
    items: [
      { id: "kells", text: "Book of Kells – Fr 12:00" },
      { id: "guinness", text: "Guinness Storehouse – Fr 14:15" },
      { id: "got", text: "GoT Studio Tour – Sa 09:45" },
      { id: "causeway", text: "Giant’s-Causeway-Tour – So 06:30" },
      { id: "teeling", text: "Teeling Distillery – Mo 11:00" },
      { id: "jameson", text: "Jameson Bow St. – Mo 16:00" },
      { id: "match", text: "Ticket Bohemians vs St Pat’s – Mo 20:45" },
      { id: "moher", text: "Cliffs-of-Moher-Tour – Di 06:50" },
      { id: "airport", text: "Transfer zum Flughafen – Do 06:00" }
    ]
  },
  {
    id: "pack", title: "Packliste",
    items: [
      { id: "passport", text: "Reisepass (Pflicht für Nordirland-Touren)" },
      { id: "adapter", text: "Reiseadapter Typ G (UK-Stecker)" },
      { id: "rain", text: "Regenjacke & wasserfeste Schuhe" },
      { id: "layers", text: "Warme Schicht für die Küste" },
      { id: "power", text: "Powerbank & Ladekabel" },
      { id: "card", text: "Kreditkarte (auch für £ in Nordirland)" },
      { id: "ehic", text: "Krankenversicherungskarte (EHIC)" }
    ]
  }
];

const INFOS = [
  { icon: "bus", title: "Flughafen → Stadt", text: "Dublin Express oder Aircoach bis O’Connell St./Custom House, ca. 30 Min. Zum Hotel am City Quay dann ca. 10 Min. zu Fuß." },
  { icon: "ticket", title: "Leap Visitor Card", text: "Am Flughafen (Spar, Travel Info) kaufen. Gilt 72 Std. ab der ersten Fahrt für Dublin Bus, Luas und DART – auch für Howth." },
  { icon: "id-card", title: "Nordirland (Sa & So)", text: "Gehört zum Vereinigten Königreich: Pfund Sterling, Reisepass mitnehmen, EU-Roaming je nach Tarif nicht inklusive." },
  { icon: "plug", title: "Steckdosen", text: "Typ G (britischer Stecker, 230 V). Adapter nicht vergessen." },
  { icon: "euro", title: "Bezahlen & Trinkgeld", text: "Karte geht fast überall. Im Restaurant 10–12,5 % Trinkgeld, falls kein Service Charge berechnet wird; im Pub unüblich." },
  { icon: "siren", title: "Notruf", text: "112 oder 999 (Polizei, Rettung, Feuerwehr) – in Irland und Nordirland." }
];

(window.TRIPS ||= []).push({ ...TRIP, images: IMAGES, days: DAYS, cats: CATS, places: PLACES, checklists: CHECKLISTS, infos: INFOS });
})();
