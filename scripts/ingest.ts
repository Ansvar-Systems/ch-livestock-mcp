/**
 * Switzerland Livestock MCP — Data Ingestion Script
 *
 * Populates the database with Swiss livestock data from:
 * - TSchV (Tierschutzverordnung, SR 455.1) — Mindestanforderungen pro Tierart
 * - DZV (Direktzahlungsverordnung) — RAUS/BTS-Programme, Tierwohlbeitraege
 * - TVD (Tierverkehrsdatenbank) — Registrierung, Meldepflicht, Transport
 * - Zuchtorganisationen — Braunvieh Schweiz, swissherdbook, Mutterkuh Schweiz, Suisseporcs
 * - BLV Fachinformationen — Tiergesundheit, Schlachtung, Soemmerung
 *
 * All data in German (primary federal language for agricultural regulation).
 * Usage: npm run ingest
 */

import { createDatabase } from '../src/db.js';
import { mkdirSync, writeFileSync } from 'fs';

mkdirSync('data', { recursive: true });
const db = createDatabase('data/database.db');

const now = new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// Helper: batch insert
// ---------------------------------------------------------------------------
function batchInsert(table: string, columns: string[], rows: unknown[][]) {
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.instance.prepare(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
  );
  const insertMany = db.instance.transaction((data: unknown[][]) => {
    for (const row of data) {
      stmt.run(...row);
    }
  });
  insertMany(rows);
}

// ---------------------------------------------------------------------------
// 1. Welfare Standards — TSchV Mindestanforderungen + RAUS + BTS
// ---------------------------------------------------------------------------

interface WelfareStandard {
  species: string;
  production_system: string;
  requirement: string;
  min_space_m2: number | null;
  details: string;
}

