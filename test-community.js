async function fetchDogdrip() {
  try {
    const url = 'https://www.dogdrip.net/dogdrip';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const matches = [];
    const reg = /href="([^"]*?dogdrip\/[^"]*?)"[^>]*?>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = reg.exec(html)) !== null && matches.length < 10) {
      matches.push({ link: match[1], text: match[2].replace(/<[^>]*?>/g, '').trim() });
    }
    console.log("Dogdrip matches found:", matches);
    return [];
  } catch (err) {
    console.error("Dogdrip error:", err.message);
    return [];
  }
}

async function fetchRuliweb() {
  try {
    const url = 'https://bbs.ruliweb.com/best/board/300143'; // Humor best
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const items = [];
    // Ruliweb best table row parser
    // <a class="subject_link deco" href="https://bbs.ruliweb.com/best/board/300143/read/12345">Title</a>
    const rowRegex = /<a class="subject_link[^"]*?" href="([^"]*?)">([\s\S]*?)<\/a>/g;
    let match;
    while ((match = rowRegex.exec(html)) !== null && items.length < 20) {
      const link = match[1];
      let title = match[2].replace(/<[^>]*?>/g, '').trim();
      title = title.replace(/\s*\[\d+\]$/, ''); // strip comment count
      items.push({ title, link, source: '루리웹 베스트' });
    }
    console.log("Ruliweb Items parsed:", items.length);
    return items;
  } catch (err) {
    console.error("Ruliweb error:", err.message);
    return [];
  }
}

async function test() {
  const d = await fetchDogdrip();
  if (d.length > 0) console.log("Dogdrip Example:", d[0]);
  const r = await fetchRuliweb();
  if (r.length > 0) console.log("Ruliweb Example:", r[0]);
}

test();
