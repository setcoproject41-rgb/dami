import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Structure returned:
// {
//   "Instalasi": {
//     "BC-TR (GALIAN) / BORING MANUAL / ROJOK (DD-BM)": [
//       { "point": "EXCAVATION-0.4", "uom": "meter" },
//       ...
//     ]
//   }
// }

export async function GET(request: NextRequest) {
  try {
    const csvPath = path.join(process.cwd(), 'ACTIVITY.csv');
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'ACTIVITY.csv not found' }, { status: 404 });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');

    const categoriesStructure: Record<string, Record<string, { point: string; uom: string }[]>> = {};
    let currentCategory = '';
    let currentSubCategory = '';
    let currentSubUom = '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(';');
      if (parts.length === 0) continue;

      const cat = parts[0].trim();
      if (cat.startsWith('ACTIVITY') || cat.startsWith('CATEGORY')) continue;

      const sub = parts[1] ? parts[1].trim() : '';
      const pt  = parts[2] ? parts[2].trim() : '';
      const uom = parts[3] ? parts[3].trim().replace('\r', '') : '';

      if (cat) {
        currentCategory = cat;
        currentSubCategory = '';
        currentSubUom = uom || '';
      }
      if (sub) {
        currentSubCategory = sub;
        currentSubUom = uom || currentSubUom;
      }

      if (!currentCategory || !currentSubCategory) continue;

      if (!categoriesStructure[currentCategory]) {
        categoriesStructure[currentCategory] = {};
      }
      if (!categoriesStructure[currentCategory][currentSubCategory]) {
        categoriesStructure[currentCategory][currentSubCategory] = [];
      }

      if (pt && pt !== '-' && pt !== '?') {
        const pointUom = uom || currentSubUom || 'Lot';
        categoriesStructure[currentCategory][currentSubCategory].push({ point: pt, uom: pointUom });
      }
    }

    return NextResponse.json(categoriesStructure);
  } catch (error: any) {
    console.error('Error parsing ACTIVITY.csv:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