const welfareStandards: WelfareStandard[] = [
  // --- Rinder ---
  { species: 'Rinder', production_system: 'TSchV-Minimum', requirement: 'Liegeflaeche Milchkuh Laufstall', min_space_m2: 4.5, details: 'TSchV Anhang 1, Tab. 1: Mindestflaeche Liegebereich pro Milchkuh im Laufstall. Anbindehaltung weiterhin erlaubt mit RAUS-Auslauf.' },
  { species: 'Rinder', production_system: 'TSchV-Minimum', requirement: 'Liegeflaeche Mutterkuh Laufstall', min_space_m2: 4.5, details: 'TSchV Anhang 1: Mutterkühe gleicher Platzbedarf wie Milchkuehe im Laufstall.' },
  { species: 'Rinder', production_system: 'TSchV-Minimum', requirement: 'Liegeflaeche Aufzuchtrind >400kg', min_space_m2: 3.5, details: 'TSchV Anhang 1: Aufzuchtrinder ueber 400 kg Lebendgewicht.' },
  { species: 'Rinder', production_system: 'TSchV-Minimum', requirement: 'Liegeflaeche Aufzuchtrind 200-400kg', min_space_m2: 2.5, details: 'TSchV Anhang 1: Aufzuchtrinder 200-400 kg Lebendgewicht.' },
  { species: 'Rinder', production_system: 'TSchV-Minimum', requirement: 'Liegeflaeche Kalb <200kg', min_space_m2: 1.5, details: 'TSchV Anhang 1: Kaelber bis 200 kg. Einzelhaltung nur erste 2 Wochen erlaubt, danach Gruppenhaltung obligatorisch.' },
  { species: 'Rinder', production_system: 'TSchV-Minimum', requirement: 'Anbindehaltung Milchkuh', min_space_m2: null, details: 'Anbindehaltung noch erlaubt (TSchV Art. 39). RAUS-Auslauf obligatorisch: mind. 90 Tage Weide (1.5.-31.10.) + 30 Halbtage Winter. Standlaenge mind. 1.65m (Kurzstand) oder 1.95m (Mittellangstand).' },
  { species: 'Rinder', production_system: 'TSchV-Minimum', requirement: 'Tageslicht und Beleuchtung', min_space_m2: null, details: 'TSchV Art. 33: Fensterflaeche mind. 1/20 der Bodenflaeche. Kuenstliches Licht mind. 15 Lux im Tierbereich waehrend 8h.' },
  { species: 'Rinder', production_system: 'RAUS', requirement: 'Auslauf Sommer (1.5.-31.10.)', min_space_m2: null, details: 'RAUS-Programm DZV: Mind. 26 Tage/Monat Weidegang waehrend Vegetationsperiode. Weidefläche angepasst an Bestandesgroesse.' },
  { species: 'Rinder', production_system: 'RAUS', requirement: 'Auslauf Winter (1.11.-30.4.)', min_space_m2: null, details: 'RAUS-Programm DZV: Mind. 13 Tage/Monat Auslauf im Freien (Laufhof oder Weide). Laufhofflaeche mind. 2.5 m2/GVE.' },
  { species: 'Rinder', production_system: 'RAUS', requirement: 'Beitrag RAUS Rinder', min_space_m2: null, details: 'DZV: RAUS-Beitrag 190 CHF/GVE (Milchkuehe, Mutterkühe, Aufzuchtrinder). Kumulation mit BTS moeglich.' },
  { species: 'Rinder', production_system: 'BTS', requirement: 'Laufstall mit Liegebereich', min_space_m2: null, details: 'BTS-Programm DZV: Laufstall obligatorisch (keine Anbindehaltung). Liegebereich mit Einstreu. Fressplatzbreite mind. 0.70m/Kuh.' },
  { species: 'Rinder', production_system: 'BTS', requirement: 'Beitrag BTS Rinder', min_space_m2: null, details: 'DZV: BTS-Beitrag 90 CHF/GVE (Rindvieh). Kumulation mit RAUS: Total 280 CHF/GVE.' },

  // --- Schweine ---
  { species: 'Schweine', production_system: 'TSchV-Minimum', requirement: 'Bucht Mastschwein >60kg', min_space_m2: 0.9, details: 'TSchV Anhang 1, Tab. 3: Mindestflaeche pro Mastschwein ueber 60 kg Lebendgewicht. Davon max. 50% Spaltenbodenanteil.' },
  { species: 'Schweine', production_system: 'TSchV-Minimum', requirement: 'Bucht Mastschwein 25-60kg', min_space_m2: 0.6, details: 'TSchV Anhang 1: Mastschwein 25-60 kg Lebendgewicht.' },
  { species: 'Schweine', production_system: 'TSchV-Minimum', requirement: 'Bucht Zuchtsau saeugend', min_space_m2: 5.5, details: 'TSchV Anhang 1: Abferkelbucht mind. 5.5 m2 inkl. Ferkelnest. Kastenstand nur waehrend Abferkeln und erste Tage (max. Dauer diskutiert).' },
  { species: 'Schweine', production_system: 'TSchV-Minimum', requirement: 'Gruppenhaltung traechtige Sauen', min_space_m2: 2.5, details: 'TSchV Art. 46: Traechtige Sauen muessen in Gruppen gehalten werden (Ausnahme: 10 Tage vor Abferkeln). Mind. 2.5 m2/Sau.' },
  { species: 'Schweine', production_system: 'TSchV-Minimum', requirement: 'Beschaeftigungsmaterial', min_space_m2: null, details: 'TSchV Art. 44: Schweine muessen jederzeit Zugang zu Raufutter (Stroh, Heu) oder anderem Beschaeftigungsmaterial haben. Ketten allein genuegen nicht.' },
  { species: 'Schweine', production_system: 'TSchV-Minimum', requirement: 'Verbot Vollspaltenboeden', min_space_m2: null, details: 'TSchV Art. 45: Buchtenboden max. 50% perforiert. Liegebereich muss eingestreut oder mit Komfortauflage versehen sein.' },
  { species: 'Schweine', production_system: 'RAUS', requirement: 'Auslauf Schweine', min_space_m2: null, details: 'RAUS-Programm: Alle Schweine muessen taeglich Zugang zu Aussenklima-Bereich haben. Auslaufflaeche: Mastschwein 0.45 m2, Zuchtsau 1.3 m2.' },
  { species: 'Schweine', production_system: 'RAUS', requirement: 'Beitrag RAUS Schweine', min_space_m2: null, details: 'DZV: RAUS-Beitrag 155 CHF/GVE (Schweine). Zuechter und Maester separat anspruchsberechtigt.' },
  { species: 'Schweine', production_system: 'BTS', requirement: 'Mehrflaeche und Einstreu', min_space_m2: null, details: 'BTS-Programm: Mind. 20% mehr Flaeche als TSchV-Minimum. Liegebereich vollstaendig eingestreut. Mastschwein >60kg: mind. 1.1 m2 total.' },
  { species: 'Schweine', production_system: 'BTS', requirement: 'Beitrag BTS Schweine', min_space_m2: null, details: 'DZV: BTS-Beitrag 155 CHF/GVE (Schweine). Kumulation mit RAUS: Total 310 CHF/GVE.' },

  // --- Gefluegel ---
  { species: 'Gefluegel', production_system: 'TSchV-Minimum', requirement: 'Besatzdichte Legehennen', min_space_m2: null, details: 'TSchV Anhang 1, Tab. 9: Max. 7 Legehennen pro m2 nutzbare Flaeche (Bodenhaltung). Kaefighaltung verboten seit 1992 in der Schweiz.' },
  { species: 'Gefluegel', production_system: 'TSchV-Minimum', requirement: 'Besatzdichte Mastpoulets', min_space_m2: null, details: 'TSchV Anhang 1: Max. 30 kg Lebendgewicht pro m2 (Bodenhaltung). Ca. 13-15 Tiere/m2 bei Schlachtgewicht.' },
  { species: 'Gefluegel', production_system: 'TSchV-Minimum', requirement: 'Einrichtung Legehennen', min_space_m2: null, details: 'TSchV Art. 59-62: Sitzstangen (mind. 14 cm/Tier), Legenester (1 Nest pro 5 Hennen), Einstreu im Scharrbereich (mind. 1/3 der Flaeche), erhoehte Sitzgelegenheiten.' },
  { species: 'Gefluegel', production_system: 'TSchV-Minimum', requirement: 'Licht Gefluegel', min_space_m2: null, details: 'TSchV Art. 58: Tageslicht obligatorisch (Fensterflaeche mind. 1/20 der Bodenflaeche). Dunkelphase mind. 8h.' },
  { species: 'Gefluegel', production_system: 'RAUS', requirement: 'Weide Legehennen', min_space_m2: null, details: 'RAUS-Programm: Taeglich Zugang zur Weide bei guenstiger Witterung. Weideflaeche mind. 2.5 m2/Tier. Rotation empfohlen (Parasitenmanagement).' },
  { species: 'Gefluegel', production_system: 'RAUS', requirement: 'Beitrag RAUS Gefluegel', min_space_m2: null, details: 'DZV: RAUS-Beitrag 280 CHF/GVE fuer Legehennen (1 GVE = ca. 111 Hennen). Mastgefluegel: 280 CHF/GVE.' },
  { species: 'Gefluegel', production_system: 'BTS', requirement: 'Voliere/Bodenhaltung', min_space_m2: null, details: 'BTS-Programm Gefluegel: Wintergarten (ueberdachter, geschuetzter Aussenklimabereich) obligatorisch. Mind. 1/3 der Stallflaeche als Scharrbereich.' },

  // --- Schafe ---
  { species: 'Schafe', production_system: 'TSchV-Minimum', requirement: 'Flaeche Mutterschaf mit Lamm', min_space_m2: 1.5, details: 'TSchV Anhang 1, Tab. 5: Mindestflaeche Mutterschaf mit Lamm. Ohne Lamm: 1.0 m2. Haltung im Freien ganzjaehrig erlaubt mit Witterungsschutz.' },
  { species: 'Schafe', production_system: 'TSchV-Minimum', requirement: 'Flaeche Mastlamm', min_space_m2: 0.5, details: 'TSchV Anhang 1: Mastlamm bis 40 kg. Ueber 40 kg: 0.7 m2.' },
  { species: 'Schafe', production_system: 'TSchV-Minimum', requirement: 'Witterungsschutz', min_space_m2: null, details: 'TSchV Art. 36: Bei ganzjaehriger Weidehaltung ist ein natuerlicher oder kuenstlicher Witterungsschutz (Unterstand, Hecken, Wald) obligatorisch.' },
  { species: 'Schafe', production_system: 'RAUS', requirement: 'Auslauf Schafe', min_space_m2: null, details: 'RAUS-Programm: Ganzjaehriger Weidegang oder Laufhof. Sommer: taeglicher Weidegang. Winter: mind. 13 Tage/Monat Auslauf.' },
  { species: 'Schafe', production_system: 'RAUS', requirement: 'Beitrag RAUS Schafe', min_space_m2: null, details: 'DZV: RAUS-Beitrag 190 CHF/GVE (Schafe). 1 GVE = ca. 7 Mutterschafe.' },

  // --- Ziegen ---
  { species: 'Ziegen', production_system: 'TSchV-Minimum', requirement: 'Flaeche Milchziege', min_space_m2: 1.5, details: 'TSchV Anhang 1, Tab. 6: Mindestflaeche pro ausgewachsene Ziege. Erhoehte Liegeflaechenelemente obligatorisch (Ziegen klettern naturgemaess).' },
  { species: 'Ziegen', production_system: 'TSchV-Minimum', requirement: 'Flaeche Zicklein', min_space_m2: 0.5, details: 'TSchV Anhang 1: Zicklein bis 15 kg Lebendgewicht.' },
  { species: 'Ziegen', production_system: 'TSchV-Minimum', requirement: 'Erhoehte Liegeflaechen', min_space_m2: null, details: 'TSchV Art. 56: Ziegen muessen erhoehte Liegeflaechen (Plattformen, Regale) zur Verfuegung haben. Mindestens fuer 50% der Herde gleichzeitig.' },
  { species: 'Ziegen', production_system: 'RAUS', requirement: 'Auslauf Ziegen', min_space_m2: null, details: 'RAUS-Programm: Analog Schafe — ganzjaehriger Zugang zu Freigelände. Ziegen benoetigen zusaetzlich Klettermoeglich­keiten im Auslauf.' },
  { species: 'Ziegen', production_system: 'RAUS', requirement: 'Beitrag RAUS Ziegen', min_space_m2: null, details: 'DZV: RAUS-Beitrag 190 CHF/GVE (Ziegen). 1 GVE = ca. 7 Milchziegen.' },

  // --- Pferde ---
  { species: 'Pferde', production_system: 'TSchV-Minimum', requirement: 'Boxengroesse Einzelhaltung', min_space_m2: null, details: 'TSchV Anhang 1, Tab. 7: Mindestflaeche = (2 x Wh)^2, wobei Wh = Widerristhoehe. Fuer Pferd mit Wh 1.60m: mind. 10.24 m2. Kuerzeste Seite mind. 1.5 x Wh.' },
  { species: 'Pferde', production_system: 'TSchV-Minimum', requirement: 'Gruppenhaltung Pferde', min_space_m2: null, details: 'TSchV Anhang 1: Gruppenauslaufhaltung: mind. 3 x Wh^2 pro Pferd Liegebereich + Auslauf. Fuer Wh 1.60m: mind. 7.68 m2 Liegebereich/Pferd.' },
  { species: 'Pferde', production_system: 'TSchV-Minimum', requirement: 'Bewegung Pferde', min_space_m2: null, details: 'TSchV Art. 59: Pferde und andere Equiden muessen taeglich Auslauf im Freien haben (Weide, Paddock). Anbindehaltung (Staenderhaltung) verboten.' },
  { species: 'Pferde', production_system: 'TSchV-Minimum', requirement: 'Sozialkontakt', min_space_m2: null, details: 'TSchV Art. 59: Pferde muessen Sicht-, Hoer- und Geruchskontakt zu Artgenossen haben. Dauerhafte Einzelhaltung ohne Artgenossenkontakt verboten.' },
  { species: 'Pferde', production_system: 'RAUS', requirement: 'Auslauf Pferde RAUS', min_space_m2: null, details: 'RAUS-Programm: Pferde muessen taeglich Auslauf im Freien haben. Ganzjaehrig: mind. 2h/Tag Weide oder Paddock. Weidesaison (Mai-Okt): ganztaegiger Zugang empfohlen.' },
  { species: 'Pferde', production_system: 'RAUS', requirement: 'Beitrag RAUS Pferde', min_space_m2: null, details: 'DZV: RAUS-Beitrag 190 CHF/GVE (Pferde/Equiden). 1 GVE = ca. 0.7 Pferde (abhaengig von Groesse/Alter).' },
];

const welfareColumns = ['species', 'production_system', 'requirement', 'min_space_m2', 'details', 'language', 'jurisdiction'];
batchInsert('welfare_standards', welfareColumns,
  welfareStandards.map(w => [w.species, w.production_system, w.requirement, w.min_space_m2, w.details, 'DE', 'CH'])
);

// ---------------------------------------------------------------------------
// 2. Stocking Densities — TSchV Anhang 1 Platzbedarf
// ---------------------------------------------------------------------------

interface StockingDensity {
  species: string;
  age_class: string;
  housing_type: string;
  animals_per_m2: number | null;
  regulatory_minimum: string;
}

