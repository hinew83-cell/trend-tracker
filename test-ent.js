async function test() {
  try {
    const url = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko';
    const res = await fetch(url);
    const xml = await res.text();
    
    // Parse items
    const items = [];
    const itemReg = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemReg.exec(xml)) !== null && items.length < 15) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
      const link = linkMatch ? linkMatch[1] : '';
      const pubDate = pubDateMatch ? pubDateMatch[1] : '';
      
      const cleanTitle = title.replace(/\s-\s[^-]+$/, '');
      items.push({ title: cleanTitle, link, pubDate });
    }
    console.log("Parsed Items:", items.slice(0, 5));
  } catch (err) {
    console.error(err);
  }
}
test();
