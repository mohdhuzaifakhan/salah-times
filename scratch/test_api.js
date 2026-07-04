const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://api.alquran.cloud/v1/page/337/quran-indopak');
    console.log("Surahs keys:", Object.keys(res.data.data.surahs || {}));
  } catch (err) {
    console.error(err);
  }
}

test();