const stockingDensities: StockingDensity[] = [
  // Rinder
  { species: 'Rinder', age_class: 'Milchkuh', housing_type: 'Laufstall', animals_per_m2: null, regulatory_minimum: '4.5 m2 Liegeflaeche/Kuh, Laufgang mind. 2.5m breit' },
  { species: 'Rinder', age_class: 'Milchkuh', housing_type: 'Anbindestall', animals_per_m2: null, regulatory_minimum: 'Standlaenge 1.65m (Kurzstand) oder 1.95m (Mittellangstand), Breite 1.20m' },
  { species: 'Rinder', age_class: 'Aufzuchtrind >400kg', housing_type: 'Laufstall', animals_per_m2: null, regulatory_minimum: '3.5 m2 Liegeflaeche/Tier' },
  { species: 'Rinder', age_class: 'Aufzuchtrind 200-400kg', housing_type: 'Laufstall', animals_per_m2: null, regulatory_minimum: '2.5 m2 Liegeflaeche/Tier' },
  { species: 'Rinder', age_class: 'Kalb <200kg', housing_type: 'Gruppenhaltung', animals_per_m2: null, regulatory_minimum: '1.5 m2/Kalb, Einzelhaltung max. 2 Wochen nach Geburt' },
  { species: 'Rinder', age_class: 'Mastbulle >400kg', housing_type: 'Laufstall', animals_per_m2: null, regulatory_minimum: '3.5 m2/Tier, Spaltenbodenanteil max. 50%' },

  // Schweine
  { species: 'Schweine', age_class: 'Mastschwein >60kg', housing_type: 'Bucht', animals_per_m2: 1.11, regulatory_minimum: '0.9 m2/Tier (TSchV), BTS: 1.1 m2/Tier' },
  { species: 'Schweine', age_class: 'Mastschwein 25-60kg', housing_type: 'Bucht', animals_per_m2: 1.67, regulatory_minimum: '0.6 m2/Tier' },
  { species: 'Schweine', age_class: 'Zuchtsau trächtig', housing_type: 'Gruppenhaltung', animals_per_m2: 0.4, regulatory_minimum: '2.5 m2/Sau, Gruppenhaltung obligatorisch' },
  { species: 'Schweine', age_class: 'Zuchtsau saeugend', housing_type: 'Abferkelbucht', animals_per_m2: null, regulatory_minimum: '5.5 m2 Abferkelbucht inkl. Ferkelnest' },
  { species: 'Schweine', age_class: 'Absetzferkel', housing_type: 'Bucht', animals_per_m2: 2.86, regulatory_minimum: '0.35 m2/Tier (bis 25 kg)' },
  { species: 'Schweine', age_class: 'Eber', housing_type: 'Einzelbucht', animals_per_m2: null, regulatory_minimum: '6.0 m2/Eber, Sicht- und Geruchskontakt zu anderen Schweinen' },

  // Gefluegel
  { species: 'Gefluegel', age_class: 'Legehenne', housing_type: 'Bodenhaltung', animals_per_m2: 7, regulatory_minimum: 'Max. 7 Hennen/m2 nutzbare Flaeche, Kaefighaltung seit 1992 verboten' },
  { species: 'Gefluegel', age_class: 'Legehenne', housing_type: 'Freilandhaltung', animals_per_m2: 7, regulatory_minimum: 'Max. 7 Hennen/m2 Stallflaeche + mind. 2.5 m2 Weide/Tier' },
  { species: 'Gefluegel', age_class: 'Mastpoulet', housing_type: 'Bodenhaltung', animals_per_m2: null, regulatory_minimum: 'Max. 30 kg/m2 Lebendgewicht (ca. 13-15 Tiere/m2)' },
  { species: 'Gefluegel', age_class: 'Masttrute', housing_type: 'Bodenhaltung', animals_per_m2: null, regulatory_minimum: 'Max. 3 Truten/m2 (Hähne) bzw. 5 Truten/m2 (Hennen)' },

  // Schafe
  { species: 'Schafe', age_class: 'Mutterschaf mit Lamm', housing_type: 'Stall', animals_per_m2: 0.67, regulatory_minimum: '1.5 m2/Tier' },
  { species: 'Schafe', age_class: 'Mutterschaf ohne Lamm', housing_type: 'Stall', animals_per_m2: 1.0, regulatory_minimum: '1.0 m2/Tier' },
  { species: 'Schafe', age_class: 'Mastlamm <40kg', housing_type: 'Stall', animals_per_m2: 2.0, regulatory_minimum: '0.5 m2/Tier' },

  // Ziegen
  { species: 'Ziegen', age_class: 'Milchziege', housing_type: 'Stall', animals_per_m2: 0.67, regulatory_minimum: '1.5 m2/Tier, erhoehte Liegeflächen obligatorisch' },
  { species: 'Ziegen', age_class: 'Zicklein <15kg', housing_type: 'Stall', animals_per_m2: 2.0, regulatory_minimum: '0.5 m2/Tier' },
  { species: 'Ziegen', age_class: 'Ziegenbock', housing_type: 'Stall', animals_per_m2: null, regulatory_minimum: '2.0 m2/Tier, Sichtkontakt zu Herde' },

  // Pferde
  { species: 'Pferde', age_class: 'Pferd Wh 1.60m', housing_type: 'Einzelbox', animals_per_m2: null, regulatory_minimum: '10.24 m2 = (2 x 1.60)^2, kuerzeste Seite mind. 2.40m' },
  { species: 'Pferde', age_class: 'Pferd Wh 1.60m', housing_type: 'Gruppenhaltung', animals_per_m2: null, regulatory_minimum: '7.68 m2 Liegebereich/Pferd + Auslauf' },
  { species: 'Pferde', age_class: 'Pony Wh 1.30m', housing_type: 'Einzelbox', animals_per_m2: null, regulatory_minimum: '6.76 m2 = (2 x 1.30)^2' },
];

const stockingColumns = ['species', 'age_class', 'housing_type', 'animals_per_m2', 'regulatory_minimum', 'language', 'jurisdiction'];
batchInsert('stocking_densities', stockingColumns,
  stockingDensities.map(s => [s.species, s.age_class, s.housing_type, s.animals_per_m2, s.regulatory_minimum, 'DE', 'CH'])
);

// ---------------------------------------------------------------------------
// 3. Housing Requirements — Detaillierte Stallbauanforderungen
// ---------------------------------------------------------------------------

interface HousingRequirement {
  species: string;
  age_class: string;
  system: string;
  space: string;
  ventilation: string;
  flooring: string;
  temperature: string;
}

