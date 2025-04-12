# Home Inventory System

Eine Anwendung zur Verwaltung von Haushaltsgegenständen und deren Standorten.

## Funktionen

- Erfassung von Objekten und ihren Standorten (z.B. Schraubensortierer → Wohnzimmer, Schrank 1, Schublade 3)
- Verwaltung von Lagerorten mit Bildern und Regionen
- Fuzzy-Suche für Objekte (z.B. "Metallstab" findet "Alurohr")
- Vorbereitung für Microcontroller-Integration zur LED-Aktivierung am richtigen Ort
- Modernes Frontend mit Dark Mode und Tailwind CSS

## Technologien

- **Frontend**: Next.js mit Tailwind CSS
- **Backend**: Python Flask API
- **Datenbank**: SQLite
- **Bildverwaltung**: Unterstützung für Kamera-Aufnahmen und Regionen-Mapping

## Installation

### Voraussetzungen

- Node.js (>= 16.0.0)
- Python 3 (>= 3.8)
- npm oder pnpm

### Schritte

1. Repository klonen:
   ```
   git clone <repository-url>
   cd home-inventory
   ```

2. Frontend-Abhängigkeiten installieren:
   ```
   npm install
   ```

3. Python-Umgebung einrichten:
   ```
   cd api
   python -m venv venv
   source venv/bin/activate  # Unter Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

4. Anwendung starten:
   ```
   ./start.sh
   ```

## Nutzung

Nach dem Start ist die Anwendung unter folgenden URLs verfügbar:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

### Lagerorte verwalten

1. Gehe zu "Lagerorte"
2. Klicke auf "Neuen Lagerort hinzufügen"
3. Gib einen Namen ein und lade optional ein Bild hoch
4. Klicke auf "Speichern"

### Regionen definieren

1. Wähle einen Lagerort aus
2. Klicke auf "Region hinzufügen"
3. Zeichne ein Rechteck auf dem Bild und benenne es (z.B. "Fach 1")
4. Speichere die Region

### Objekte hinzufügen

1. Gehe zu "Objekt hinzufügen"
2. Gib einen Namen ein
3. Wähle optional einen Lagerort und eine Region aus
4. Füge optional ein Bild, eine Beschreibung und die Anzahl hinzu
5. Klicke auf "Speichern"

### Objekte suchen

1. Gehe zur Suchseite
2. Gib einen Suchbegriff ein (z.B. "Schraubenzieher" oder "Metall")
3. Die Ergebnisse werden nach Relevanz sortiert angezeigt

## API-Endpunkte

### Lagerorte

- `GET /api/locations` - Liste aller Lagerorte
- `POST /api/locations` - Neuen Lagerort erstellen
- `GET /api/locations/{id}` - Details eines Lagerorts
- `PUT /api/locations/{id}` - Lagerort aktualisieren
- `DELETE /api/locations/{id}` - Lagerort löschen
- `GET /api/locations/{id}/breadcrumbs` - Pfad zu einem Lagerort

### Regionen

- `GET /api/locations/{id}/regions` - Regionen eines Lagerorts
- `POST /api/locations/{id}/regions` - Neue Region erstellen

### Inventar

- `GET /api/inventory` - Liste aller Inventarobjekte
- `POST /api/inventory` - Neues Inventarobjekt erstellen
- `GET /api/inventory/{id}` - Details eines Inventarobjekts
- `PUT /api/inventory/{id}` - Inventarobjekt aktualisieren
- `DELETE /api/inventory/{id}` - Inventarobjekt löschen

### Suche

- `GET /api/search?q={query}` - Fuzzy-Suche nach Objekten

### LED-Steuerung

- `GET /api/led/{id}` - Informationen für LED-Aktivierung

## Microcontroller-Integration

Die Anwendung ist vorbereitet für die Integration mit Microcontrollern zur LED-Steuerung. Der Endpunkt `/api/led/{id}` liefert die notwendigen Informationen, um eine LED am richtigen Ort zu aktivieren.

## Entwicklung

### API-Tests

Zum Testen der API-Endpunkte kann das mitgelieferte Testskript verwendet werden:

```
cd api
python test_api.py
```

### Datenbankschema

Das Datenbankschema wird automatisch beim ersten Start der Anwendung erstellt. Es umfasst folgende Tabellen:

- `locations` - Lagerorte (Räume, Schränke, etc.)
- `location_regions` - Regionen innerhalb von Lagerorten
- `inventory_items` - Inventarobjekte
- `item_tags` - Tags für die Fuzzy-Suche
