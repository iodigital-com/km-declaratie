# iO Kilometerdeclaratie

Een standalone webapplicatie waarmee iO-medewerkers hun maandelijkse kilometerdeclaratie kunnen bijhouden en als PDF exporteren.

---

## Wat kan de app?

### Configuratie
- Sla je naam en vaste routes op (woon-werk, klantbezoek, campus, etc.)
- Definieer per route: label, doel, van/naar postcode, km (enkel), retour of enkel, soort dag
- Stel het vergoedingsbedrag per kilometer in (standaard €0,23)
- Sla meerdere routes op voor verschillende reispatronen
- Alle instellingen worden lokaal opgeslagen in de browser (`localStorage`) — geen account nodig

### Routekaart
- Haal automatisch een routekaart op op basis van ingevoerde postcodes (via Nominatim + OSRM)
- De kaart toont de werkelijke rijroute met beginpunt, eindpunt en de rijafstand in km
- De "KM enkel"-waarde wordt automatisch ingevuld vanuit de berekende rijafstand
- Kaart kan ook handmatig worden vervangen door een eigen screenshot
- De routekaart verschijnt onderaan de gegenereerde PDF als bewijs

### Kalender
- Selecteer per dag welke route je hebt gereden (klik op een dag in de maandkalender)
- Weekenden zijn automatisch uitgeschakeld
- Schakel snel alle werkdagen in voor de actieve route
- Meerdere routes per maand mogelijk (elke route heeft een eigen kleur)
- Teller toont live het aantal geselecteerde dagen, totaal km en totale vergoeding

### Declaratie
- Genereer een overzichtstabel met alle reisdagen van de geselecteerde maand
- Kolommen: datum, soort dag, van/naar postcode, doel, km, enkel/retour, totaal km
- Totaalregel met km-vergoeding onderaan de tabel
- Routekaarten als bijlage onderaan het document
- Direct afdrukken of opslaan als PDF via de browser

### Updates
- De app controleert bij elke start automatisch of er een nieuwere versie beschikbaar is
- Bij een nieuwe versie verschijnt een banner met een directe downloadlink
- De update-banner kan worden weggeklikt

---

## Bekende wensen / backlog

De volgende verbeteringen zijn besproken maar nog niet geïmplementeerd:

| # | Wens | Prioriteit |
|---|------|-----------|
| 1 | Ondersteuning voor meerdere gebruikersprofielen in één bestand | Laag |
| 2 | Exporteren naar Excel/CSV naast PDF | Laag |
| 3 | Integratie met Google Maps API voor exactere afstanden | Laag |
| 4 | Automatisch invullen van feestdagen en collectieve vrije dagen | Laag |
| 5 | Kopie van vorige maand-selectie als startpunt | Medium |
| 6 | Donkere modus | Laag |

---

## Hoe werkt het (voor de gebruiker)?

### Eerste keer
1. Download `km-declaratie.html` via de [directe downloadlink](https://github.com/momeeuw/km-declaratie/releases/latest/download/km-declaratie.html)
2. Sla het bestand op een handige plek op (bijv. bureaublad)
3. Dubbelklik om te openen in de browser
4. Het instellingenscherm opent automatisch bij de eerste start
5. Vul je naam, vergoeding en minimaal één route in
6. Klik bij elke route op **"Kaart automatisch ophalen"** om de routekaart te genereren
7. Sla de instellingen op

### Maandelijkse declaratie
1. Open `km-declaratie.html` in de browser
2. Kies het juiste jaar en maand
3. Selecteer de actieve route (knop bovenaan de kalender)
4. Klik op de dagen waarop je die route hebt gereden
5. Wissel van actieve route voor andere reispatronen in dezelfde maand
6. Klik op **"Bekijk declaratie"** voor het overzicht
7. Klik op **"Download / Print PDF"** en sla op als PDF

### Updates
- Bij een beschikbare update verschijnt een gele banner bovenaan
- Klik op **"Download →"** om de nieuwe versie te downloaden
- Vervang je oude bestand door de nieuwe download
- Je instellingen blijven bewaard (opgeslagen in de browser)

> **Let op:** instellingen zijn browsergebonden. Als je de app in een andere browser of op een andere computer opent, moet je de instellingen opnieuw invullen.

---

## Hoe is het gebouwd?

### Tech stack

| Onderdeel | Keuze | Reden |
|-----------|-------|-------|
| Framework | React 19 | Component-gebaseerde UI, groot ecosysteem |
| Build tool | Vite 8 | Snelle builds, moderne DX |
| Bundeling | `vite-plugin-singlefile` | Alles-in-één HTML zonder externe afhankelijkheden |
| Styling | Inline React styles | Geen aparte CSS-bundel nodig voor single-file output |
| Font | Manrope (Google Fonts) | iO huisstijllettertype, geladen via CDN |
| Geocoding | Nominatim (OpenStreetMap) | Gratis, geen API-sleutel nodig |
| Routing | OSRM (Open Source Routing Machine) | Gratis rijafstand + routegeometrie |
| Kaarten | SVG gegenereerd in de browser | Geen externe image-service, werkt offline |
| Opslag | `localStorage` | Geen server, geen account, puur lokaal |
| Versiebeheer | GitHub | Publieke repo voor herleesbaarheid en CI/CD |
| CI/CD | GitHub Actions | Automatisch bouwen en releasen bij een versie-tag |

### Architectuur

```
src/
└── App.jsx          ← Volledige applicatie (één bestand)
    ├── Constanten & stijlen (FONT, C, DEFAULT_CONFIG)
    ├── fetchRouteMapImage()  ← Nominatim + OSRM + SVG-generatie
    └── KmDeclaratie()        ← Hoofd-React component
        ├── State management  (config, selectedDays, view, ...)
        ├── localStorage I/O  (laden bij start, opslaan bij wijziging)
        ├── Versiecheck       (fetch naar version.json op GitHub)
        ├── Header            (iO-logo, naam, instellingen-knop)
        ├── Settings modal    (naam, vergoeding, routes, kaarten)
        ├── Kalender-view     (maandkalender, route-selectie)
        └── Declaratie-view   (tabel, totalen, routekaarten, print)

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

Een nieuwe versie uitbrengen gaat in drie stappen:

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
| **GitHub** | [github.com/momeeuw/km-declaratie](https://github.com/momeeuw/km-declaratie) |
| **Directe download** | [Nieuwste versie (km-declaratie.html)](https://github.com/momeeuw/km-declaratie/releases/latest/download/km-declaratie.html) |
| **Releases** | [github.com/momeeuw/km-declaratie/releases](https://github.com/momeeuw/km-declaratie/releases) |
| **Zichtbaarheid** | Publiek |

---

## Onderhoud met Cursor

De applicatie wordt onderhouden via [Cursor](https://cursor.sh), een AI-first code-editor. De volledige ontwikkelhistorie is beschikbaar als gespreksgeschiedenissen in iO Bonzai.

### Lokale ontwikkelomgeving opzetten

```bash
# Vereisten: Node.js 20+, Git

git clone https://github.com/momeeuw/km-declaratie.git
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
- Controleer na een release of de update-banner correct verschijnt door de versie tijdelijk te verlagen in `public/version.json`

---

*Gebouwd voor iO Digital medewerkers · Onderhouden via Cursor AI · Versie wordt bijgehouden op [GitHub](https://github.com/momeeuw/km-declaratie/releases)*