const housingRequirements: HousingRequirement[] = [
  // Rinder
  { species: 'Rinder', age_class: 'Milchkuh', system: 'Laufstall', space: '4.5 m2 Liegeflaeche, Fressplatzbreite 0.70m, Laufgang 2.5m', ventilation: 'Natuerliche Lueftung bevorzugt, max. 3 m/s Luftgeschwindigkeit im Tierbereich', flooring: 'Liegebereich: Gummimatte oder Stroh. Laufbereich: rutschfest, max. 50% perforiert. Spaltenweite max. 35mm (Kuehe)', temperature: 'Optimal 5-15°C, keine Minimalanforderung bei Aussenklimastaellen' },
  { species: 'Rinder', age_class: 'Milchkuh', system: 'Anbindestall', space: 'Standlaenge 1.65m (Kurzstand) oder 1.95m (Mittellangstand), Breite 1.20m', ventilation: 'Wie Laufstall, plus Fensterflaeche 1/20 Bodenflaeche', flooring: 'Standflaeche trittfest, Liegebereich eingestreut oder Gummimatte, Hinterer Gitterrost max. 35mm Spalten', temperature: 'Wie Laufstall' },
  { species: 'Rinder', age_class: 'Milchkuh', system: 'BTS', space: 'Laufstall obligatorisch. Fressplatzbreite mind. 0.70m. Liegebereich mit Einstreu oder Tiefstreu.', ventilation: 'Wie Laufstall', flooring: 'Liegebereich vollstaendig eingestreut (Stroh, Spaene). Kein Vollspaltenboden im Liegebereich.', temperature: 'Wie Laufstall' },
  { species: 'Rinder', age_class: 'Kalb', system: 'Gruppenhaltung', space: '1.5 m2/Kalb (<200kg), Einzeliglu max. 2 Wochen nach Geburt', ventilation: 'Gut belueftet, Zugluft vermeiden', flooring: 'Eingestreuter Liegebereich, rutschfester Boden', temperature: 'Kaelbernest: Infrarotwaerme empfohlen bei <5°C' },

  // Schweine
  { species: 'Schweine', age_class: 'Mastschwein', system: 'Bucht', space: '0.9 m2/Tier >60kg, Liegebereich mind. 0.6 m2', ventilation: 'Zwangslueftung oder natuerliche Lueftung, NH3 <20ppm, CO2 <3000ppm', flooring: 'Max. 50% Spaltenanteil (Betonroste), Liegebereich planbefestigt und eingestreut', temperature: 'Optimal 16-22°C, Ferkel: 28-32°C (Ferkelnest)' },
  { species: 'Schweine', age_class: 'Mastschwein', system: 'BTS', space: '1.1 m2/Tier >60kg (+20% gegenueber TSchV), Liegebereich mind. 0.7 m2', ventilation: 'Wie Standardbucht', flooring: 'Liegebereich vollstaendig eingestreut, planbefestigt. Aktivitaetsbereich kann Teilspalten haben.', temperature: 'Wie Standardbucht' },
  { species: 'Schweine', age_class: 'Zuchtsau', system: 'Abferkelbucht', space: '5.5 m2 Abferkelbucht, Ferkelnest mind. 0.7 m2', ventilation: 'Getrennte Klimazonen: Sau 16-20°C, Ferkel 28-32°C', flooring: 'Planbefestigt, Liegebereich Sau eingestreut, Ferkelnest beheizt', temperature: 'Sau: 16-20°C, Ferkelnest: 28-32°C (Fussbodenheizung oder Infrarot)' },

  // Gefluegel
  { species: 'Gefluegel', age_class: 'Legehenne', system: 'Bodenhaltung', space: 'Max. 7 Hennen/m2, mind. 1/3 Scharrbereich mit Einstreu, Sitzstangen 14cm/Tier', ventilation: 'Gute Lueftung, NH3 <20ppm, relative Luftfeuchtigkeit 60-80%', flooring: 'Mind. 1/3 eingestreuter Scharrbereich, Rest Gitterrost/Spaltenboden ueber Kotgrube', temperature: 'Optimal 18-22°C, max. 30°C (Hitzestress ab 27°C)' },
  { species: 'Gefluegel', age_class: 'Legehenne', system: 'BTS', space: 'Wie Bodenhaltung, plus Wintergarten (ueberdachter Aussenklimabereich) obligatorisch', ventilation: 'Wintergarten: offene Seite, wind- und regengeschuetzt', flooring: 'Scharrbereich mind. 1/3, Wintergarten: Naturboden oder eingestreut', temperature: 'Stall: 18-22°C, Wintergarten: Aussentemperatur' },
  { species: 'Gefluegel', age_class: 'Mastpoulet', system: 'Bodenhaltung', space: 'Max. 30 kg/m2, Einstreu ganzflaechig', ventilation: 'Wie Legehennen, besonders wichtig: CO2 und NH3 Kontrolle', flooring: 'Ganzflaechig eingestreut (Holzspaene, Stroh), 5-10cm Einstreutiefe', temperature: 'Kueken: 33°C Tag 1, Absenkung 3°C/Woche bis 20°C' },

  // Schafe
  { species: 'Schafe', age_class: 'Mutterschaf', system: 'Stall', space: '1.5 m2/Tier mit Lamm, 1.0 m2 ohne Lamm', ventilation: 'Natuerliche Lueftung, Schafe vertragen Kaelte gut aber keine Zugluft', flooring: 'Stroh-Tiefstreu bevorzugt, trittfester Boden', temperature: 'Keine Minimalanforderung, Lammungsbereich: >5°C empfohlen' },

  // Ziegen
  { species: 'Ziegen', age_class: 'Milchziege', system: 'Stall', space: '1.5 m2/Tier, erhoehte Liegeflächen fuer mind. 50% der Herde', ventilation: 'Ziegen empfindlich auf Feuchtigkeit — gute Belueftung essenziell', flooring: 'Trocken, eingestreut, erhoehte Plattformen aus Holz', temperature: 'Ziegen vertragen Kaelte gut bei trockenen Bedingungen' },

  // Pferde
  { species: 'Pferde', age_class: 'Pferd Wh 1.60m', system: 'Einzelbox', space: '10.24 m2, kuerzeste Seite 2.40m, Deckenhoehe mind. 1.5 x Wh (2.40m)', ventilation: 'Natuerliche Lueftung, gute Luftqualitaet kritisch (Staub, Ammoniak)', flooring: 'Gummimatte + Einstreu (Stroh oder Spaene), min. 10cm Einstreutiefe', temperature: 'Keine Heizung noetig, Zugluftfreiheit wichtiger als Waerme' },
  { species: 'Pferde', age_class: 'Pferd Wh 1.60m', system: 'Gruppenhaltung', space: '7.68 m2 Liegebereich/Pferd + Auslauf, Fressplaetze mind. 1 pro Tier', ventilation: 'Offenstall/Aktivstall: natuerliche Lueftung', flooring: 'Liegebereich: Tiefstreu oder Strohmatratze. Auslauf: befestigt, draeniert.', temperature: 'Offenstall: Witterungsschutz, Windschutz an Liegebereich' },
];

const housingColumns = ['species', 'age_class', 'system', 'space', 'ventilation', 'flooring', 'temperature', 'language', 'jurisdiction'];
batchInsert('housing_requirements', housingColumns,
  housingRequirements.map(h => [h.species, h.age_class, h.system, h.space, h.ventilation, h.flooring, h.temperature, 'DE', 'CH'])
);

// ---------------------------------------------------------------------------
// 4. Movement Rules — TVD, Transport, Soemmerung, Schlachtung
// ---------------------------------------------------------------------------

interface MovementRule {
  species: string;
  rule_type: string;
  description: string;
}

