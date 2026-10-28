# iO Kilometerdeclaratie

Een standalone webapplicatie waarmee iO-medewerkers hun maandelijkse kilometerdeclaratie kunnen bijhouden en als PDF exporteren.

---

## Wat kan de app?

### Configuratie
- Sla je naam en vaste routes op (woon-werk, klantbezoek, campus, etc.)
- Definieer per route: label, doel, van/naar postcode, km (enkel), retour of enkel, soort dag
- Stel het vergoedingsbedrag per kilometer in (standaard €0,23)
- Sla meerdere routes op voor verschillende reispatronen
- Instellingen, maandselecties en indienstatus worden lokaal opgeslagen in de browser (`localStorage`) — geen account nodig
- Een routekaart is verplicht voor elke route voordat je de instellingen kunt opslaan
- Kies een standaard soort dag (zoals Kantoordag, Klantdag, Feestdag of Vrij) of vul een eigen waarde in

### Routekaart
- Haal automatisch een routekaart op op basis van ingevoerde postcodes (via Nominatim + OSRM)
- De kaart toont de werkelijke rijroute met beginpunt, eindpunt en de rijafstand in km
- De "KM enkel"-waarde wordt automatisch ingevuld vanuit de berekende rijafstand
- Open de route via **"Open in Google Maps"**, controleer daar de afstand en upload desgewenst een eigen screenshot
- Google Maps is een externe link, geen API-koppeling; de automatische berekening gebruikt OSRM
- De routekaart verschijnt onderaan de gegenereerde PDF als bewijs

### Kalender
- Selecteer per dag welke route je hebt gereden (klik op een dag in de maandkalender)
- Weekenden zijn automatisch uitgeschakeld
- Vul met **"Alle werkdagen"** de hele maand met de actieve route (vervangt bestaande selecties), of maak de maand leeg met **"Wis alles"**
- Meerdere routes per maand én per dag mogelijk (elke route heeft een eigen kleur)
- Maandselecties blijven bewaard bij wisselen tussen maanden en na heropenen
- **"Kopieer vorige maand"** neemt het weekdagpatroon over: bijvoorbeeld de eerste woensdag naar de eerste woensdag, niet hetzelfde dagnummer; bij bestaande selecties wordt om bevestiging gevraagd
- Navigeer van twee jaar terug tot één jaar vooruit, gerekend vanaf de huidige maand; opgeslagen kalenderdata buiten dit venster wordt opgeschoond
- Teller toont live het aantal geselecteerde dagen, totaal km en totale vergoeding

### Declaratie
- Genereer een overzichtstabel met alle dagen van de geselecteerde maand; dagen zonder rit krijgen 0 km en meerdere routes krijgen aparte regels
- Kolommen: datum (met weekdag en afgekorte maand), soort dag, van/naar postcode, doel, km, enkel/retour, totaal km
- Totaalregel met km-vergoeding onderaan de tabel
- Routekaarten als bijlage onderaan het document
- Direct afdrukken of opslaan als PDF via de browser
- **"Markeer als ingediend"** bewaart de datum en vergrendelt de kalender van die maand; via **"Ontgrendelen"** kun je de selectie weer aanpassen
- Markeren is alleen lokale administratie: de app verstuurt geen declaratie naar een werkgever of extern systeem

### Back-up en overdracht
- **"Exporteer alle data"** downloadt een JSON-bestand met instellingen (inclusief routekaarten), kalenderdata en indienstatus
- **"Importeer backup…"** laadt deze gegevens terug, ook in een andere browser of op een andere computer
- Bij export zonder ritten verschijnt een waarschuwing; een ongeldig importbestand geeft een foutmelding
- De JSON-export is een back-up, geen Excel- of CSV-declaratie

### Donkere modus
- Wissel tussen licht en donker met de zon-/maanknop in de header
- Zonder opgeslagen voorkeur gebruikt de app bij de eerste start de systeemvoorkeur; daarna blijft de gekozen modus lokaal bewaard

### Updates
- De app controleert bij elke start automatisch of er een nieuwere versie beschikbaar is
- Bij een nieuwe versie verschijnt een banner met een directe downloadlink
- De update-banner kan worden weggeklikt

---

## Bekende wensen / backlog

De oorspronkelijke wensen, getoetst aan de huidige code op `main`:

