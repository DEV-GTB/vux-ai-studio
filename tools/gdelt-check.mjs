import 'dotenv/config';

const GDELT_BASE = 'https://api.gdelt.info/api/v2/doc';

for (const [label, url] of [
  ['with format=json', `${GDELT_BASE}?query=${encodeURIComponent('"technology"')}&maxrecords=5&security=med&format=json`],
  ['without format', `${GDELT_BASE}?query=${encodeURIComponent('"technology"')}&maxrecords=5&security=med`],
]) {
  const response = await fetch(url);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  console.log(`\n=== ${label} ===`);
  console.log('STATUS:', response.status);
  console.log('CONTENT-TYPE:', response.headers.get('content-type'));
  console.log('BODY (first 800):', text.slice(0, 800));
  console.log('PARSED ARTICLES:', Array.isArray(data?.articles) ? data.articles.length : 'not-array');
  process.exit(0);
}
