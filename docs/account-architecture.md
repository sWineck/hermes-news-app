# Account-/Admin-Grundlage

Die aktuelle Ausbaustufe verwendet weiterhin anonyme lokale Speicherung. Es werden keine Benutzerkonten angelegt, keine Authentifizierung aktiviert und keine Datenbank angesprochen.

## Datenmodell

`src/account.ts` definiert:

- `AccountIdentity` mit `user`/`admin`-Rolle
- `UserPreferences` für Feed-IDs, Favoriten-IDs, Theme, Suche und Kategorie
- versionierte `AccountDataEnvelope`
- `AccountStorageAdapter` als Backend-unabhängige Schnittstelle für Laden, Speichern, Löschen und Export
- `createAnonymousAccountData()` als Migrationsgrenze zwischen lokaler und späterer nutzerbezogener Speicherung

## Sicherheitsgrenze

Die Rolle `admin` ist nur ein Datenmodell. Client-seitige Flags dürfen später niemals als alleinige Autorisierung dienen. Registrierung, Login, Sessions, E-Mail-Verifikation, Passwort-Reset, Account-Löschung, Export und Admin-Endpunkte benötigen eine separate Architekturentscheidung, sichere Secrets und ausdrückliche Freigabe.

## Migration

Die bestehenden Artikel- und Favoriten-Collections werden mit `STORAGE_VERSION = 2` versioniert. Bestehende rohe Arrays werden beim Laden weiterhin akzeptiert und in den aktuellen Datenpfad übernommen. RSS-/Atom-Feeds bleiben unter ihrem bestehenden Schlüssel erhalten.
