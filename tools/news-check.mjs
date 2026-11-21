import 'dotenv/config';
import { getNewsArticles } from '../lib/liveContext.js';

for (const topic of ['technology', 'India', 'AI', 'business']) {
  try {
    const articles = await getNewsArticles(topic);
    console.log(`TOPIC "${topic}": ${articles.length} articles`);
    for (const a of articles.slice(0, 3)) console.log('   -', a.title, '|', a.source, '|', a.url);
  } catch (error) {
    console.log(`TOPIC "${topic}": ERROR`, error?.message || String(error));
  }
}
process.exit(0);
