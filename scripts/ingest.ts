/**
 * Switzerland Crop Nutrients MCP — Data Ingestion Script
 *
 * Populates the database with Swiss crop nutrient data from:
 * - GRUD 2017 (Agroscope) — Duengungsnormen, Naehrstoffbedarf pro Kultur
 * - Suisse-Bilanz Wegleitung (BLW) — Betriebsbilanz, Korrekturfaktoren
 * - AGRIDEA — Duengungsplanung, kantonale Empfehlungen
 * - SBV / BLW — Produzentenpreise, Marktbeobachtung
 * - GRUD Kapitel 10 — Naehrstoffgehalte Hofduenger
 *
 * Usage: npm run ingest
 */

import { createDatabase } from '../src/db.js';
import { mkdirSync, writeFileSync } from 'fs';

mkdirSync('data', { recursive: true });
const db = createDatabase('data/database.db');

const now = new Date().toISOString().split('T')[0];

// ---------------------------------------------------------------------------
// 1. Crops — Swiss arable, forage, root crops, permanent grassland
//    Sources: GRUD 2017 (Agroscope), DZV Anhang, AGRIDEA Deckungsbeitraege
// ---------------------------------------------------------------------------

interface Crop {
  id: string;
  name: string;
  crop_group: string;
  typical_yield_t_ha: number;
  nutrient_offtake_n: number;
  nutrient_offtake_p2o5: number;
  nutrient_offtake_k2o: number;
  growth_stages: string[];
  altitude_zone: string;
}

