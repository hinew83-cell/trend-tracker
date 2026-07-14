async function fetchNews(keyword) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(url);
    const xml = await res.text();
    
    // Parse the first <item>'s <title> and <link> using regex
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    if (itemMatch) {
      const itemContent = itemMatch[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
      const link = linkMatch ? linkMatch[1] : '';
      
      // Clean up title (remove source suffix like " - 이데일리")
      const cleanTitle = title.replace(/\s-\s[^-]+$/, '');
      return { title: cleanTitle, link };
    }
  } catch (err) {
    console.error("Fetch news error:", err);
  }
  return null;
}

async function test() {
  const news = await fetchNews("이경실");
  console.log("News:", news);
}

test();
