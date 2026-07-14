const googleTrends = require('@alkalisummer/google-trends-js');

async function test() {
  try {
    const res = await googleTrends.default.dailyTrends({
      geo: 'KR',
      hl: 'ko'
    });
    const parsed = typeof res === 'string' ? JSON.parse(res) : res;
    console.log("Structure of first item:");
    // Print the first item keys and values
    const firstItem = parsed?.data?.[0] || parsed?.[0];
    console.log(JSON.stringify(firstItem, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
