"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'hot' | 'celebrity'>('hot');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [entData, setEntData] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'trending' | 'volume'>('trending');

  useEffect(() => {
    if (activeTab === 'hot' && dailyData.length === 0) {
      fetchData("hot");
    } else if (activeTab === 'celebrity' && entData.length === 0) {
      fetchData("celebrity");
    }
  }, [activeTab]);

  const fetchData = async (type: 'hot' | 'celebrity') => {
    setLoading(true);
    setError("");
    try {
      const url = type === 'celebrity' ? "/api/trends?tab=celebrity" : "/api/trends";
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "데이터를 가져오는데 실패했습니다.");
      }

      if (type === 'celebrity') {
        setEntData(data.data || []);
      } else {
        const trendingSearches = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setDailyData(trendingSearches);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const formatTraffic = (traffic: number | string) => {
    const num = typeof traffic === 'string' ? parseInt(traffic, 10) : traffic;
    if (isNaN(num)) return traffic;
    return num.toLocaleString();
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.title} gradient-text`}>트렌드 트래커</h1>
        <p className={styles.subtitle}>
          실시간 급상승 검색어와 연예/셀럽의 핫한 소식을 한눈에 파악하세요.
        </p>
      </header>

      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'hot' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('hot')}
        >
          🔥 오늘의 핫 트렌드
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'celebrity' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('celebrity')}
        >
          🎭 연예인/셀럽
        </button>
      </div>

      <div className={styles.contentArea}>
        {loading && <div className={styles.loading}>트렌드 데이터를 불러오는 중입니다...</div>}
        
        {error && !loading && <div className={styles.error}>{error}</div>}

        {!loading && !error && activeTab === 'hot' && dailyData.length > 0 && (
          <div style={{ width: '100%' }} className="animate-fade-in">
            <div className={styles.filterBar}>
              <span className={styles.filterTitle}>
                {sortBy === 'trending' 
                  ? "🔥 실시간 급상승 순 (검색량 대비 성장세 기준)" 
                  : "📊 누적 검색량 많은 순"}
              </span>
              <div className={styles.sortButtons}>
                <button 
                  className={`${styles.sortButton} ${sortBy === 'trending' ? styles.activeSortButton : ''}`}
                  onClick={() => setSortBy('trending')}
                >
                  실시간 급상승순
                </button>
                <button 
                  className={`${styles.sortButton} ${sortBy === 'volume' ? styles.activeSortButton : ''}`}
                  onClick={() => setSortBy('volume')}
                >
                  누적 검색량순
                </button>
              </div>
            </div>
            
            <div className={styles.trendingList}>
              {[...dailyData]
                .sort((a, b) => {
                  if (sortBy === 'volume') {
                    return b.traffic - a.traffic;
                  }
                  return 0; // Keep original google trending order
                })
                .slice(0, 100) // Show up to 100 items
                .map((item, index) => {
                  // Determine hierarchical style class
                  let rankClass = styles.rank12to100;
                  if (index === 0) {
                    rankClass = styles.rank1;
                  } else if (index >= 1 && index <= 10) {
                    rankClass = styles.rank2to11;
                  }

                  // Calculate growth percentage (scale trafficGrowthRate down to max 100%)
                  const growthPercentage = Math.min(100, Math.round(item.trafficGrowthRate / 10));

                  return (
                    <div 
                      key={index} 
                      className={`${styles.trendingItem} ${rankClass} glass-panel`}
                    >
                      <div className={styles.rankWatermark}>{index + 1}</div>
                      <span className={styles.trendingRank}>
                        {sortBy === 'volume' ? '인기 순위' : '인기 급상승'}
                      </span>
                      <h3 className={styles.trendingTitle}>{item.keyword}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span className={styles.trendingTraffic}>
                          일일 검색량 {formatTraffic(item.traffic)}회 이상
                        </span>
                        {growthPercentage > 0 && (
                          <span className={styles.trendingGrowth}>
                            상승률 +{growthPercentage}%
                          </span>
                        )}
                      </div>
                      
                      {item.news && (
                        <div className={styles.trendingNews}>
                          <span className={styles.newsLabel}>📰 최신 뉴스: </span>
                          <a 
                            href={item.news.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={styles.newsLink}
                          >
                            {item.news.title}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {!loading && !error && activeTab === 'celebrity' && entData.length > 0 && (
          <div className={`${styles.trendingList} animate-fade-in`}>
            {entData.slice(0, 100).map((item, index) => {
              // Determine hierarchical style class
              let rankClass = styles.rank12to100;
              if (index === 0) {
                rankClass = styles.rank1;
              } else if (index >= 1 && index <= 10) {
                rankClass = styles.rank2to11;
              }

              // Highlight community posts slightly differently
              const isComm = item.isCommunity;

              return (
                <div 
                  key={index} 
                  className={`${styles.trendingItem} ${rankClass} glass-panel`}
                  onClick={() => window.open(item.link, '_blank')}
                  style={{ 
                    cursor: 'pointer',
                    border: isComm ? '1px dashed rgba(236, 72, 153, 0.3)' : undefined,
                    background: isComm ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.03), rgba(255, 255, 255, 0.01))' : undefined
                  }}
                >
                  <div 
                    className={styles.rankWatermark}
                    style={{ color: isComm ? 'rgba(236, 72, 153, 0.08)' : undefined }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', zIndex: 1 }}>
                    <span className={styles.trendingRank} style={{ color: isComm ? 'var(--accent-tertiary)' : undefined }}>
                      {isComm ? `💬 ${item.source}` : `📰 ${item.source}`}
                    </span>
                    <span className={styles.trendingTraffic}>{item.pubDate}</span>
                  </div>
                  <h3 className={styles.trendingTitle} style={{ margin: '0.5rem 0 1rem 0' }}>{item.title}</h3>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