| # | Wens | Status | Prioriteit |
|---|------|--------|-----------|
| 1 | Ondersteuning voor meerdere gebruikersprofielen in één bestand | Open — één actieve configuratie; JSON-back-ups zijn geen profielwisselaar | Laag |
| 2 | Exporteren naar Excel/CSV naast PDF | Open — wel JSON-back-up en PDF, geen Excel/CSV | Laag |
| 3 | Integratie met Google Maps API voor exactere afstanden | Alternatief gerealiseerd — Google Maps-link, handmatige afstand en screenshot; geen API-koppeling, automatisch via Nominatim + OSRM | Laag |
| 4 | Automatisch invullen van feestdagen en collectieve vrije dagen | Open — soort dag is handmatig te kiezen, niet automatisch ingevuld | Laag |
| 5 | Kopie van vorige maand-selectie als startpunt | Gereed — kopiëren op weekdagpatroon met bevestiging bij overschrijven | Medium |
| 6 | Donkere modus | Gereed — systeemvoorkeur bij eerste start en opgeslagen handmatige keuze | Laag |

---

## Hoe werkt het (voor de gebruiker)?

### Eerste keer
1. Download `km-declaratie.html` via de [directe downloadlink](https://github.com/iodigital-com/km-declaratie/releases/latest/download/km-declaratie.html)
2. Sla het bestand op een handige plek op (bijv. bureaublad)
3. Dubbelklik om te openen in de browser
4. Het instellingenscherm opent automatisch bij de eerste start
5. Vul je naam, vergoeding en minimaal één route in
6. Klik bij elke route op **"Kaart automatisch ophalen"** of open Google Maps en upload een screenshot; elke route moet een kaart hebben
7. Sla de instellingen op

### Maandelijkse declaratie
1. Open `km-declaratie.html` in de browser
2. Kies het juiste jaar en maand
3. Selecteer de actieve route (knop bovenaan de kalender)
4. Klik op de dagen waarop je die route hebt gereden
5. Wissel van actieve route voor andere reispatronen; klik op een al geselecteerde dag om een extra route toe te voegen (nogmaals klikken verwijdert die route)
6. Klik op **"Bekijk declaratie"** voor het overzicht
7. Klik op **"Download / Print PDF"** en sla op als PDF
8. Dien de PDF zelf in via het gebruikelijke proces en klik daarna op **"Markeer als ingediend"** om de maand lokaal te vergrendelen

> **Tip:** gebruik **"Kopieer vorige maand"** als startpunt en controleer de selectie op vakanties, feestdagen en afwijkende ritten.

### Updates
- Bij een beschikbare update verschijnt een gele banner bovenaan
- Klik op **"Download →"** om de nieuwe versie te downloaden
- Vervang je oude bestand door de nieuwe download
- Je instellingen blijven bewaard (opgeslagen in de browser)

> **Let op:** gegevens zijn browsergebonden en bij lokale HTML-bestanden kan opslag ook van de bestandslocatie en browser afhangen. Exporteer vóór een update, verplaatsing of browserwissel een JSON-back-up via Instellingen en importeer die als je gegevens niet worden teruggevonden. De back-up bevat je naam, postcodes en ritgegevens; bewaar en deel hem zorgvuldig.

---

## Hoe is het gebouwd?

### Tech stack

| Onderdeel | Keuze | Reden |
|-----------|-------|-------|
| Framework | React 19 | Component-gebaseerde UI, groot ecosysteem |
| Build tool | Vite 8 | Snelle builds, moderne DX |
| Bundeling | `vite-plugin-singlefile` | JavaScript en assets ingebundeld in één HTML-bestand |
| Styling | Inline React styles | Geen aparte CSS-bundel nodig voor single-file output |
| Font | Manrope (Google Fonts) | iO huisstijllettertype, geladen via CDN |
| Geocoding | Nominatim (OpenStreetMap) | Gratis, geen API-sleutel nodig |
| Routing | OSRM (Open Source Routing Machine) | Gratis rijafstand + routegeometrie |
| Kaarten | SVG gegenereerd in de browser | Lokaal gegenereerde SVG; opgeslagen kaarten zijn offline beschikbaar |
| Opslag | `localStorage` | Lokale instellingen, kalender en indienstatus; JSON-back-up/import |
| Versiebeheer | GitHub | Publieke repo voor herleesbaarheid en CI/CD |
| CI/CD | GitHub Actions | Automatisch bouwen en releasen bij een versie-tag |

> De app heeft geen eigen backend. Routeberekening, Google Maps, versiecontrole en het laden van Google Fonts gebruiken wel externe diensten en vereisen internet. Postcodes worden bij automatische routeberekening naar Nominatim gestuurd; routecoördinaten naar OSRM.

### Architectuur

```
src/
└── App.jsx          ← Volledige applicatie (één bestand)
    ├── Constanten & stijlen (FONT, C, DEFAULT_CONFIG)
    ├── fetchRouteMapImage()  ← Nominatim + OSRM + SVG-generatie
    └── KmDeclaratie()        ← Hoofd-React component
        ├── State management  (config, calendarData, submittedMonths, darkMode, view, ...)
        ├── localStorage I/O  (laden bij start, opslaan bij wijziging)
        ├── Versiecheck       (fetch naar version.json op GitHub)
        ├── Header            (iO-logo, naam, themawissel, instellingen-knop)
        ├── Settings modal    (naam, vergoeding, routes, kaarten, JSON-back-up/import)
        ├── Kalender-view     (maandselecties, meerdere routes per dag, kopie vorige maand)
        └── Declaratie-view   (tabel, totalen, routekaarten, print, indienstatus)

public/
└── version.json     ← Wordt bij elke release automatisch bijgewerkt

.github/workflows/
└── release.yml      ← Bouwt en publiceert bij git tag vX.Y.Z
```

### Bouwproces

```
npm run dev      ← Start lokale ontwikkelserver (http://localhost:5173)
npm run build    ← Bouwt dist/index.html (alles ingebundeld)
npm run lint     ← ESLint controle
```

### Releaseproces

Een nieuwe versie uitbrengen: commit de wijzigingen en push daarna een versie-tag.

```bash
# 1. Commit de wijzigingen
git add -A
git commit -m "beschrijving van de wijziging"
git push origin main

# 2. Tag aanmaken en pushen
git tag v1.2.3
git push origin v1.2.3
```

GitHub Actions doet daarna automatisch:
1. Versienummer uit de tag halen
2. `public/version.json` bijwerken en committen naar `main`
3. `npm run build` uitvoeren met `VITE_APP_VERSION=1.2.3`
4. `dist/index.html` hernoemen naar `km-declaratie.html`
5. GitHub Release aanmaken met de HTML als downloadbaar artifact

---

## Repository

| | |
|--|--|
| **GitHub** | [github.com/iodigital-com/km-declaratie](https://github.com/iodigital-com/km-declaratie) |
| **Directe download** | [Nieuwste versie (km-declaratie.html)](https://github.com/iodigital-com/km-declaratie/releases/latest/download/km-declaratie.html) |
| **Releases** | [github.com/iodigital-com/km-declaratie/releases](https://github.com/iodigital-com/km-declaratie/releases) |
| **Zichtbaarheid** | Publiek |

---

## Onderhoud met Cursor

De applicatie wordt onderhouden via [Cursor](https://cursor.sh), een AI-first code-editor. De volledige ontwikkelhistorie is beschikbaar als gespreksgeschiedenissen in iO Bonzai.

### Lokale ontwikkelomgeving opzetten

```bash
# Vereisten: Node.js 20.19+ of 22.12+, Git (Vite 8)

git clone https://github.com/iodigital-com/km-declaratie.git
cd km-declaratie
npm install
npm run dev
# Open http://localhost:5173 in de browser
```

### Wijzigingen doorvoeren met Cursor

1. Open de repository-map in Cursor (`c:\AI-Tools\km\km-declaratie`)
2. Beschrijf de gewenste wijziging in de chat (bijv. *"voeg een veld toe voor parkeerkosten"*)
3. De AI past `src/App.jsx` aan en toont een preview in de browser
4. Test de wijziging lokaal via `npm run dev`
5. Commit en tag voor een nieuwe release (zie Releaseproces hierboven)

### Codebase-context voor de AI

De volledige applicatie staat in **één bestand**: `src/App.jsx`. Dit maakt het eenvoudig om de AI volledige context te geven. Geef bij vragen altijd het bestand mee of verwijs naar de repository.

### Tips voor goed onderhoud

- Houd het versienummer semantisch: `vMAJOR.MINOR.PATCH`
  - `MAJOR` — grote nieuwe feature of redesign
  - `MINOR` — nieuwe functionaliteit
  - `PATCH` — bugfix of kleine aanpassing
- Test altijd lokaal via `npm run dev` vóór het taggen
- Controleer na een release of `public/version.json` het juiste versienummer en de downloadlink bevat
- Test de update-banner met een lokale build waarvan `VITE_APP_VERSION` lager is dan de gepubliceerde versie; verlaag niet de gepubliceerde `version.json`

---

*Gebouwd voor iO Digital medewerkers · Onderhouden via Cursor AI · Versie wordt bijgehouden op [GitHub](https://github.com/iodigital-com/km-declaratie/releases)*