const movementRules: MovementRule[] = [
  // TVD — Rinder
  { species: 'Rinder', rule_type: 'TVD', description: 'Alle Rinder muessen innerhalb von 3 Arbeitstagen nach Geburt in der TVD registriert werden. Zwei Ohrmarken (links + rechts) mit UELN-Nummer. Begleitdokument bei jedem Standortwechsel obligatorisch.' },
  { species: 'Rinder', rule_type: 'TVD', description: 'Meldepflicht: Geburt, Zugang, Abgang, Tod, Schlachtung — jeweils innert 3 Arbeitstagen via agate.ch oder Meldestelle. Sanktionen bei verspaeteter Meldung (Beitragsabzuege).' },
  { species: 'Rinder', rule_type: 'TVD', description: 'Tierpass (Rinderpass): Begleitet jedes Rind bei Standortwechsel. Enthaelt UELN, Rasse, Geschlecht, Geburtsdatum, Mutter-ID, Herkunftsland.' },

  // TVD — Schweine
  { species: 'Schweine', rule_type: 'TVD', description: 'Schweine: Betriebsregistrierung obligatorisch. Ohrmarken bei Abgang vom Geburtsbetrieb. Bestandeskontrolle: Zu- und Abgaenge innert 3 Arbeitstagen melden.' },
  { species: 'Schweine', rule_type: 'TVD', description: 'Schweinepass nicht erforderlich, aber Begleitdokument bei Transport zum Schlachthof obligatorisch (Herkunft, Behandlungen, Absetzfristen).' },

  // TVD — Schafe/Ziegen
  { species: 'Schafe', rule_type: 'TVD', description: 'Schafe: Zwei Ohrmarken (eine elektronisch) obligatorisch. Registrierung innert 30 Tagen nach Geburt (90 Tage bei Soemmerung). Begleitdokument bei Standortwechsel.' },
  { species: 'Ziegen', rule_type: 'TVD', description: 'Ziegen: Gleiche Regelung wie Schafe — zwei Ohrmarken, elektronische Kennzeichnung, Meldepflicht innert 30 Tagen.' },

  // TVD — Pferde
  { species: 'Pferde', rule_type: 'TVD', description: 'Equiden: Equidenpass (UELN) obligatorisch. Mikrochip-Implantation. Registrierung bei der Tierverkehrsdatenbank (Identitas AG). Pass begleitet Tier lebenslang.' },

  // Transport
  { species: 'Rinder', rule_type: 'Transport', description: 'Maximale Transportdauer: 8 Stunden. Schlachttiere: max. 6 Stunden. Transportbewilligung fuer gewerblichen Transport erforderlich. Sachkundenachweis fuer Fahrer obligatorisch. Transportfaehigkeit: nur gesunde, nicht verletzte Tiere.' },
  { species: 'Schweine', rule_type: 'Transport', description: 'Maximale Transportdauer: 8 Stunden (Schlachttiere: 6h). Ladedichte: max. 235 kg/m2 fuer Mastschweine. Rampenneigung max. 20°. Dusche/Befeuchtung ab 25°C Aussentemperatur.' },
  { species: 'Gefluegel', rule_type: 'Transport', description: 'Kuecken: max. 4 Stunden Transport (72h nach Schlupf). Mastgefluegel: max. 8 Stunden. Transportkisten: Mindesthoehe 23cm (Masthühner), natuerliche Belueftung.' },
  { species: 'Schafe', rule_type: 'Transport', description: 'Maximale Transportdauer: 8 Stunden. Schafe und Ziegen gemeinsam transportierbar. Genügend Platz zum Stehen und Liegen.' },
  { species: 'Pferde', rule_type: 'Transport', description: 'Maximale Transportdauer: 8 Stunden. Einzeltransport oder Gruppe (vertraegliche Tiere). Pferde muessen angebunden oder in Einzelboxen stehen koennen. Transportbewilligung + Sachkunde.' },

  // Soemmerung/Alpung
  { species: 'Rinder', rule_type: 'Soemmerung', description: 'Soemmerung/Alpung: Alpzeit 56-120 Tage (je nach Hoehenzone und Kanton). Normalbesatz: 0.5-2.5 GVE/ha (abhaengig von Standort und Vegetationsperiode). Soemmerungsbeitrag: 400 CHF/NST (Normalstoss). Meldung an TVD bei Alpaufzug und -abzug.' },
  { species: 'Rinder', rule_type: 'Soemmerung', description: 'Alpkaese-Produktion: Verarbeitung auf der Alp erlaubt (vereinfachte Hygieneauflagen). GVE-Berechnung: 1 Milchkuh = 1 GVE, 1 Aufzuchtrind (1-2j) = 0.6 GVE, 1 Kalb (<1j) = 0.3 GVE.' },
  { species: 'Schafe', rule_type: 'Soemmerung', description: 'Schafe auf Alpen: 1 GVE = ca. 7 Mutterschafe. Herdenschutz (Wolf): Nachtpferch, Schutzhunde, Behirtung. Bund und Kantone finanzieren Herdenschutzmassnahmen.' },
  { species: 'Ziegen', rule_type: 'Soemmerung', description: 'Ziegen auf Alpen: Haeufig zusammen mit Schafen. Gleiche GVE-Umrechnung. Ziegenkaeserei auf Alpen traditionell (v.a. Tessin, Buenden).' },

  // Schlachtung
  { species: 'Rinder', rule_type: 'Schlachtung', description: 'Betaeubungspflicht obligatorisch (Bolzenschuss oder Elektrobetaeubung). Schaechten (Schlachtung ohne Betaeubung) seit 1893 in der Bundesverfassung verboten (BV Art. 80). Fleischkontrolle durch amtlichen Tierarzt.' },
  { species: 'Schweine', rule_type: 'Schlachtung', description: 'Betaeubung: CO2-Betaeubung (Standard Grossschlachthof) oder Elektrobetaeubung. Schaechten verboten. Transportfaehigkeitskontrolle vor Schlachtung. Schlachtgebuehr und Entsorgungskosten.' },
  { species: 'Gefluegel', rule_type: 'Schlachtung', description: 'Betaeubung: Elektrisches Wasserbad oder CO2. Baeuerliche Hofschlachtung: max. wenige Tiere/Woche fuer Direktvermarktung (kantonal geregelt). Betaeubungspflicht gilt auch auf dem Hof.' },
  { species: 'Schafe', rule_type: 'Schlachtung', description: 'Betaeubung: Bolzenschuss oder Elektrobetaeubung. Hofschlachtung fuer Eigengebrauch erlaubt (Meldepflicht, Fleischkontrolle bei Direktvermarktung). Schaechten verboten.' },
];

const movementColumns = ['species', 'rule_type', 'description', 'language', 'jurisdiction'];
batchInsert('movement_rules', movementColumns,
  movementRules.map(m => [m.species, m.rule_type, m.description, 'DE', 'CH'])
);

// ---------------------------------------------------------------------------
// 5. Breeds — Schweizer Rassen
// ---------------------------------------------------------------------------

interface Breed {
  species: string;
  name: string;
  purpose: string;
  notes: string;
}

const breeds: Breed[] = [
  // Rinder
  { species: 'Rinder', name: 'Braunvieh (Brown Swiss)', purpose: 'Zweinutzung (Milch + Fleisch)', notes: 'Aelteste Rinderrasse der Welt. Ursprung Innerschweiz. Brown Swiss (US-Typ) = Milchbetont, Original Braunvieh = Zweinutzung. Braunvieh Schweiz (Zuchtorganisation). Ca. 15% des CH-Milchkuhbestands.' },
  { species: 'Rinder', name: 'Original Braunvieh (OB)', purpose: 'Zweinutzung, Alptauglichkeit', notes: 'Traditionelle Schweizer Rasse, kleiner und robuster als Brown Swiss. Besonders geeignet fuer Berggebiet und Alpung. Schutzbedarf wegen kleinem Bestand. ProSpecieRara-Rasse.' },
  { species: 'Rinder', name: 'Simmental / Fleckvieh', purpose: 'Zweinutzung (Milch + Fleisch)', notes: 'Ursprung Simmental (BE). Weltweit verbreitet. Schweizer Fleckvieh: Milchbetonter Typ. Swissherdbook (Zuchtorganisation). Groesste Rasse in CH nach Holstein.' },
  { species: 'Rinder', name: 'Holstein', purpose: 'Milch', notes: 'Hoechste Milchleistung aller Rassen (8000-10000 kg/Laktation). Zunehmender Anteil in Talzone-Milchbetrieben. Swissherdbook. Ca. 30% des CH-Milchkuhbestands.' },
  { species: 'Rinder', name: 'Eringer (Herens)', purpose: 'Fleisch, Tradition (Kuhkaempfe)', notes: 'Ursprung Wallis. Kleine, robuste Kampfrasse. "Combats de reines" (Kuhkaempfe) — kulturelle Tradition im Wallis. Fleischproduktion, Alpsoemmerung. Geschuetzte Rasse.' },
  { species: 'Rinder', name: 'Grauvieh', purpose: 'Zweinutzung, Alptauglichkeit', notes: 'Ursprung Graubuenden. Kleine, genuegsame Rasse fuer extreme Berglagen. ProSpecieRara-Rasse. Bestand ca. 1500 Tiere. Kaeseproduktion (Alpkaese).' },
  { species: 'Rinder', name: 'Hinterwaelder', purpose: 'Zweinutzung, extensiv', notes: 'Kleine Rasse, urspruenglich Schwarzwald, auch in CH Berggebiet. Sehr leichtfuttrig und gelaendegaengig. ProSpecieRara.' },
  { species: 'Rinder', name: 'Evolener', purpose: 'Zweinutzung, Alptauglichkeit', notes: 'Seltene Walliser Rasse, verwandt mit Eringer. Sehr kleine Population. ProSpecieRara-Schutzprogramm.' },

  // Schweine
  { species: 'Schweine', name: 'Schweizer Edelschwein (Grosses Weisses)', purpose: 'Mutterrasse, Milchleistung', notes: 'Hauptrasse in CH-Schweinezucht. Suisseporcs (Zuchtorganisation). Mutterlinie in Kreuzungsprogrammen. Gute Wurfgroesse und Milchleistung.' },
  { species: 'Schweine', name: 'Schweizer Landrasse', purpose: 'Mutterrasse', notes: 'Zweithaeufigte Rasse. Kreuzung mit Edelschwein = F1-Sauen fuer Mastferkelproduktion. Robust, gute Muttereigenschaften.' },
  { species: 'Schweine', name: 'Duroc', purpose: 'Vaterrasse (Fleischqualitaet)', notes: 'Endstufeneber fuer Fleischqualitaet (intramuskulaeres Fett, Zartheit). Premo-Programm (Suisseporcs).' },
  { species: 'Schweine', name: 'Pietrain', purpose: 'Vaterrasse (Fleischansatz)', notes: 'Endstufeneber fuer Fleischansatz und Magerkeit. Stresssensibilitaet beachten (MHS-Gen). In CH seltener als Duroc.' },

  // Schafe
  { species: 'Schafe', name: 'Weisses Alpenschaf', purpose: 'Milch, Fleisch, Wolle', notes: 'Haeufigste Schafrasse in der Schweiz. Robust, alptauglich. Swisssheep (Zuchtorganisation).' },
  { species: 'Schafe', name: 'Schwarznasenschaf (Walliser)', purpose: 'Fleisch, Landschaftspflege, Wolle', notes: 'Ikonische Walliser Rasse mit schwarzer Nase und Spiralhoernern. UNESCO Immaterielles Kulturerbe (Kandidat). Touristenattraktion, robuste Bergrasse.' },
  { species: 'Schafe', name: 'Engadinerschaf', purpose: 'Fleisch, Landschaftspflege', notes: 'Seltene Buendner Rasse. ProSpecieRara. Alptauglich, genuegsam.' },
  { species: 'Schafe', name: 'Braunkoepfiges Fleischschaf', purpose: 'Fleisch (Mastlamm)', notes: 'Fruehreife Fleischschafrasse, besonders geeignet fuer Mast. Schweizer Zuchtlinie.' },
  { species: 'Schafe', name: 'Spiegelschaf', purpose: 'Fleisch, Milch', notes: 'Schweizer Rasse, ProSpecieRara. Helle Flecken um die Augen (Spiegel). Bestand ca. 1200 Tiere.' },

  // Ziegen
  { species: 'Ziegen', name: 'Saaneziege (Saanenziege)', purpose: 'Milch', notes: 'Weltweit verbreitete Schweizer Milchziegenrasse. Ursprung Saanen (BE). Weiss, hornlos. Hoechste Milchleistung (800-1000 kg/Laktation). Schweizerischer Ziegenzuchtverband (SZZV).' },
  { species: 'Ziegen', name: 'Toggenburger Ziege', purpose: 'Milch', notes: 'Ursprung Toggenburg (SG). Braun mit weissen Streifen im Gesicht. Robuste Milchziege, alptauglich.' },
  { species: 'Ziegen', name: 'Appenzellerziege', purpose: 'Milch, Landschaftspflege', notes: 'Weisse Ziegenrasse aus dem Appenzellerland. Mittelgross, robust. ProSpecieRara.' },
  { species: 'Ziegen', name: 'Buendner Strahlenziege', purpose: 'Milch, Fleisch', notes: 'Schwarze Ziege mit weissen Streifen (Strahlen) im Gesicht. Graubuenden. ProSpecieRara-Rasse. Traditionelle Alpziegenrasse.' },
  { species: 'Ziegen', name: 'Walliser Schwarzhalsziege', purpose: 'Fleisch, Landschaftspflege', notes: 'Zweifarbig: vordere Haelfte schwarz, hintere weiss. Robuste Bergrasse. ProSpecieRara. Beliebtes Motiv, touristisch wertvoll.' },
  { species: 'Ziegen', name: 'Stiefelgeiss', purpose: 'Milch, Fleisch', notes: 'Seltene Schweizer Rasse, weiss mit braunen "Stiefeln" an den Beinen. ProSpecieRara. Bestand ca. 800 Tiere.' },

  // Pferde
  { species: 'Pferde', name: 'Freiberger (Franches-Montagnes)', purpose: 'Arbeit, Freizeit, Militaer', notes: 'Einzige Schweizer Pferderasse. Ursprung Jura. Vielseitiger Kaltblut-/Warmbluttyp. Vom Bund gefoerdert (Schweizerisches Nationalgestuet Avenches). Bestand ca. 25000.' },
  { species: 'Pferde', name: 'Warmblut CH', purpose: 'Sport (Springen, Dressur)', notes: 'Schweizer Warmblut (ZVCH). Sport- und Freizeitpferd. Zucht basiert auf internationalen Blutlinien + CH-Stutenstamm.' },
];

