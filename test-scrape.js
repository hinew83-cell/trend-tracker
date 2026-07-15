async function checkRuliweb(keyword) {
  try {
    const url = `https://m.ruliweb.com/search?q=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    // Check if we can find search result counts or items
    console.log("Ruliweb HTML length:", html.length);
    const countMatch = html.match(/전체\s*\((\d+)\)/) || html.match(/검색결과\s*(\d+)건/);
    console.log("Ruliweb match:", countMatch ? countMatch[0] : "Not found");
  } catch (err) {
    console.error("Ruliweb error:", err.message);
  }
}

async function checkTheqoo(keyword) {
  try {
    const url = `https://theqoo.net/index.php?act=is&is_keyword=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    console.log("Theqoo HTML Snippet:", html.substring(0, 500));
  } catch (err) {
    console.error("Theqoo error:", err.message);
  }
}

async function test() {
  await checkRuliweb("아이유");
  await checkTheqoo("아이유");
}
test();
