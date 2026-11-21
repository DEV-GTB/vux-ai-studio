import 'dotenv/config';
import { webSearch } from '../lib/webSearch.js';

for (const query of ['technology', 'India', 'AI']) {
  try {
    const result = await webSearch(query, { maxResults: 3 });
    console.log(`WEB SEARCH "${query}": provider=${result.provider} count=${result.results.length}`);
    for (const r of result.results.slice(0, 3)) console.log('   -', r.title, '|', r.url, '|', r.snippet.slice(0, 80));
  } catch (error) {
    console.log(`WEB SEARCH "${query}": ERROR ${error?.message || String(error)}`);
  }
}
process.exit(0);