const breedColumns = ['species', 'name', 'purpose', 'notes', 'language', 'jurisdiction'];
batchInsert('breeds', breedColumns,
  breeds.map(b => [b.species, b.name, b.purpose, b.notes, 'DE', 'CH'])
);

// ---------------------------------------------------------------------------
// 6. Feed Requirements — Fuetterung pro Tierart und Produktionsstadium
// ---------------------------------------------------------------------------

interface FeedRequirement {
  species: string;
  age_class: string;
  production_stage: string;
  feed_type: string;
  quantity_kg_day: number | null;
  energy_mj: number | null;
  protein_g: number | null;
  notes: string;
}

const feedRequirements: FeedRequirement[] = [
  // Rinder — Milchkuh
  { species: 'Rinder', age_class: 'Milchkuh', production_stage: 'Laktation', feed_type: 'Grundfutter (Heu, Grassilage, Maissilage)', quantity_kg_day: null, energy_mj: 110, protein_g: 2800, notes: 'NEL-Bedarf: ca. 110 MJ NEL/Tag bei 25 kg Milch/Tag. Grundfutter bildet Basis (60-80% der Ration). Kraftfutter max. 40% Trockenmasse. GMF-Programm (DZV): mind. 75% Graslandprodukte in der Jahresration (Raufutter-Anteil).' },
  { species: 'Rinder', age_class: 'Milchkuh', production_stage: 'Trockenstehend', feed_type: 'Heu, Duerrfutter', quantity_kg_day: null, energy_mj: 55, protein_g: 900, notes: 'Galtphase 6-8 Wochen. Energiereduziert fuettern. Mineralstoff-Ergaenzung (Ca, P, Mg). Uebergangsration 2 Wochen vor Abkalben.' },
  { species: 'Rinder', age_class: 'Milchkuh', production_stage: 'GMF-Programm', feed_type: 'Graslandprodukte (mind. 75%)', quantity_kg_day: null, energy_mj: null, protein_g: null, notes: 'Graslandbasierte Milch- und Fleischproduktion (DZV): Mind. 75% der Ration aus Grasland (Heu, Gras, Grassilage). Max. 10% Kraftfutter (Getreide, Extraktionsschrote). Beitrag: 200 CHF/GVE. Foerdert Gruenland-Nutzung statt Ackerfutter-Import.' },

  // Rinder — Aufzucht
  { species: 'Rinder', age_class: 'Aufzuchtrind', production_stage: 'Aufzucht', feed_type: 'Heu, Grassilage, Mineralstoffe', quantity_kg_day: null, energy_mj: 45, protein_g: 500, notes: 'Tagesration: ca. 6-8 kg Trockenmasse Raufutter, ergaenzt mit Mineralstoffen. Erstkalbealter Ziel: 24-26 Monate. Gute Aufzucht = hohe Lebensleistung.' },
  { species: 'Rinder', age_class: 'Kalb', production_stage: 'Aufzucht', feed_type: 'Milch/Milchaustauscher, Heu, Starterfutter', quantity_kg_day: null, energy_mj: 25, protein_g: 400, notes: 'Kolostrum (Biestmilch) in ersten 6h obligatorisch. Ab Woche 1 Heu und Wasser anbieten. Abtraenken ab 8-12 Wochen.' },

  // Schweine
  { species: 'Schweine', age_class: 'Mastschwein', production_stage: 'Mast', feed_type: 'Vormast-/Endmastfutter, Nebenprodukte', quantity_kg_day: 2.5, energy_mj: 33, protein_g: 380, notes: 'Phasenfuetterung: Vormast (25-60kg) proteinreicher, Endmast (60-110kg) energiereich, weniger Protein. Futterverwertung: ca. 2.8 kg Futter/kg Zuwachs. Schweizer Futtermittelbranche: viel Nebenprodukte (Molke, Schotte, Getreidenebenprodukte).' },
  { species: 'Schweine', age_class: 'Zuchtsau', production_stage: 'Laktation', feed_type: 'Saeugefutter, ad libitum', quantity_kg_day: 6.0, energy_mj: 75, protein_g: 950, notes: 'Saeugende Sau: hoher Energiebedarf (10-14 Ferkel). Ad libitum fuettern ab Tag 3 nach Abferkeln. Wasserversorgung: mind. 20 Liter/Tag.' },
  { species: 'Schweine', age_class: 'Absetzferkel', production_stage: 'Aufzucht', feed_type: 'Ferkelstarter, Prestarter', quantity_kg_day: 0.8, energy_mj: 14, protein_g: 180, notes: 'Absetzen mit 28-35 Tagen. Futterwechsel langsam (Verdauungsprobleme). Warm (28°C), trocken, zugfrei. N-reduzierte Fuetterung: Ressourceneffizienzbeitrag (DZV) fuer reduzierte N-Ausscheidung.' },

  // Gefluegel
  { species: 'Gefluegel', age_class: 'Legehenne', production_stage: 'Legeperiode', feed_type: 'Legemehl/Legekorn', quantity_kg_day: 0.12, energy_mj: 1.5, protein_g: 20, notes: 'Ca. 120 g Futter/Tag. Ca-Bedarf: 3.5-4.0 g/Tag (Eierschalenbildung). Muschelkalk als Calciumquelle. Legeleistung: 280-320 Eier/Jahr (Legehybride).' },
  { species: 'Gefluegel', age_class: 'Mastpoulet', production_stage: 'Mast', feed_type: 'Starterfutter, Mastfutter, Endmastfutter', quantity_kg_day: null, energy_mj: null, protein_g: null, notes: 'Phasenfuetterung: Starter (Woche 1-2, 23% RP), Mast (Woche 3-5, 21% RP), Endmast (ab Woche 5, 19% RP). Schlachtalter konventionell: 35-42 Tage. Freiland/Bio: 56-81 Tage.' },

  // Schafe
  { species: 'Schafe', age_class: 'Mutterschaf', production_stage: 'Laktation', feed_type: 'Heu, Grassilage, Kraftfutter', quantity_kg_day: null, energy_mj: 18, protein_g: 220, notes: 'Saeugephase 6-8 Wochen. Energiebedarf steigt mit Lammanzahl. Gutes Heu + moderate Kraftfuttergabe. Mineralstoffe (Se, Co, Cu beachten).' },
  { species: 'Schafe', age_class: 'Mastlamm', production_stage: 'Mast', feed_type: 'Weide, Heu, Kraftfutter', quantity_kg_day: null, energy_mj: 10, protein_g: 130, notes: 'Schlachtgewicht 38-42 kg lebend. Intensive Weidemast oder Stallmast. Tageszunahme Ziel: 250-350 g/Tag.' },

  // Pferde
  { species: 'Pferde', age_class: 'Pferd 500kg', production_stage: 'Erhaltung', feed_type: 'Heu, Stroh, Mineralstoffe', quantity_kg_day: 8.0, energy_mj: 70, protein_g: 500, notes: 'Raufutter bildet Basis (mind. 1.5 kg Heu/100 kg Koerpergewicht). Pferde: empfindliches Verdauungssystem, kleine Portionen, regelmaessig fuettern. Kein Silage fuer Pferde (Botulismus-Risiko).' },
  { species: 'Pferde', age_class: 'Pferd 500kg', production_stage: 'Arbeit (mittel)', feed_type: 'Heu, Hafer, Mischfutter', quantity_kg_day: 10.0, energy_mj: 95, protein_g: 700, notes: 'Sportpferd/Arbeitspferd: erhoehter Energiebedarf. Hafer traditionelles Kraftfutter. Elektrolyte bei Schweissarbeit. Wasser ad libitum.' },
];

