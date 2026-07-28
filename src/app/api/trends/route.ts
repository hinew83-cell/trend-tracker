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

async function fetchEntertainmentNews() {
  try {
    const topicUrl = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko';
    const searchUrl = 'https://news.google.com/rss/search?q=%EC%97%B0%EC%98%88&hl=ko&gl=KR&ceid=KR:ko';
    
    const [topicRes, searchRes] = await Promise.all([
      fetch(topicUrl).catch(() => null),
      fetch(searchUrl).catch(() => null)
    ]);

    const xmls: string[] = [];
    if (topicRes) xmls.push(await topicRes.text());
    if (searchRes) xmls.push(await searchRes.text());

    const allItems: any[] = [];

    xmls.forEach(xml => {
      const itemReg = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemReg.exec(xml)) !== null) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
        const link = linkMatch ? linkMatch[1] : '';
        const pubDate = pubDateMatch ? pubDateMatch[1] : '';
        
        if (!link) continue;
        if (title.includes('운세') || title.includes('띠별')) continue;

        const cleanTitle = title.replace(/\s-\s[^-]+$/, '');
        const sourceMatch = title.match(/\s-\s([^-]+)$/);
        const source = sourceMatch ? sourceMatch[1] : '연예 뉴스';
        const parsedDate = pubDate ? new Date(pubDate) : new Date(0);

        allItems.push({ 
          title: cleanTitle, 
          link, 
          rawDate: parsedDate,
          pubDateStr: parsedDate.getTime() > 0 ? parsedDate.toLocaleDateString('ko-KR') : '',
          source
        });
      }
    });

    // Sort by publication date descending (newest first)
    allItems.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    // Deduplicate by link
    const newsItems: any[] = [];
    const seenLinks = new Set<string>();
    for (const item of allItems) {
      if (newsItems.length >= 100) break;
      if (!seenLinks.has(item.link)) {
        seenLinks.add(item.link);
        newsItems.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDateStr,
          source: item.source
        });
      }
    }

    return newsItems;
  } catch (err) {
    console.error("Fetch entertainment news error:", err);
    return [];
  }
}

async function translateToKorean(text: string): Promise<string> {
  if (!text) return '';
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`);
    if (!res.ok) return text;
    const data = await res.json();
    return data[0][0][0] || text;
  } catch (err) {
    return text;
  }
}

async function fetchGlobalCelebrityNews() {
  try {
    const topicUrl = 'https://news.google.com/rss/topics/CAAqMggKIhrDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnpHZ0pMVWlnQVABFmdjbD1lbnRlcnRhaW5tZW50Kg4IACoqCAowgIKADjD2AToDZW5fVVM?hl=en-US&gl=US&ceid=US:en';
    const searchUrl = 'https://news.google.com/rss/search?q=(actor+OR+actress+OR+singer+OR+popstar+OR+celeb+OR+superstar)+news&hl=en-US&gl=US&ceid=US:en';
    
    const [topicRes, searchRes] = await Promise.all([
      fetch(topicUrl).catch(() => null),
      fetch(searchUrl).catch(() => null)
    ]);

    const xmls: string[] = [];
    if (topicRes) xmls.push(await topicRes.text());
    if (searchRes) xmls.push(await searchRes.text());

    const allItems: any[] = [];
    
    xmls.forEach(xml => {
      const itemReg = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemReg.exec(xml)) !== null) {
        const itemContent = match[1];
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
        const link = linkMatch ? linkMatch[1] : '';
        const pubDate = pubDateMatch ? pubDateMatch[1] : '';
        
        if (!link) continue;
        
        const cleanTitle = title.replace(/\s-\s[^-]+$/, '');
        const sourceMatch = title.match(/\s-\s([^-]+)$/);
        const source = sourceMatch ? sourceMatch[1] : 'Global News';
        const parsedDate = pubDate ? new Date(pubDate) : new Date(0);

        allItems.push({ 
          originalTitle: cleanTitle, 
          link, 
          rawDate: parsedDate,
          pubDateStr: parsedDate.getTime() > 0 ? parsedDate.toLocaleDateString('ko-KR') : '',
          source
        });
      }
    });

    // Sort by publication date descending (newest first)
    allItems.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    // Deduplicate by link
    const newsItems: any[] = [];
    const seenLinks = new Set<string>();
    for (const item of allItems) {
      if (newsItems.length >= 50) break; // Limit to 50 for quick translation
      if (!seenLinks.has(item.link)) {
        seenLinks.add(item.link);
        newsItems.push(item);
      }
    }

    // Translate the titles to Korean in parallel
    const translatedItems = await Promise.all(
      newsItems.map(async (item) => {
        const translatedTitle = await translateToKorean(item.originalTitle);
        return {
          title: translatedTitle,
          link: item.link,
          pubDate: item.pubDateStr,
          source: item.source
        };
      })
    );

    return translatedItems;
  } catch (err) {
    console.error("Fetch global celebrity news error:", err);
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
    
    if (tab === 'global_celebrity') {
      const globalEntNews = await fetchGlobalCelebrityNews();
      return NextResponse.json({ data: globalEntNews });
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