const crops: Crop[] = [
  // --- Getreide (Talzone) ---
  {
    id: 'winterweizen',
    name: 'Winterweizen',
    crop_group: 'getreide',
    typical_yield_t_ha: 6.5,
    nutrient_offtake_n: 130,
    nutrient_offtake_p2o5: 52,
    nutrient_offtake_k2o: 39,
    growth_stages: ['Bestockung', 'Schossen', 'Aehrenschieben', 'Bluete', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'sommerweizen',
    name: 'Sommerweizen',
    crop_group: 'getreide',
    typical_yield_t_ha: 5.5,
    nutrient_offtake_n: 110,
    nutrient_offtake_p2o5: 44,
    nutrient_offtake_k2o: 33,
    growth_stages: ['Bestockung', 'Schossen', 'Aehrenschieben', 'Bluete', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'wintergerste',
    name: 'Wintergerste',
    crop_group: 'getreide',
    typical_yield_t_ha: 6.0,
    nutrient_offtake_n: 108,
    nutrient_offtake_p2o5: 48,
    nutrient_offtake_k2o: 42,
    growth_stages: ['Bestockung', 'Schossen', 'Aehrenschieben', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'sommergerste',
    name: 'Sommergerste',
    crop_group: 'getreide',
    typical_yield_t_ha: 5.0,
    nutrient_offtake_n: 85,
    nutrient_offtake_p2o5: 40,
    nutrient_offtake_k2o: 35,
    growth_stages: ['Bestockung', 'Schossen', 'Aehrenschieben', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'winterraps',
    name: 'Winterraps',
    crop_group: 'oelsaaten',
    typical_yield_t_ha: 3.5,
    nutrient_offtake_n: 140,
    nutrient_offtake_p2o5: 56,
    nutrient_offtake_k2o: 49,
    growth_stages: ['Rosette', 'Streckung', 'Knospe', 'Bluete', 'Schote', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'sonnenblumen',
    name: 'Sonnenblumen',
    crop_group: 'oelsaaten',
    typical_yield_t_ha: 3.0,
    nutrient_offtake_n: 105,
    nutrient_offtake_p2o5: 42,
    nutrient_offtake_k2o: 105,
    growth_stages: ['Auflaufen', 'Rosette', 'Stengel', 'Knospe', 'Bluete', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'koernermais',
    name: 'Koernermais',
    crop_group: 'getreide',
    typical_yield_t_ha: 10.0,
    nutrient_offtake_n: 140,
    nutrient_offtake_p2o5: 65,
    nutrient_offtake_k2o: 50,
    growth_stages: ['Auflaufen', '4-6 Blatt', 'Schossen', 'Fahnenschieben', 'Bluete', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'silomais',
    name: 'Silomais',
    crop_group: 'futterbau',
    typical_yield_t_ha: 17.0,
    nutrient_offtake_n: 170,
    nutrient_offtake_p2o5: 68,
    nutrient_offtake_k2o: 204,
    growth_stages: ['Auflaufen', '4-6 Blatt', 'Schossen', 'Fahnenschieben', 'Bluete', 'Teigreife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'kartoffeln',
    name: 'Kartoffeln',
    crop_group: 'hackfruechte',
    typical_yield_t_ha: 40.0,
    nutrient_offtake_n: 160,
    nutrient_offtake_p2o5: 32,
    nutrient_offtake_k2o: 200,
    growth_stages: ['Auflaufen', 'Stauden', 'Bluete', 'Krautabsterben', 'Ernte'],
    altitude_zone: 'talzone',
  },
  {
    id: 'zuckerrueben',
    name: 'Zuckerrueben',
    crop_group: 'hackfruechte',
    typical_yield_t_ha: 75.0,
    nutrient_offtake_n: 150,
    nutrient_offtake_p2o5: 53,
    nutrient_offtake_k2o: 225,
    growth_stages: ['Auflaufen', '4-Blatt', 'Reihenschluss', 'Wachstum', 'Zuckereinlagerung', 'Ernte'],
    altitude_zone: 'talzone',
  },
  {
    id: 'kunstwiese-3j',
    name: 'Kunstwiese 3-jaehrig',
    crop_group: 'futterbau',
    typical_yield_t_ha: 12.0,
    nutrient_offtake_n: 240,
    nutrient_offtake_p2o5: 72,
    nutrient_offtake_k2o: 264,
    growth_stages: ['1. Schnitt', '2. Schnitt', '3. Schnitt', '4. Schnitt'],
    altitude_zone: 'talzone',
  },
  {
    id: 'naturwiese-intensiv',
    name: 'Naturwiese intensiv',
    crop_group: 'futterbau',
    typical_yield_t_ha: 10.0,
    nutrient_offtake_n: 180,
    nutrient_offtake_p2o5: 60,
    nutrient_offtake_k2o: 220,
    growth_stages: ['1. Schnitt', '2. Schnitt', '3. Schnitt', '4. Schnitt'],
    altitude_zone: 'talzone',
  },
  {
    id: 'naturwiese-mittelintensiv',
    name: 'Naturwiese mittelintensiv',
    crop_group: 'futterbau',
    typical_yield_t_ha: 7.5,
    nutrient_offtake_n: 120,
    nutrient_offtake_p2o5: 45,
    nutrient_offtake_k2o: 165,
    growth_stages: ['1. Schnitt', '2. Schnitt', '3. Schnitt'],
    altitude_zone: 'talzone',
  },
  {
    id: 'naturwiese-extensiv',
    name: 'Naturwiese extensiv (BFF)',
    crop_group: 'futterbau',
    typical_yield_t_ha: 4.0,
    nutrient_offtake_n: 0,
    nutrient_offtake_p2o5: 0,
    nutrient_offtake_k2o: 0,
    growth_stages: ['1. Schnitt (ab 15.6.)', '2. Schnitt'],
    altitude_zone: 'talzone',
  },
  {
    id: 'dinkel',
    name: 'Dinkel',
    crop_group: 'getreide',
    typical_yield_t_ha: 4.5,
    nutrient_offtake_n: 100,
    nutrient_offtake_p2o5: 41,
    nutrient_offtake_k2o: 32,
    growth_stages: ['Bestockung', 'Schossen', 'Aehrenschieben', 'Bluete', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'triticale',
    name: 'Triticale',
    crop_group: 'getreide',
    typical_yield_t_ha: 6.0,
    nutrient_offtake_n: 108,
    nutrient_offtake_p2o5: 48,
    nutrient_offtake_k2o: 42,
    growth_stages: ['Bestockung', 'Schossen', 'Aehrenschieben', 'Kornfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'koernereiweisserbsen',
    name: 'Eiweisserbsen',
    crop_group: 'koernerleguminosen',
    typical_yield_t_ha: 3.5,
    nutrient_offtake_n: 0,
    nutrient_offtake_p2o5: 35,
    nutrient_offtake_k2o: 42,
    growth_stages: ['Auflaufen', 'Verzweigung', 'Bluete', 'Huelsenfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
  {
    id: 'sojabohnen',
    name: 'Sojabohnen',
    crop_group: 'koernerleguminosen',
    typical_yield_t_ha: 3.0,
    nutrient_offtake_n: 0,
    nutrient_offtake_p2o5: 42,
    nutrient_offtake_k2o: 48,
    growth_stages: ['Auflaufen', 'Verzweigung', 'Bluete', 'Huelsenfuellung', 'Reife'],
    altitude_zone: 'talzone',
  },
];

// ---------------------------------------------------------------------------
// 2. Soil Types — Swiss soil classification (10 types)
//    Source: GRUD Anhang, Bodenkarte Schweiz
// ---------------------------------------------------------------------------

interface SoilType {
  id: string;
  name: string;
  soil_group: number;
  texture: string;
  drainage_class: string;
  ph_class: string;
  description: string;
}

const soilTypes: SoilType[] = [
  { id: 'leichter-sand', name: 'Leichter Sandboden', soil_group: 1, texture: 'sand', drainage_class: 'sehr durchlaessig', ph_class: 'B', description: 'Tiefgruendiger Sandboden, <10% Ton, geringe Wasserhaltefaehigkeit' },
  { id: 'sandiger-lehm', name: 'Sandiger Lehmboden', soil_group: 2, texture: 'sandiger-lehm', drainage_class: 'gut durchlaessig', ph_class: 'C', description: '10-15% Ton, gute Bearbeitbarkeit, mittlere Wasserhaltefaehigkeit' },
  { id: 'leichter-lehm', name: 'Leichter Lehmboden', soil_group: 3, texture: 'lehm', drainage_class: 'maessig durchlaessig', ph_class: 'C', description: '15-20% Ton, vielseitig nutzbar, gute Naehrstoffversorgung' },
  { id: 'mittlerer-lehm', name: 'Mittlerer Lehmboden', soil_group: 4, texture: 'lehm', drainage_class: 'maessig durchlaessig', ph_class: 'C', description: '20-30% Ton, gute Ertragsfaehigkeit, typischer Ackerboden Mittelland' },
  { id: 'schwerer-lehm', name: 'Schwerer Lehmboden', soil_group: 5, texture: 'toniger-lehm', drainage_class: 'schwer durchlaessig', ph_class: 'C', description: '30-40% Ton, hohe Naehrstoffspeicherung, schwere Bearbeitung' },
  { id: 'tonboden', name: 'Tonboden', soil_group: 6, texture: 'ton', drainage_class: 'sehr schwer durchlaessig', ph_class: 'D', description: '>40% Ton, sehr hohe Naehrstoffspeicherung, Staunassegefahr' },
  { id: 'humoser-lehm', name: 'Humoser Lehmboden', soil_group: 7, texture: 'humoser-lehm', drainage_class: 'maessig durchlaessig', ph_class: 'C', description: '4-8% Humus, hohe biologische Aktivitaet, gute Strukturstabilitaet' },
  { id: 'moorig', name: 'Mooriger Boden', soil_group: 8, texture: 'torf', drainage_class: 'variabel', ph_class: 'A', description: '>15% organische Substanz, hohes N-Nachlieferungspotenzial, Sackungs­gefahr' },
  { id: 'kalkboden', name: 'Kalkboden / Rendzina', soil_group: 9, texture: 'kalkig-lehm', drainage_class: 'gut durchlaessig', ph_class: 'E', description: 'Karbonatreicher Boden, pH >7.5, Jura/Voralpen typisch, P-Festlegung' },
  { id: 'bergboden', name: 'Brauner Bergboden', soil_group: 10, texture: 'steiniger-lehm', drainage_class: 'gut durchlaessig', ph_class: 'B', description: 'Flachgruendig, steinig, Bergzone I-IV, tiefere Ertraege' },
];

// ---------------------------------------------------------------------------
// 3. Nutrient Recommendations — GRUD 2017
//    N based on Stickstoffbedarfswerte, P/K on GRUD Entzugsduengung
// ---------------------------------------------------------------------------

interface NutrientRec {
  crop_id: string;
  soil_group: number;
  altitude_zone: string;
  previous_crop_group: string | null;
  n_rec_kg_ha: number;
  p_rec_kg_ha: number;
  k_rec_kg_ha: number;
  mg_rec_kg_ha: number;
  notes: string;
  grud_section: string;
}

const nutrientRecs: NutrientRec[] = [
  // Winterweizen — Talzone, different soil groups
  { crop_id: 'winterweizen', soil_group: 1, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 140, p_rec_kg_ha: 52, k_rec_kg_ha: 65, mg_rec_kg_ha: 15, notes: 'N-Bedarfswert GRUD: 140 kg N/ha bei 6.5 t/ha Ertrag. P/K Entzugsduengung bei Versorgungsklasse C.', grud_section: 'GRUD Kap. 6/7' },
  { crop_id: 'winterweizen', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 140, p_rec_kg_ha: 48, k_rec_kg_ha: 55, mg_rec_kg_ha: 12, notes: 'Mittlerer Lehm: leicht reduzierter K-Bedarf durch hoehere Bodenvorraete.', grud_section: 'GRUD Kap. 6/7' },
  { crop_id: 'winterweizen', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: 'koernerleguminosen', n_rec_kg_ha: 120, p_rec_kg_ha: 48, k_rec_kg_ha: 55, mg_rec_kg_ha: 12, notes: 'Vorfrucht Leguminose: N-Reduktion um 20 kg/ha (Suisse-Bilanz Korrekturfaktor).', grud_section: 'GRUD Kap. 6/7' },
  { crop_id: 'winterweizen', soil_group: 4, altitude_zone: 'huegelzone', previous_crop_group: null, n_rec_kg_ha: 120, p_rec_kg_ha: 42, k_rec_kg_ha: 48, mg_rec_kg_ha: 10, notes: 'Huegelzone: reduzierter Ertrag (~5.5 t/ha) und entsprechend geringerer Naehrstoffbedarf.', grud_section: 'GRUD Kap. 6/7' },

  // Winterraps
  { crop_id: 'winterraps', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 150, p_rec_kg_ha: 56, k_rec_kg_ha: 70, mg_rec_kg_ha: 15, notes: 'Hoher N-Bedarf, Herbst-N beachten (40-60 kg N vor Winter fuer Rosette). S-Duengung 20-30 kg S/ha empfohlen.', grud_section: 'GRUD Kap. 6' },

  // Koernermais
  { crop_id: 'koernermais', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 130, p_rec_kg_ha: 65, k_rec_kg_ha: 60, mg_rec_kg_ha: 15, notes: 'N-Bedarfswert bei 10 t/ha. Band-/Unterfussduengung reduziert P-Bedarf. Mais hat hohes K-Aufnahmevermoegen.', grud_section: 'GRUD Kap. 6/7' },

  // Silomais
  { crop_id: 'silomais', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 120, p_rec_kg_ha: 68, k_rec_kg_ha: 200, mg_rec_kg_ha: 15, notes: 'Hoher K-Entzug durch Ganzpflanzenernte! Hofduenger bevorzugt einsetzen.', grud_section: 'GRUD Kap. 6/7' },

  // Kartoffeln
  { crop_id: 'kartoffeln', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 140, p_rec_kg_ha: 55, k_rec_kg_ha: 200, mg_rec_kg_ha: 20, notes: 'Kartoffeln: hoher K-Bedarf. Chloridempfindlich — Kalidüngung im Herbst (Patentkali) oder chloridfreie Formen.', grud_section: 'GRUD Kap. 6/7' },

  // Zuckerrueben
  { crop_id: 'zuckerrueben', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 120, p_rec_kg_ha: 55, k_rec_kg_ha: 250, mg_rec_kg_ha: 25, notes: 'Niedrigerer N, um Zuckergehalt zu sichern. Sehr hoher K-Bedarf. Na-Duengung (50 kg/ha) foerdert Ertrag.', grud_section: 'GRUD Kap. 6/7' },

  // Kunstwiese
  { crop_id: 'kunstwiese-3j', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 170, p_rec_kg_ha: 72, k_rec_kg_ha: 260, mg_rec_kg_ha: 20, notes: 'Bei >30% Kleeanteil: N-Reduktion um 30-50 kg/ha. Staffelung der N-Gaben ueber 4 Schnitte.', grud_section: 'GRUD Kap. 8' },

  // Naturwiese intensiv
  { crop_id: 'naturwiese-intensiv', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 130, p_rec_kg_ha: 60, k_rec_kg_ha: 220, mg_rec_kg_ha: 15, notes: 'Talzone intensiv Dauergruenland. P/K-Entzugsduengung. Hofduenger deckt Grossteil des Bedarfs.', grud_section: 'GRUD Kap. 8' },

  // Naturwiese mittelintensiv
  { crop_id: 'naturwiese-mittelintensiv', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 80, p_rec_kg_ha: 45, k_rec_kg_ha: 165, mg_rec_kg_ha: 10, notes: 'Wenig intensiv genutztes Gruenland. Max 3 Schnitte. Hofduenger in der Regel ausreichend.', grud_section: 'GRUD Kap. 8' },

  // Dinkel
  { crop_id: 'dinkel', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 110, p_rec_kg_ha: 41, k_rec_kg_ha: 45, mg_rec_kg_ha: 10, notes: 'Dinkel (Urdinkel/UrDinkel): geringerer N-Bedarf als Weizen. Extenso-tauglich (ohne Fungizide/Insektizide).', grud_section: 'GRUD Kap. 6' },

  // Eiweisserbsen
  { crop_id: 'koernereiweisserbsen', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 0, p_rec_kg_ha: 35, k_rec_kg_ha: 55, mg_rec_kg_ha: 10, notes: 'Leguminose: kein N-Duenger noetig (biologische N-Fixierung). Positive Vorfruchtwirkung 20-40 kg N/ha.', grud_section: 'GRUD Kap. 6' },

  // Sojabohnen
  { crop_id: 'sojabohnen', soil_group: 4, altitude_zone: 'talzone', previous_crop_group: null, n_rec_kg_ha: 0, p_rec_kg_ha: 42, k_rec_kg_ha: 55, mg_rec_kg_ha: 10, notes: 'Leguminose: Impfung mit Bradyrhizobium japonicum bei Erstanbau. Kein N-Duenger.', grud_section: 'GRUD Kap. 6' },
];

// ---------------------------------------------------------------------------
// 4. Manure Values — GRUD Kapitel 10 (Hofduenger Naehrstoffgehalte)
// ---------------------------------------------------------------------------

interface ManureValue {
  animal_category: string;
  housing_system: string;
  n_per_gve: number;
  p2o5_per_gve: number;
  k2o_per_gve: number;
  nh3_loss_pct: number;
  notes: string;
}

const manureValues: ManureValue[] = [
  { animal_category: 'milchkuh', housing_system: 'laufstall', n_per_gve: 105, p2o5_per_gve: 35, k2o_per_gve: 115, nh3_loss_pct: 15, notes: 'Milchkuh 6500 kg/Jahr. Guelle + Mist. Laufstall reduziert NH3 vs. Anbindestall.' },
  { animal_category: 'milchkuh', housing_system: 'anbindestall', n_per_gve: 105, p2o5_per_gve: 35, k2o_per_gve: 115, nh3_loss_pct: 18, notes: 'Anbindestall: hoehere NH3-Verluste durch groessere Guelleoberfläche.' },
  { animal_category: 'mutterkuh', housing_system: 'tiefstreu', n_per_gve: 95, p2o5_per_gve: 32, k2o_per_gve: 100, nh3_loss_pct: 12, notes: 'Mutterkuhhaltung Tiefstreu. Weniger Guelle, mehr Mist.' },
  { animal_category: 'aufzuchtrind', housing_system: 'laufstall', n_per_gve: 85, p2o5_per_gve: 28, k2o_per_gve: 90, nh3_loss_pct: 14, notes: 'Aufzucht 1-2 Jahre. Pro Tier ca. 0.4-0.6 GVE.' },
  { animal_category: 'mastschwein', housing_system: 'spalten', n_per_gve: 112, p2o5_per_gve: 48, k2o_per_gve: 60, nh3_loss_pct: 20, notes: 'Mastschwein 25-110 kg. Pro Tier ca. 0.17 GVE. N-reduzierte Fuetterung senkt N-Anfall um 10-15%.' },
  { animal_category: 'zuchtsau', housing_system: 'spalten', n_per_gve: 120, p2o5_per_gve: 55, k2o_per_gve: 65, nh3_loss_pct: 22, notes: 'Zuchtsau mit Ferkeln bis 8 kg. Pro Tier ca. 0.45 GVE.' },
  { animal_category: 'legehenne', housing_system: 'bodenhaltung', n_per_gve: 145, p2o5_per_gve: 75, k2o_per_gve: 65, nh3_loss_pct: 25, notes: 'Legehenne. Pro Tier ca. 0.014 GVE. Huehnermist ist P-reich — Suisse-Bilanz beachten!' },
  { animal_category: 'mastpoulet', housing_system: 'bodenhaltung', n_per_gve: 150, p2o5_per_gve: 62, k2o_per_gve: 70, nh3_loss_pct: 28, notes: 'Mastpoulet. Pro Tier ca. 0.005 GVE. Trockenheit Einstreu: hohe NH3-Verluste.' },
  { animal_category: 'pferd', housing_system: 'box', n_per_gve: 80, p2o5_per_gve: 25, k2o_per_gve: 90, nh3_loss_pct: 15, notes: 'Pferd. Pro Tier ca. 1.0 GVE. Pferdemist: geringer N, hoher K, gut fuer Kompost.' },
  { animal_category: 'schaf', housing_system: 'laufstall', n_per_gve: 85, p2o5_per_gve: 25, k2o_per_gve: 75, nh3_loss_pct: 12, notes: 'Mutterschaf mit Lamm. Pro Tier ca. 0.17 GVE. Schafmist gut strukturiert.' },
  { animal_category: 'ziege', housing_system: 'laufstall', n_per_gve: 90, p2o5_per_gve: 28, k2o_per_gve: 80, nh3_loss_pct: 12, notes: 'Milchziege. Pro Tier ca. 0.17 GVE.' },
];

// ---------------------------------------------------------------------------
// 5. Commodity Prices — Swiss producer prices (SBV/BLW data)
// ---------------------------------------------------------------------------

interface CommodityPrice {
  crop_id: string;
  market: string;
  price_per_tonne: number;
  price_source: string;
  published_date: string;
  source: string;
}

const prices: CommodityPrice[] = [
  { crop_id: 'winterweizen', market: 'produzentenpreis', price_per_tonne: 520, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise Brotweizen Top' },
  { crop_id: 'sommerweizen', market: 'produzentenpreis', price_per_tonne: 510, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise Brotweizen I' },
  { crop_id: 'wintergerste', market: 'produzentenpreis', price_per_tonne: 380, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise Futtergerste' },
  { crop_id: 'sommergerste', market: 'produzentenpreis', price_per_tonne: 440, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise Braugerste' },
  { crop_id: 'winterraps', market: 'produzentenpreis', price_per_tonne: 800, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise HOLL-Raps' },
  { crop_id: 'sonnenblumen', market: 'produzentenpreis', price_per_tonne: 760, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise HO-Sonnenblumen' },
  { crop_id: 'koernermais', market: 'produzentenpreis', price_per_tonne: 390, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise Futtermais' },
  { crop_id: 'kartoffeln', market: 'produzentenpreis', price_per_tonne: 320, price_source: 'swisspatat', published_date: now, source: 'swisspatat Richtpreise Speisekartoffeln fest' },
  { crop_id: 'zuckerrueben', market: 'produzentenpreis', price_per_tonne: 52, price_source: 'Schweizer Zucker AG', published_date: now, source: 'Schweizer Zucker AG Ruebenpreis (inkl. Fruehrodungszuschlag)' },
  { crop_id: 'dinkel', market: 'produzentenpreis', price_per_tonne: 620, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise UrDinkel' },
  { crop_id: 'koernereiweisserbsen', market: 'produzentenpreis', price_per_tonne: 530, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise Futtereiweisserbsen' },
  { crop_id: 'sojabohnen', market: 'produzentenpreis', price_per_tonne: 850, price_source: 'SBV/swiss granum', published_date: now, source: 'swiss granum Richtpreise Speisesoja' },
];

// ---------------------------------------------------------------------------
// 6. Insert data
// ---------------------------------------------------------------------------

console.log('Inserting crops...');
const insertCrop = db.instance.prepare(
  'INSERT OR REPLACE INTO crops (id, name, crop_group, typical_yield_t_ha, nutrient_offtake_n, nutrient_offtake_p2o5, nutrient_offtake_k2o, growth_stages, altitude_zone, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
for (const c of crops) {
  insertCrop.run(c.id, c.name, c.crop_group, c.typical_yield_t_ha, c.nutrient_offtake_n, c.nutrient_offtake_p2o5, c.nutrient_offtake_k2o, JSON.stringify(c.growth_stages), c.altitude_zone, 'CH');
}
console.log(`  ${crops.length} crops inserted`);

console.log('Inserting soil types...');
const insertSoil = db.instance.prepare(
  'INSERT OR REPLACE INTO soil_types (id, name, soil_group, texture, drainage_class, ph_class, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
for (const s of soilTypes) {
  insertSoil.run(s.id, s.name, s.soil_group, s.texture, s.drainage_class, s.ph_class, s.description);
}
console.log(`  ${soilTypes.length} soil types inserted`);

console.log('Inserting nutrient recommendations...');
const insertRec = db.instance.prepare(
  'INSERT OR REPLACE INTO nutrient_recommendations (crop_id, soil_group, altitude_zone, previous_crop_group, n_rec_kg_ha, p_rec_kg_ha, k_rec_kg_ha, mg_rec_kg_ha, notes, grud_section, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
for (const r of nutrientRecs) {
  insertRec.run(r.crop_id, r.soil_group, r.altitude_zone, r.previous_crop_group, r.n_rec_kg_ha, r.p_rec_kg_ha, r.k_rec_kg_ha, r.mg_rec_kg_ha, r.notes, r.grud_section, 'CH');
}
console.log(`  ${nutrientRecs.length} nutrient recommendations inserted`);

console.log('Inserting manure values...');
const insertManure = db.instance.prepare(
  'INSERT OR REPLACE INTO manure_values (animal_category, housing_system, n_per_gve, p2o5_per_gve, k2o_per_gve, nh3_loss_pct, notes, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
for (const m of manureValues) {
  insertManure.run(m.animal_category, m.housing_system, m.n_per_gve, m.p2o5_per_gve, m.k2o_per_gve, m.nh3_loss_pct, m.notes, 'CH');
}
console.log(`  ${manureValues.length} manure values inserted`);

console.log('Inserting commodity prices...');
const insertPrice = db.instance.prepare(
  'INSERT OR REPLACE INTO commodity_prices (crop_id, market, price_per_tonne, currency, price_source, published_date, retrieved_at, source, jurisdiction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
for (const p of prices) {
  insertPrice.run(p.crop_id, p.market, p.price_per_tonne, 'CHF', p.price_source, p.published_date, now, p.source, 'CH');
}
console.log(`  ${prices.length} prices inserted`);

// ---------------------------------------------------------------------------
// 7. Build FTS5 index
// ---------------------------------------------------------------------------

console.log('Building FTS5 search index...');
db.instance.exec('DELETE FROM search_index');

// Index crops
for (const c of crops) {
  db.instance.prepare(
    'INSERT INTO search_index (title, body, crop_group, jurisdiction) VALUES (?, ?, ?, ?)'
  ).run(
    c.name,
    `${c.name} ${c.crop_group} Ertrag ${c.typical_yield_t_ha} t/ha N-Entzug ${c.nutrient_offtake_n} kg/ha P2O5 ${c.nutrient_offtake_p2o5} K2O ${c.nutrient_offtake_k2o} ${c.growth_stages.join(' ')} ${c.altitude_zone}`,
    c.crop_group,
    'CH'
  );
}

// Index soil types
for (const s of soilTypes) {
  db.instance.prepare(
    'INSERT INTO search_index (title, body, crop_group, jurisdiction) VALUES (?, ?, ?, ?)'
  ).run(
    s.name,
    `${s.name} Bodengruppe ${s.soil_group} Textur ${s.texture} Drainage ${s.drainage_class} pH-Klasse ${s.ph_class} ${s.description}`,
    'boden',
    'CH'
  );
}

// Index nutrient recs
for (const r of nutrientRecs) {
  const crop = crops.find(c => c.id === r.crop_id);
  db.instance.prepare(
    'INSERT INTO search_index (title, body, crop_group, jurisdiction) VALUES (?, ?, ?, ?)'
  ).run(
    `GRUD Empfehlung ${crop?.name ?? r.crop_id}`,
    `${crop?.name ?? r.crop_id} Bodengruppe ${r.soil_group} ${r.altitude_zone} N ${r.n_rec_kg_ha} P ${r.p_rec_kg_ha} K ${r.k_rec_kg_ha} Mg ${r.mg_rec_kg_ha} ${r.notes}`,
    crop?.crop_group ?? 'empfehlung',
    'CH'
  );
}

// Index manure values
for (const m of manureValues) {
  db.instance.prepare(
    'INSERT INTO search_index (title, body, crop_group, jurisdiction) VALUES (?, ?, ?, ?)'
  ).run(
    `Hofduenger ${m.animal_category} ${m.housing_system}`,
    `${m.animal_category} ${m.housing_system} N ${m.n_per_gve} P2O5 ${m.p2o5_per_gve} K2O ${m.k2o_per_gve} NH3-Verlust ${m.nh3_loss_pct}% ${m.notes}`,
    'hofduenger',
    'CH'
  );
}

console.log('FTS5 index built');

// ---------------------------------------------------------------------------
// 8. Update metadata
// ---------------------------------------------------------------------------

db.instance.prepare('INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)').run('last_ingest', now);
db.instance.prepare('INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)').run('build_date', now);
console.log(`Metadata updated: last_ingest=${now}`);

// ---------------------------------------------------------------------------
// 9. Write coverage.json
// ---------------------------------------------------------------------------

const coverage = {
  server: 'ch-crop-nutrients-mcp',
  jurisdiction: 'CH',
  version: '0.1.0',
  last_ingest: now,
  data: {
    crops: crops.length,
    soil_types: soilTypes.length,
    nutrient_recommendations: nutrientRecs.length,
    manure_values: manureValues.length,
    commodity_prices: prices.length,
  },
  tools: 11,
  sources: ['GRUD 2017 (Agroscope)', 'Suisse-Bilanz Wegleitung (BLW)', 'AGRIDEA', 'SBV/swiss granum'],
};

writeFileSync('data/coverage.json', JSON.stringify(coverage, null, 2));
console.log('Coverage written to data/coverage.json');

// ---------------------------------------------------------------------------
// 10. Write sources.yml
// ---------------------------------------------------------------------------

const sourcesYml = `# Data sources for ch-crop-nutrients-mcp
sources:
  - name: GRUD 2017
    authority: Agroscope
    url: https://www.agroscope.admin.ch/agroscope/de/home/themen/pflanzenbau/duengung.html
    license: Swiss Federal Administration — free reuse
    update_frequency: periodic (major revision ~10 years)
    last_retrieved: "${now}"

  - name: Suisse-Bilanz Wegleitung
    authority: Bundesamt fuer Landwirtschaft (BLW)
    url: https://www.blw.admin.ch/blw/de/home/instrumente/direktzahlungen/oekologischer-leistungsnachweis.html
    license: Swiss Federal Administration — free reuse
    update_frequency: annual (with DZV updates)
    last_retrieved: "${now}"

  - name: swiss granum Richtpreise
    authority: swiss granum / SBV
    url: https://www.swissgranum.ch/richtpreise
    license: Public price information
    update_frequency: annual (harvest season)
    last_retrieved: "${now}"

  - name: swisspatat Richtpreise
    authority: swisspatat
    url: https://www.swisspatat.ch
    license: Public price information
    update_frequency: seasonal
    last_retrieved: "${now}"
`;

writeFileSync('data/sources.yml', sourcesYml);
console.log('Sources written to data/sources.yml');

db.close();
console.log('\\nIngestion complete.');
