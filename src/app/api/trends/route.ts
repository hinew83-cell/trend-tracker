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
    const url = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko';
    const res = await fetch(url);
    const xml = await res.text();
    
    const items = [];
    const itemReg = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemReg.exec(xml)) !== null && items.length < 30) {
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

      items.push({ 
        title: cleanTitle, 
        link, 
        pubDate: pubDate ? new Date(pubDate).toLocaleDateString('ko-KR') : '',
        source
      });
    }
    return items;
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
