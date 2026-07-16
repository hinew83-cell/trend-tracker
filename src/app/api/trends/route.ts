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

const SURNAMES = '김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허소남심노하곽성차구우민지나임라변';
const EXCLUDED_WORDS = new Set([
  '유튜버', '유튜브', '이유', '일반', '인기', '정부', '전문', '조사', '정치', '사회', '문화', 
  '한국', '미국', '일본', '중국', '경기', '경찰', '사건', '사고', '가족', '부모', '자식', 
  '의사', '법원', '검찰', '감독', '선수', '방송', '예능', '영화', '드라마', '뉴스', '오늘', 
  '내일', '어제', '하루', '시간', '올해', '내년', '이번', '지난', '다음', '최근', '캐릭터',
  '축구', '야구', '농구', '배구', '골프', '테니스', '수영', '올림픽', '월드컵', '대표팀',
  '이름', '얼굴', '나이', '결혼', '이혼', '사랑', '친구', '사람', '우리', '나라', '세계',
  '대통령', '시장', '군수', '의원', '비서', '직원', '사장', '회사', '기업', '주식', '투자',
  '운세', '오늘의운세', '띠별운세', '띠별', '화제', '논란', '이슈'
]);

const FAMOUS_CELEBS = new Set([
  '아이유', 'IU', '선미', '수지', '카리나', '윈터', '닝닝', '지젤', '장원영', '안유진', '레이', '리즈', '이서', '가을',
  '민지', '하니', '해린', '다니엘', '혜인', '제니', '지수', '로제', '리사', '태연', '윤아', '유리', '수영', '효연', '써니', '티파니', '서현',
  '화사', '솔라', '문별', '휘인', '조이', '아이린', '슬기', '웬디', '예리', '사나', '모모', '미나', '나연', '정연', '지효', '다현', '채영', '쯔위',
  '뉴진스', '아이브', '에스파', '르세라핌', '블랙핑크', '트와이스', '레드벨벳', '소녀시대', '방탄소년단', 'BTS', '세븐틴', '라이즈', '투어스',
  '손흥민', '류현진', '이강인', '김민재', '페이커', '김연아', '이정후', '황희찬', '조규성', '오상욱', '신유빈', '안세영',
  '유재석', '강호동', '신동엽', '전현무', '김성주', '안정환', '서장훈', '김희철', '탁재훈', '이상민', '임영웅', '영탁', '이찬원', '장민호', '정동원'
]);

function isCelebrity(word: string): boolean {
  if (!word || word.length < 2 || word.length > 5) return false;
  if (EXCLUDED_WORDS.has(word)) return false;
  if (FAMOUS_CELEBS.has(word)) return true;
  
  if (/^[가-힣]{2,4}$/.test(word)) {
    const surname = word.charAt(0);
    if (SURNAMES.includes(surname)) {
      return true;
    }
  }
  return false;
}

function extractCelebrityFromTitle(title: string): string | null {
  // Filter out fortunes entirely from celebrity matching
  if (title.includes('운세') || title.includes('띠별')) return null;

  const cleanTitle = title.replace(/^\[[^\]]+\]\s*/, '').replace(/^\([^)]+\)\s*/, '');
  const words = cleanTitle.split(/[,\s·'"`\[\]\(\)\-~!\?]/);
  for (const word of words) {
    // Clean and strip trailing possessive particle '의'
    const cleanWord = word.replace(/[^가-힣a-zA-Z0-9]/g, '').trim().replace(/의$/, '');
    if (isCelebrity(cleanWord)) {
      return cleanWord;
    }
  }
  return null;
}

async function fetchEntertainmentNews() {
  try {
    const url = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko';
    const res = await fetch(url);
    const xml = await res.text();
    
    const newsItems: any[] = [];
    const itemReg = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemReg.exec(xml)) !== null && newsItems.length < 100) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
      const link = linkMatch ? linkMatch[1] : '';
      const pubDate = pubDateMatch ? pubDateMatch[1] : '';
      
      // Filter out horoscope articles from the feed
      if (title.includes('운세') || title.includes('띠별')) continue;

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

    // Extract real celebrity names from these news items
    const celebrityNames = newsItems
      .map(item => extractCelebrityFromTitle(item.title))
      .filter((name): name is string => name !== null && name.length >= 2);

    // Fetch community hot posts in parallel
    const [ruliwebPosts, dogdripPosts] = await Promise.all([
      fetchRuliweb(),
      fetchDogdrip()
    ]);

    const communityPosts = [...ruliwebPosts, ...dogdripPosts];
    const matchedCommunityItems: any[] = [];

    // Filter community posts that match our extracted celebrity names
    communityPosts.forEach(post => {
      // Find which celebrity name matches
      const matchedName = celebrityNames.find(name => post.title.includes(name));
      if (matchedName) {
        matchedCommunityItems.push({
          title: post.title,
          link: post.link,
          pubDate: new Date().toLocaleDateString('ko-KR'),
          source: post.source,
          isCommunity: true,
          celebrityName: matchedName
        });
      }
    });

    // Merge news and community posts by placing community posts next to their respective celebrity news card
    const mergedList: any[] = [];
    newsItems.forEach(news => {
      mergedList.push(news);
      
      const name = extractCelebrityFromTitle(news.title);
      if (name) {
        // Find community posts matching this celebrity
        const relatedCommunity = matchedCommunityItems.filter(post => 
          post.celebrityName === name && !mergedList.some(item => item.link === post.link)
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
