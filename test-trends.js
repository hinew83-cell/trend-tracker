const googleTrends = require('@alkalisummer/google-trends-js');

async function test() {
  console.log("Keys:", Object.keys(googleTrends));
  // try {
      geo: 'KR',
      hl: 'ko',
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    });
    console.log("Raw Response Type:", typeof res);
    console.log("Raw Response:");
    const parsed = typeof res === 'string' ? JSON.parse(res) : res;
    console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
