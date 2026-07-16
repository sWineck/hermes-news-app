# Signal Desk

Ein persönliches News-Dashboard für aktuelle Tech-Signale. Die Oberfläche lädt bei Bedarf Artikel über die öffentliche **GDELT DOC 2.0 API** und stellt die Originalquellen verlinkt dar. Ohne Live-Abruf bleiben klar gekennzeichnete Demo-Datensätze sichtbar, damit die Anwendung auch offline und ohne Credentials testbar bleibt.

## Start

```bash
npm install
npm run dev
```

Build und Preview:

```bash
npm run build
npm run preview
```

Tests und Typecheck:

```bash
npm test
npm run typecheck
```

## Quellenentscheidung

Für den initialen Betrieb wurde GDELT gewählt: Die offizielle Dokumentation beschreibt eine JSON-fähige DOC-API, globale News-Abdeckung und CORS-Unterstützung. Die App verwendet keine Credentials. NewsAPI und The Guardian Open Platform wurden als Alternativen geprüft; beide benötigen für die reguläre Nutzung einen API-Key und werden deshalb nicht als ungeprüfte Client-Abhängigkeit eingebaut.

- GDELT DOC: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- GDELT Datenübersicht: https://www.gdeltproject.org/data.html
- NewsAPI Endpoints: https://newsapi.org/docs/endpoints
- Guardian Open Platform: https://open-platform.theguardian.com/documentation/
- Accessibility-Ziel: WCAG 2.2, https://www.w3.org/TR/WCAG22/

Die Anwendung zeigt nur Titel, Metadaten und kurze technische Hinweise. Der vollständige Originalartikel wird nicht kopiert; die Original-URL bleibt die maßgebliche Quelle.

## Architektur

- Vite + React + TypeScript
- GDELT-Adapter in `src/api.ts`
- Normalisierung, Kategoriezuordnung und Filter in `src/types.ts`
- Favoriten lokal in `localStorage`
- kein API-Key, kein Backend und keine Secrets im Client erforderlich
- Demo-Daten dienen ausschließlich dem Offline-/Fehlerzustand und sind als Demo gekennzeichnet

## Bedienung

- Kategorie auswählen
- Suchfeld verwenden
- Sortierung ändern
- `Aktualisieren` für einen Live-Abruf verwenden
- Artikel mit dem Herzsymbol lokal speichern
- Dark-/Light-Theme über das Symbol im Header wechseln
- externe Originalartikel über `Lesen ↗` öffnen

## Einschränkungen

- Die Verfügbarkeit und das Format externer News-Daten kann sich ändern.
- GDELT ist ein globaler News-Monitor; die Ergebnisse sind nicht redaktionell kuratiert.
- Die App erstellt keine Nutzerkonten und synchronisiert Favoriten nicht zwischen Geräten.
- Die Browser-Verifikation kann nur im verfügbaren Desktop-Browser-/Viewport-Umfeld durchgeführt werden; ein echtes physisches Mobilgerät wird nicht behauptet.
