import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface NutrientPlanArgs {
  crop: string;
  soil_type: string;
  altitude_zone?: string;
  previous_crop?: string;
  jurisdiction?: string;
}

export function handleGetNutrientPlan(db: Database, args: NutrientPlanArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const soil = db.get<{ soil_group: number }>(
    'SELECT soil_group FROM soil_types WHERE id = ? OR LOWER(name) = LOWER(?)',
    [args.soil_type, args.soil_type]
  );

  if (!soil) {
    return {
      error: 'not_found',
      message: `Soil type '${args.soil_type}' not found. Use get_soil_classification or list with soil type IDs.`,
    };
  }

  const crop = db.get<{ id: string; name: string }>(
    'SELECT id, name FROM crops WHERE id = ? OR LOWER(name) = LOWER(?)',
    [args.crop, args.crop]
  );

  if (!crop) {
    return {
      error: 'not_found',
      message: `Crop '${args.crop}' not found. Use list_crops to see available crops.`,
    };
  }

  const zone = args.altitude_zone ?? 'talzone';

  let sql = `SELECT * FROM nutrient_recommendations WHERE crop_id = ? AND soil_group = ? AND altitude_zone = ? AND jurisdiction = ?`;
  const params: unknown[] = [crop.id, soil.soil_group, zone, jv.jurisdiction];

  if (args.previous_crop) {
    sql += ' AND (previous_crop_group = ? OR previous_crop_group IS NULL)';
    params.push(args.previous_crop);
  }

  sql += ' LIMIT 1';

  const rec = db.get<{
    n_rec_kg_ha: number;
    p_rec_kg_ha: number;
    k_rec_kg_ha: number;
    mg_rec_kg_ha: number;
    altitude_zone: string;
    previous_crop_group: string;
    notes: string;
    grud_section: string;
  }>(sql, params);

  if (!rec) {
    return {
      error: 'not_found',
      message: `No nutrient recommendation found for ${crop.name} on soil group ${soil.soil_group} in ${zone}.`,
    };
  }

  return {
    crop: crop.name,
    crop_id: crop.id,
    soil_type: args.soil_type,
    soil_group: soil.soil_group,
    altitude_zone: rec.altitude_zone,
    previous_crop: rec.previous_crop_group,
    jurisdiction: jv.jurisdiction,
    recommendation: {
      nitrogen_kg_ha: rec.n_rec_kg_ha,
      phosphate_kg_ha: rec.p_rec_kg_ha,
      potash_kg_ha: rec.k_rec_kg_ha,
      magnesium_kg_ha: rec.mg_rec_kg_ha,
    },
    grud_section: rec.grud_section,
    notes: rec.notes,
    _meta: buildMeta({ source_url: 'https://www.agroscope.admin.ch/agroscope/de/home/themen/pflanzenbau/duengung.html' }),
  };
}