const feedColumns = ['species', 'age_class', 'production_stage', 'feed_type', 'quantity_kg_day', 'energy_mj', 'protein_g', 'notes', 'language', 'jurisdiction'];
batchInsert('feed_requirements', feedColumns,
  feedRequirements.map(f => [f.species, f.age_class, f.production_stage, f.feed_type, f.quantity_kg_day, f.energy_mj, f.protein_g, f.notes, 'DE', 'CH'])
);

// ---------------------------------------------------------------------------
// 7. Animal Health — Tiergesundheit, Tierseuchen, Praevention
// ---------------------------------------------------------------------------

interface AnimalHealth {
  species: string;
  condition: string;
  symptoms: string;
  prevention: string;
  regulatory_status: string;
  details: string;
}

const animalHealthData: AnimalHealth[] = [
  // Rinder
  { species: 'Rinder', condition: 'BVD (Bovine Virusdiarrhoe)', symptoms: 'Durchfall, Fieber, Aborte, Missbildungen bei Kaelbern (persistent infiziert, PI-Tiere)', prevention: 'Nationales BVD-Ausrottungsprogramm seit 2008. Ohrgewebeprobe bei Geburt (BVD-Antigentest). PI-Tiere muessen eliminiert werden.', regulatory_status: 'Zu bekaempfende Tierseuche (TSV), Meldepflicht', details: 'Schweiz praktisch BVD-frei seit ~2017. Letzte PI-Tiere werden nachverfolgt. Impfung verboten (stoert Surveillance).' },
  { species: 'Rinder', condition: 'IBR (Infektioese Bovine Rhinotracheitis)', symptoms: 'Nasenausfluss, Fieber, Atemwegssymptome, Aborte', prevention: 'Schweiz gilt als IBR-frei. Import nur aus IBR-freien Bestaenden/Laendern. Ueberwachung durch Tankmilchproben.', regulatory_status: 'Zu bekaempfende Tierseuche (TSV), Meldepflicht', details: 'IBR-Freiheit seit 1993. Wichtiger Handelsvorteil fuer CH-Zuchtviehexport.' },
  { species: 'Rinder', condition: 'Mastitis (Euterentzuendung)', symptoms: 'Geschwollenes Euter, Flocken/Klumpen in Milch, Fieber, Schmerzen', prevention: 'Melkhygiene, Zitzendesinfektion, regelmaessige Milchprobe (Zellzahlkontrolle), Trockenstellen mit Antibiotika oder Zitzenversiegler', regulatory_status: 'Keine Meldepflicht, aber wirtschaftlich bedeutendste Rinderkrankheit', details: 'Erreger: Staphylococcus aureus, Streptococcus uberis/agalactiae, E. coli. Zellzahl-Limite CH: 350000 Zellen/ml Tankmilch.' },
  { species: 'Rinder', condition: 'Moderhinke (Klauenfaeule)', symptoms: 'Lahmheit, fauler Geruch, Klauenhorn-Abloesung, weisse Belaege', prevention: 'Klauenbad, Klauenpflege alle 6 Monate, trockene Laufflaechen, Sanierungsprogramm bei Bestandesproblem', regulatory_status: 'Zu ueberwachende Tierseuche (bei Schafen strikter)', details: 'Erreger: Dichelobacter nodosus. Problem besonders in feuchten Bedingungen. Auch bei Schafen und Ziegen.' },

  // Schweine
  { species: 'Schweine', condition: 'PRRS (Porzines Reproduktives und Respiratorisches Syndrom)', symptoms: 'Atemwegsprobleme, Aborte, Totgeburten, verminderte Fruchtbarkeit', prevention: 'Schweiz ist PRRS-frei. Strikte Importkontrollen. Quarantaene bei Import.', regulatory_status: 'Zu bekaempfende Tierseuche, Meldepflicht', details: 'PRRS-Freiheit ist wichtiger Statusvorteil der Schweizer Schweinezucht.' },
  { species: 'Schweine', condition: 'Afrikanische Schweinepest (ASP)', symptoms: 'Hohes Fieber, Hautblutungen, Aborte, schneller Tod', prevention: 'Praevention: kein Futter aus Kuechen/Restaurants an Schweine verfuettern, Wildschwein-Monitoring, Biosicherheit auf Betrieb', regulatory_status: 'Hochansteckende Seuche, sofortige Meldepflicht, Tilgung', details: 'ASP noch nicht in der Schweiz (Stand 2026). Notfallplaene vorhanden. Wildschweinguertel in Grenznaehe zu EU-Ausbruchsgebieten.' },
  { species: 'Schweine', condition: 'Salmonellose', symptoms: 'Durchfall, Fieber, bei Sauen: Aborte, Ferkelsterblichkeit', prevention: 'Hygiene, Reinigungs-/Desinfektionsprogramm, Rein-Raus-Verfahren, Futtermittelhygiene', regulatory_status: 'Meldepflicht (Salmonella Enteritidis und Typhimurium)', details: 'Nationales Salmonellen-Bekaempfungsprogramm bei Zuchtbetrieben. IS ABV-Meldung bei Antibiotikabehandlung.' },

  // Gefluegel
  { species: 'Gefluegel', condition: 'Aviäre Influenza (Vogelgrippe)', symptoms: 'Hohes Fieber, Atemwegssymptome, starker Legeabfall, hohe Mortalitaet (hochpathogen)', prevention: 'Aufstallungspflicht bei erhoehtem Risiko (Herbst/Winter, Vogelzug). Biosicherheit: Handewaschen, Schuhwechsel, kein Kontakt mit Wildvoegeln.', regulatory_status: 'Hochansteckende Tierseuche, sofortige Meldepflicht, Sperrzone', details: 'BLV verordnet periodisch Aufstallungspflicht waehrend Vogelzugsaison. Impfung in CH nicht erlaubt (EU-Handelsvorgaben).' },
  { species: 'Gefluegel', condition: 'Salmonellose Gefluegel', symptoms: 'Oft subklinisch bei adulten Tieren, Kueckensterben, verunreinigte Eier', prevention: 'Nationales Salmonellen-Bekaempfungsprogramm: Pflichtuntersuchung aller Legehennenbetriebe >1000 Plaetze. Impfung moeglich.', regulatory_status: 'Meldepflicht (S. Enteritidis, S. Typhimurium), Bestandessanierung', details: 'Schweiz hat tiefe Salmonellen-Praevalenz dank konsequenter Bekaempfung. Eier: Stempelung mit Betriebsnummer obligatorisch.' },
  { species: 'Gefluegel', condition: 'Kokzidiose', symptoms: 'Blutiger Durchfall, Abmagerung, verminderte Leistung', prevention: 'Impfung (Lebendvakzine bei Legehennen), Hygiene, Einstreumanagement', regulatory_status: 'Keine Meldepflicht', details: 'Haeufigste parasitaere Erkrankung beim Gefluegel. Erreger: Eimeria spp. Antiparasitika (Kokzidiostatika) in CH reguliert.' },

  // Schafe
  { species: 'Schafe', condition: 'Moderhinke (Klauenfaeule Schafe)', symptoms: 'Starke Lahmheit, fauler Geruch, Klauenhorn-Abloesung', prevention: 'Klauenbad, Separierung lahmer Tiere, Bestandessanierung (Impfung Footvax), trockene Weide', regulatory_status: 'Zu bekaempfende Tierseuche bei Schafen (TSV Art. 227a, seit 2024)', details: 'Moderhinke bei Schafen seit 2024 meldepflichtig und bekaempfungspflichtig in der Schweiz. Kantonale Bekaempfungsprogramme.' },
  { species: 'Schafe', condition: 'Parasitenbefall (Magen-Darm-Wuermer)', symptoms: 'Abmagerung, Durchfall, Blutarmut, Flaschenhals (Haemonchus)', prevention: 'Weidemanagement (Rotation), gezielte Entwurmung (selektiv, nicht Giesskanne), Weidewechsel nach Behandlung', regulatory_status: 'Keine Meldepflicht', details: 'Magen-Darm-Nematoden: haeufigste Gesundheitsproblem bei Weideschafen. Resistenzen gegen Entwurmungsmittel zunehmend — selektive Behandlung (FEC-Methode).' },

  // Allgemein
  { species: 'Rinder', condition: 'Tuberkulose (Bovine TB)', symptoms: 'Chronischer Husten, Abmagerung, geschwollene Lymphknoten', prevention: 'Schweiz gilt als TB-frei seit 1959. Ueberwachung durch Schlachthofkontrolle (Fleischbeschau). Import nur aus TB-freien Laendern.', regulatory_status: 'Auszurottende Tierseuche, sofortige Meldepflicht', details: 'Sporadische Einzelfaelle durch Import oder Wildtierkontakt. Sofortige Bestandessperre und Untersuchung bei Verdacht.' },
];

