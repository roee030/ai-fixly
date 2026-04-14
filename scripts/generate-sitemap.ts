import * as fs from 'fs';
import * as path from 'path';

// Hardcoded profession keys — keep in sync with src/constants/problemMatrix.ts.
const PROFESSION_KEYS = [
  'plumber', 'electrician', 'hvac_contractor', 'locksmith',
  'home_appliance_repair', 'computer_repair', 'mobile_repair',
  'tv_repair', 'painter', 'cleaning_service', 'moving_company',
  'roofer', 'carpenter', 'gardener', 'seamstress',
  'upholsterer', 'glazier', 'handyman',
  'gas_technician', 'exterminator', 'shutter_technician',
  'waterproofing_specialist', 'tiler', 'plasterer',
  'metalworker', 'solar_water_heater_tech', 'renovator',
  'door_installer', 'security_camera_installer',
] as const;

const BASE_URL = 'https://aifixly.co.il';

function buildSitemapXml(urls: string[]): string {
  const entries = urls
    .map(url => `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

function main() {
  const urls = [
    `${BASE_URL}/`,
    ...PROFESSION_KEYS.map(key => `${BASE_URL}/services/${key}`),
  ];

  const distPath = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  const sitemap = buildSitemapXml(urls);
  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemap, 'utf-8');

  console.log(`Generated sitemap.xml with ${urls.length} URLs`);
}

main();
