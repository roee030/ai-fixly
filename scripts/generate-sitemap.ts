import * as fs from 'fs';
import * as path from 'path';

/**
 * Read the full profession list from the single source of truth
 * (src/constants/problemMatrix.ts) so new professions automatically end up
 * in the sitemap without a second manual list to keep in sync.
 */
function readProfessionKeys(): string[] {
  const matrixPath = path.resolve(__dirname, '..', 'src', 'constants', 'problemMatrix.ts');
  const source = fs.readFileSync(matrixPath, 'utf-8');
  // Match every line in the PROFESSIONS array that has `key: '...'`.
  const matches = source.matchAll(/key:\s*'([a-z_]+)'/g);
  const keys = new Set<string>();
  for (const m of matches) keys.add(m[1]);
  return Array.from(keys);
}

const BASE_URL = 'https://ai-fixly-web.pages.dev';

function buildSitemapXml(urls: Array<{ loc: string; changefreq: string; priority?: string }>): string {
  const entries = urls
    .map(({ loc, changefreq, priority }) => {
      const prio = priority ? `\n    <priority>${priority}</priority>` : '';
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>${prio}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

function main() {
  const professionKeys = readProfessionKeys();

  const urls = [
    { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/join`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${BASE_URL}/legal/terms`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${BASE_URL}/legal/privacy`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${BASE_URL}/legal/accessibility`, changefreq: 'yearly', priority: '0.3' },
    ...professionKeys.map((key) => ({
      loc: `${BASE_URL}/services/${key}`,
      changefreq: 'weekly',
      priority: '0.9',
    })),
  ];

  const distPath = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) fs.mkdirSync(distPath, { recursive: true });

  fs.writeFileSync(path.join(distPath, 'sitemap.xml'), buildSitemapXml(urls), 'utf-8');

  // Minimal robots.txt pointing to the sitemap and allowing crawl.
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /(dev)\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;
  fs.writeFileSync(path.join(distPath, 'robots.txt'), robots, 'utf-8');

  console.log(`Generated sitemap.xml with ${urls.length} URLs (${professionKeys.length} professions)`);
  console.log(`Generated robots.txt`);
}

main();