const healthColumns = ['species', 'condition', 'symptoms', 'prevention', 'regulatory_status', 'details', 'language', 'jurisdiction'];
batchInsert('animal_health', healthColumns,
  animalHealthData.map(h => [h.species, h.condition, h.symptoms, h.prevention, h.regulatory_status, h.details, 'DE', 'CH'])
);

// ---------------------------------------------------------------------------
// 8. FTS5 Search Index — All data indexed for full-text search
// ---------------------------------------------------------------------------

console.log('Building FTS5 search index...');

// Index welfare standards
const welfareRows = db.all<{ species: string; production_system: string; requirement: string; details: string }>(
  'SELECT species, production_system, requirement, details FROM welfare_standards'
);
for (const row of welfareRows) {
  db.run(
    'INSERT INTO search_index (title, body, species, category, jurisdiction) VALUES (?, ?, ?, ?, ?)',
    [row.requirement, `${row.production_system}: ${row.details}`, row.species, 'Tierschutz/Welfare', 'CH']
  );
}

// Index stocking densities
const stockingRows = db.all<{ species: string; age_class: string; housing_type: string; regulatory_minimum: string }>(
  'SELECT species, age_class, housing_type, regulatory_minimum FROM stocking_densities'
);
for (const row of stockingRows) {
  db.run(
    'INSERT INTO search_index (title, body, species, category, jurisdiction) VALUES (?, ?, ?, ?, ?)',
    [`Besatzdichte ${row.age_class} ${row.housing_type}`, row.regulatory_minimum, row.species, 'Platzbedarf/Besatzdichte', 'CH']
  );
}

// Index housing requirements
const housingRows = db.all<{ species: string; age_class: string; system: string; space: string; ventilation: string; flooring: string; temperature: string }>(
  'SELECT species, age_class, system, space, ventilation, flooring, temperature FROM housing_requirements'
);
for (const row of housingRows) {
  db.run(
    'INSERT INTO search_index (title, body, species, category, jurisdiction) VALUES (?, ?, ?, ?, ?)',
    [
      `Stallbau ${row.age_class} ${row.system}`,
      `Platz: ${row.space}. Lueftung: ${row.ventilation}. Boden: ${row.flooring}. Temperatur: ${row.temperature}`,
      row.species,
      'Stallbau/Housing',
      'CH',
    ]
  );
}

// Index movement rules
const movementRows = db.all<{ species: string; rule_type: string; description: string }>(
  'SELECT species, rule_type, description FROM movement_rules'
);
for (const row of movementRows) {
  db.run(
    'INSERT INTO search_index (title, body, species, category, jurisdiction) VALUES (?, ?, ?, ?, ?)',
    [`${row.rule_type} ${row.species}`, row.description, row.species, 'TVD/Transport/Soemmerung', 'CH']
  );
}

// Index breeds
const breedRows = db.all<{ species: string; name: string; purpose: string; notes: string }>(
  'SELECT species, name, purpose, notes FROM breeds'
);
for (const row of breedRows) {
  db.run(
    'INSERT INTO search_index (title, body, species, category, jurisdiction) VALUES (?, ?, ?, ?, ?)',
    [row.name, `${row.purpose}. ${row.notes}`, row.species, 'Zucht/Rassen', 'CH']
  );
}

// Index feed requirements
const feedRows = db.all<{ species: string; age_class: string; production_stage: string; feed_type: string; notes: string }>(
  'SELECT species, age_class, production_stage, feed_type, notes FROM feed_requirements'
);
for (const row of feedRows) {
  db.run(
    'INSERT INTO search_index (title, body, species, category, jurisdiction) VALUES (?, ?, ?, ?, ?)',
    [`Fuetterung ${row.age_class} ${row.production_stage}`, `${row.feed_type}. ${row.notes}`, row.species, 'Fuetterung/Ernaehrung', 'CH']
  );
}

// Index animal health
const healthRows = db.all<{ species: string; condition: string; symptoms: string; prevention: string; details: string }>(
  'SELECT species, condition, symptoms, prevention, details FROM animal_health'
);
for (const row of healthRows) {
  db.run(
    'INSERT INTO search_index (title, body, species, category, jurisdiction) VALUES (?, ?, ?, ?, ?)',
    [row.condition, `Symptome: ${row.symptoms}. Praevention: ${row.prevention}. ${row.details}`, row.species, 'Tiergesundheit', 'CH']
  );
}

// ---------------------------------------------------------------------------
// 9. Metadata + Coverage
// ---------------------------------------------------------------------------

db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [now]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('build_date', ?)", [now]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('schema_version', '1.0')", []);

// Count records
const counts = {
  welfare_standards: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM welfare_standards') as { c: number }).c,
  stocking_densities: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM stocking_densities') as { c: number }).c,
  housing_requirements: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM housing_requirements') as { c: number }).c,
  movement_rules: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM movement_rules') as { c: number }).c,
  breeds: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM breeds') as { c: number }).c,
  feed_requirements: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM feed_requirements') as { c: number }).c,
  animal_health: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM animal_health') as { c: number }).c,
  search_index: (db.get<{ c: number }>('SELECT COUNT(*) as c FROM search_index') as { c: number }).c,
};

console.log('Ingestion complete:');
console.log(`  welfare_standards: ${counts.welfare_standards}`);
console.log(`  stocking_densities: ${counts.stocking_densities}`);
console.log(`  housing_requirements: ${counts.housing_requirements}`);
console.log(`  movement_rules: ${counts.movement_rules}`);
console.log(`  breeds: ${counts.breeds}`);
console.log(`  feed_requirements: ${counts.feed_requirements}`);
console.log(`  animal_health: ${counts.animal_health}`);
console.log(`  search_index: ${counts.search_index}`);

// Write coverage.json
const coverage = {
  server: 'ch-livestock-mcp',
  jurisdiction: 'CH',
  version: '0.1.0',
  last_ingest: now,
  data: counts,
  tools: 11,
  sources: [
    'TSchV — Tierschutzverordnung (BLV)',
    'DZV — RAUS/BTS-Programme (BLW)',
    'TVD — Tierverkehrsdatenbank (Identitas)',
    'Zuchtorganisationen (Braunvieh Schweiz, swissherdbook, Suisseporcs)',
  ],
};

writeFileSync('data/coverage.json', JSON.stringify(coverage, null, 2) + '\n');
console.log('Written data/coverage.json');

db.close();
console.log('Done.');
