import { NextResponse } from 'next/server';
import googleTrends from '@alkalisummer/google-trends-js';

async function fetchNews(keyword: string) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(url);
    const xml = await res.text();
    
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    if (itemMatch) {
      const itemContent = itemMatch[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
      const link = linkMatch ? linkMatch[1] : '';
      
      const cleanTitle = title.replace(/\s-\s[^-]+$/, '');
      return { title: cleanTitle, link };
    }
  } catch (err) {
    console.error("Fetch news error for keyword " + keyword, err);
  }
  return null;
}

async function fetchRuliweb() {
  try {
    const url = 'https://bbs.ruliweb.com/best/board/300143';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const items = [];
    const rowRegex = /<a class="subject_link[^"]*?" href="([^"]*?)">([\s\S]*?)<\/a>/g;
    let match;
    while ((match = rowRegex.exec(html)) !== null && items.length < 30) {
      const link = match[1];
      let title = match[2].replace(/<[^>]*?>/g, '').trim();
      title = title.replace(/\s*\[\d+\]$/, '');
      items.push({ title, link, source: '루리웹 베스트' });
    }
    return items;
  } catch (err) {
    console.error("Fetch Ruliweb error:", err);
    return [];
  }
}

async function fetchDogdrip() {
  try {
    const url = 'https://www.dogdrip.net/dogdrip';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const items = [];
    const reg = /href="([^"]*?dogdrip\/[^"]*?)"[^>]*?>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = reg.exec(html)) !== null && items.length < 35) {
      const link = match[1];
      let text = match[2].replace(/<[^>]*?>/g, '').trim();
      text = text.replace(/\s*\[\d+\]$/, '');
      if (text && !text.includes('RSS') && !text.includes('dataLayer') && !text.includes('Config')) {
        const fullLink = link.startsWith('http') ? link : `https://www.dogdrip.net${link}`;
        items.push({ title: text, link: fullLink, source: '개드립' });
      }
    }
    return items;
  } catch (err) {
    console.error("Fetch Dogdrip error:", err);
    return [];
  }
}

async function fetchEntertainmentNews() {
  try {
    const url = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko';
    const res = await fetch(url);
    const xml = await res.text();
    
    const newsItems: any[] = [];
    const itemReg = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemReg.exec(xml)) !== null && newsItems.length < 25) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
      const link = linkMatch ? linkMatch[1] : '';
      const pubDate = pubDateMatch ? pubDateMatch[1] : '';
      
      const cleanTitle = title.replace(/\s-\s[^-]+$/, '');
      const sourceMatch = title.match(/\s-\s([^-]+)$/);
      const source = sourceMatch ? sourceMatch[1] : '연예 뉴스';

      newsItems.push({ 
        title: cleanTitle, 
        link, 
        pubDate: pubDate ? new Date(pubDate).toLocaleDateString('ko-KR') : '',
        source
      });
    }

    // Extract search keywords from these news items to filter community posts
    const keywords = newsItems.map(item => {
      // Clean news prefix
      const clean = item.title.replace(/^\[[^\]]+\]\s*/, '').replace(/^\([^)]+\)\s*/, '');
      const firstWord = clean.split(/[,\s·'"`\[\]]/)[0];
      return firstWord.replace(/[^가-힣a-zA-Z0-9]/g, '').trim();
    }).filter(k => k.length >= 2); // Avoid very short keywords

    // Fetch community hot posts in parallel
    const [ruliwebPosts, dogdripPosts] = await Promise.all([
      fetchRuliweb(),
      fetchDogdrip()
    ]);

    const communityPosts = [...ruliwebPosts, ...dogdripPosts];
    const matchedCommunityItems: any[] = [];

    // Filter community posts that match our news keywords
    communityPosts.forEach(post => {
      const isMatch = keywords.some(kw => post.title.includes(kw));
      if (isMatch) {
        matchedCommunityItems.push({
          title: post.title,
          link: post.link,
          pubDate: new Date().toLocaleDateString('ko-KR'),
          source: post.source,
          isCommunity: true
        });
      }
    });

    // Merge news and community posts by interleaving them
    const mergedList: any[] = [];
    newsItems.forEach(news => {
      mergedList.push(news);
      
      // Extract name of celebrity from this news item
      const clean = news.title.replace(/^\[[^\]]+\]\s*/, '').replace(/^\([^)]+\)\s*/, '');
      const name = clean.split(/[,\s·'"`\[\]]/)[0].replace(/[^가-힣a-zA-Z0-9]/g, '').trim();

      if (name.length >= 2) {
        // Find community posts matching this specific celebrity
        const relatedCommunity = matchedCommunityItems.filter(post => 
          post.title.includes(name) && !mergedList.some(item => item.link === post.link)
        );
        mergedList.push(...relatedCommunity);
      }
    });

    return mergedList;
  } catch (err) {
    console.error("Fetch entertainment news error:", err);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const geo = searchParams.get('geo') || 'KR'; // Default to South Korea
  const timeRange = searchParams.get('timeRange') || '1y';
  const tab = searchParams.get('tab');

  try {
    if (tab === 'celebrity') {
      const entNews = await fetchEntertainmentNews();
      return NextResponse.json({ data: entNews });
    }

    let result;
    if (!keyword) {
      // If no keyword, fetch daily trends
      result = await googleTrends.dailyTrends({ geo, hl: 'ko' });
    } else {
      // If keyword provided, fetch interest over time
      let startTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1y default
      if (timeRange === '1m') {
        startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 1 month
      } else if (timeRange === '1d') {
        startTime = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day
      }

      result = await googleTrends.interestOverTime({
        keyword,
        geo,
        hl: 'ko',
        startTime,
        ...(timeRange === '1d' ? { granularTimeResolution: true } : {})
      } as any);
    }
    
    // google-trends-api sometimes returns string, sometimes object
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    
    if (parsedResult && parsedResult.error) {
      console.error("Google Trends API Inner Error:", parsedResult.error);
      return NextResponse.json(
        { error: "구글 트렌드 서비스가 현재 요청을 거부했습니다. 잠시 후 다시 시도해 주세요. (일시적인 차단)" },
        { status: 429 }
      );
    }

    // If it's a daily trends request, attach news for the top 5 keywords
    if (!keyword && parsedResult && (parsedResult.data || Array.isArray(parsedResult))) {
      const list = parsedResult.data || parsedResult;
      const listWithNews = await Promise.all(
        list.map(async (item: any, index: number) => {
          if (index < 5) {
            const news = await fetchNews(item.keyword);
            return { ...item, news };
          }
          return item;
        })
      );
      if (parsedResult.data) {
        parsedResult.data = listWithNews;
      } else {
        return NextResponse.json(listWithNews);
      }
    }

    console.log(`Trends API returned for keyword ${keyword}:`, JSON.stringify(parsedResult).substring(0, 500));
    return NextResponse.json(parsedResult);
    
  } catch (error: any) {
    console.error("Google Trends API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
