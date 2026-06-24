import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const csvPath = path.join(process.cwd(), 'ACTIVITY.csv');
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'ACTIVITY.csv not found' }, { status: 404 });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');

    const categoriesStructure: Record<string, Record<string, string[]>> = {};
    let currentCategory = '';
    let currentSubCategory = '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(';');
      if (parts.length === 0) continue;

      const cat = parts[0].trim();
      if (cat.startsWith('ACTIVITY') || cat.startsWith('CATEGORY')) {
        continue;
      }

      const sub = parts[1] ? parts[1].trim() : '';
      const pt = parts[2] ? parts[2].trim() : '';

      if (cat) {
        currentCategory = cat;
      }
      if (sub) {
        currentSubCategory = sub;
      }

      if (!currentCategory || !currentSubCategory) {
        continue;
      }

      if (!categoriesStructure[currentCategory]) {
        categoriesStructure[currentCategory] = {};
      }
      if (!categoriesStructure[currentCategory][currentSubCategory]) {
        categoriesStructure[currentCategory][currentSubCategory] = [];
      }

      if (pt && pt !== '-') {
        categoriesStructure[currentCategory][currentSubCategory].push(pt);
      }
    }

    return NextResponse.json(categoriesStructure);
  } catch (error: any) {
    console.error('Error parsing ACTIVITY.csv:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
