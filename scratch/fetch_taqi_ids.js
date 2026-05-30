const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log("Fetching translations...");
    const translationsRes = await getJson('https://api.quran.com/api/v4/resources/translations');
    const translations = translationsRes.translations || [];
    const taqiTranslations = translations.filter(t => 
      t.author_name.toLowerCase().includes('taqi') || 
      t.name.toLowerCase().includes('taqi')
    );
    console.log("Mufti Taqi Usmani translations found:", JSON.stringify(taqiTranslations, null, 2));

    console.log("\nFetching tafsirs...");
    const tafsirsRes = await getJson('https://api.quran.com/api/v4/resources/tafsirs');
    const tafsirs = tafsirsRes.tafsirs || [];
    const taqiTafsirs = tafsirs.filter(t => 
      t.author_name.toLowerCase().includes('taqi') || 
      t.name.toLowerCase().includes('taqi')
    );
    console.log("Mufti Taqi Usmani Tafsirs found:", JSON.stringify(taqiTafsirs, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
