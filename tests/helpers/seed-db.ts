import { createDatabase, type Database } from '../../src/db.js';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';

/**
 * Create a temporary seeded database for tests.
 * Schema matches src/db.ts initSchema exactly.
 */
export function createTestDatabase(): Database {
  const dir = mkdtempSync(join(tmpdir(), 'ch-livestock-test-'));
  const dbPath = join(dir, 'test.db');
  const db = createDatabase(dbPath);

  // welfare_standards: 2 records
  db.run(
    `INSERT INTO welfare_standards (species, production_system, requirement, min_space_m2, details, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Rinder', 'TSchV-Minimum', 'Liegeflaeche Milchkuh', 4.5, 'Mindestens 4.5 m2 pro Milchkuh im Laufstall gemaess TSchV Anhang 1', 'DE', 'CH']
  );
  db.run(
    `INSERT INTO welfare_standards (species, production_system, requirement, min_space_m2, details, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Schweine', 'RAUS', 'Auslauf Mastschwein', 1.3, 'Mastschweine muessen taeglich Zugang zum Auslauf haben, mindestens 1.3 m2', 'DE', 'CH']
  );

  // stocking_densities: 2 records
  db.run(
    `INSERT INTO stocking_densities (species, age_class, housing_type, animals_per_m2, regulatory_minimum, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Rinder', 'Milchkuh', 'Laufstall', 0.22, 'TSchV Anhang 1 Tabelle 1', 'DE', 'CH']
  );
  db.run(
    `INSERT INTO stocking_densities (species, age_class, housing_type, animals_per_m2, regulatory_minimum, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Gefluegel', 'Legehenne', 'Voliere', 7.0, 'TSchV Anhang 1 Tabelle 9', 'DE', 'CH']
  );

  // housing_requirements: 1 record
  db.run(
    `INSERT INTO housing_requirements (species, age_class, system, space, ventilation, flooring, temperature, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Rinder', 'Milchkuh', 'Laufstall', '4.5 m2 Liegeflaeche', 'Natuerliche Belueftung oder Zwangsbelueftung', 'Rutschfester Belag, perforiert max 3%', '0-25 C', 'DE', 'CH']
  );

  // movement_rules: 1 record
  db.run(
    `INSERT INTO movement_rules (species, rule_type, description, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?)`,
    ['Rinder', 'TVD', 'Alle Rinder muessen innerhalb von 3 Tagen nach Geburt bei der TVD gemeldet werden. Ohrmarken sind Pflicht.', 'DE', 'CH']
  );

  // breeds: 1 record
  db.run(
    `INSERT INTO breeds (species, name, purpose, notes, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Rinder', 'Braunvieh', 'Zweinutzung (Milch und Fleisch)', 'Traditionsrasse der Schweizer Alpen, hohe Milchleistung bei guter Fleischqualitaet', 'DE', 'CH']
  );

  // feed_requirements: 1 record
  db.run(
    `INSERT INTO feed_requirements (species, age_class, production_stage, feed_type, quantity_kg_day, energy_mj, protein_g, notes, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Rinder', 'Milchkuh', 'Laktation', 'Grundfutter + Kraftfutter', 22.0, 115.0, 2800.0, 'Bei 30 kg Milchleistung, GMF-konform: mind. 75% Grundfutter', 'DE', 'CH']
  );

  // animal_health: 1 record
  db.run(
    `INSERT INTO animal_health (species, condition, symptoms, prevention, regulatory_status, details, language, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Rinder', 'BVD (Bovine Virusdiarrhoe)', 'Durchfall, Fieber, Schleimhautlaesionen, Fruchtbarkeitsstoerungen', 'Impfung, PI-Tier-Erkennung und Merzung', 'Meldepflichtige Tierseuche (TSV Art. 5)', 'BVD-Ausrottungsprogramm seit 2008, PI-Tiere muessen innert 10 Tagen entfernt werden', 'DE', 'CH']
  );

  // search_index (FTS5): 2 entries matching CH jurisdiction
  db.run(
    `INSERT INTO search_index (title, body, species, category, jurisdiction)
     VALUES (?, ?, ?, ?, ?)`,
    ['Liegeflaeche Milchkuh Laufstall', 'Mindestens 4.5 m2 Liegeflaeche pro Milchkuh im Laufstall gemaess TSchV Anhang 1', 'Rinder', 'welfare', 'CH']
  );
  db.run(
    `INSERT INTO search_index (title, body, species, category, jurisdiction)
     VALUES (?, ?, ?, ?, ?)`,
    ['Auslauf Mastschwein RAUS', 'Mastschweine muessen taeglich Zugang zum Auslauf haben, mindestens 1.3 m2 pro Tier', 'Schweine', 'welfare', 'CH']
  );

  // db_metadata: ingest date for freshness tests
  db.run(
    `INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)`,
    ['last_ingest', '2026-04-05']
  );
  db.run(
    `INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)`,
    ['build_date', '2026-04-05']
  );

  return db;
}
