const urls = [
  'https://api.gdelt.info/api/v2/doc?query=%22technology%22&maxrecords=5&security=med&format=json',
  'https://gdelt.info/api/v2/doc?query=%22technology%22&maxrecords=5&security=med&format=json',
  'https://api.gdelt.io/api/v2/doc?query=%22technology%22&maxrecords=5&security=med&format=json',
  'https://gdelt.info/api/v1/ict',
];

for (const url of urls) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'VUXAI/1.0' } });
    const text = await response.text();
    console.log(`STATUS ${response.status} ${url.slice(0, 70)}... BODY: ${text.slice(0, 200)}`);
  } catch (error) {
    console.log(`FAIL ${url.slice(0, 70)}... -> ${error?.message || String(error)}`);
  }
}
process.exit(0);
