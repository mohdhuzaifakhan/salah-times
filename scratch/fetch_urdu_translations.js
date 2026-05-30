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
    const translationsRes = await getJson('https://api.quran.com/api/v4/resources/translations');
    const translations = translationsRes.translations || [];
    const urduTranslations = translations.filter(t => t.language_name === 'urdu');
    console.log("Urdu translations:", JSON.stringify(urduTranslations, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
