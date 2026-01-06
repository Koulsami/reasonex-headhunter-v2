import React, { useState, useEffect } from 'react';
import { getClientNews, getIndustryNews, fetchBlogPosts, fetchJobAlerts } from '../services/geminiService';
import { Client, NewsItem } from '../types';

const SAMPLE_CLIENTS: Client[] = [
  { id: '1', name: 'Google', industry: 'Technology', website: 'google.com' },
  { id: '2', name: 'Microsoft', industry: 'Technology', website: 'microsoft.com' },
  { id: '3', name: 'Pfizer', industry: 'Healthcare', website: 'pfizer.com' },
  { id: '4', name: 'Tesla', industry: 'Automotive', website: 'tesla.com' },
  { id: '5', name: 'Goldman Sachs', industry: 'Finance', website: 'goldmansachs.com' },
];

interface Feed {
  id: string;
  name: string;
  rssUrl: string;
  category: string;
}

const RSS_FEEDS: Feed[] = [
  { id: 'f1', name: 'HR Dive', rssUrl: 'https://www.hrdive.com/feeds/news/', category: 'HR News' },
  { id: 'f2', name: 'TechCrunch Jobs', rssUrl: 'https://techcrunch.com/category/jobs/feed/', category: 'Tech Market' },
  { id: 'f3', name: 'ERE.net', rssUrl: 'https://www.ere.net/feed', category: 'Recruiting' },
  { id: 'f4', name: 'SIA Analyst', rssUrl: 'https://www2.staffingindustry.com/site/rss/feed/daily-news', category: 'Staffing Data' },
];

const BLOG_FEEDS = [
  { id: 'b1', name: 'LinkedIn Talent Blog', url: 'https://www.linkedin.com/blog/talent' },
  { id: 'b2', name: 'RecruitingDaily', url: 'https://recruitingdaily.com/' },
  { id: 'b3', name: 'Undercover Recruiter', url: 'https://theundercoverrecruiter.com/' },
  { id: 'b4', name: 'Hunted Blog', url: 'https://www.hunted.com/blog' },
  { id: 'b5', name: 'SourceCon', url: 'https://www.sourcecon.com/' },
];

const IntelligenceTab: React.FC = () => {
  // --- STATE ---
  
  // Selections
  const [selectedClient, setSelectedClient] = useState<Client>(SAMPLE_CLIENTS[0]);
  const [selectedRssFeed, setSelectedRssFeed] = useState<Feed>(RSS_FEEDS[0]);
  const [selectedBlogFeed, setSelectedBlogFeed] = useState(BLOG_FEEDS[0]);

  // Data
  const [clientData, setClientData] = useState<{ news: NewsItem[] }>({ news: [] });
  const [jobAlerts, setJobAlerts] = useState<NewsItem[]>([]);
  const [alertError, setAlertError] = useState<string | null>(null);
  
  const [rssData, setRssData] = useState<NewsItem[]>([]);
  const [blogData, setBlogData] = useState<NewsItem[]>([]);

  // Loading States
  const [loadingClient, setLoadingClient] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingRss, setLoadingRss] = useState(false);
  const [loadingBlogs, setLoadingBlogs] = useState(false);

  // --- FETCHERS ---

  const fetchClientData = async (client: Client) => {
    setLoadingClient(true);
    setClientData({ news: [] });
    try {
      const result = await getClientNews(client.name);
      setClientData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClient(false);
    }
  };

  const loadJobAlerts = async () => {
    setLoadingAlerts(true);
    setJobAlerts([]);
    setAlertError(null);
    try {
      const alerts = await fetchJobAlerts();
      setJobAlerts(alerts);
    } catch (err: any) {
      console.error("Failed to load alerts", err);
      setAlertError(err.message || "Failed to load");
    } finally {
      setLoadingAlerts(false);
    }
  };

  const fetchRssData = async (feed: Feed) => {
    setLoadingRss(true);
    setRssData([]);
    try {
      const result = await getIndustryNews(feed.name, feed.rssUrl);
      // Merge alerts and news for the RSS column
      setRssData([...result.alerts, ...result.news]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRss(false);
    }
  };

  const fetchBlogData = async (feedId: string) => {
    const feed = BLOG_FEEDS.find(f => f.id === feedId);
    if (!feed) return;
    
    setLoadingBlogs(true);
    setBlogData([]);
    try {
      const posts = await fetchBlogPosts(feed.name, feed.url);
      setBlogData(posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlogs(false);
    }
  };

  // --- EFFECTS ---

  // Initial Load & Change Handlers
  useEffect(() => {
    fetchClientData(selectedClient);
  }, [selectedClient]);

  useEffect(() => {
    // Load job alerts once on mount (or when component reloads)
    loadJobAlerts();
  }, []);

  useEffect(() => {
    fetchRssData(selectedRssFeed);
  }, [selectedRssFeed]);

  useEffect(() => {
    fetchBlogData(selectedBlogFeed.id);
  }, [selectedBlogFeed]);


  // --- RENDER HELPERS ---

  const renderCard = (item: NewsItem, type: 'blog' | 'rss' | 'alert' | 'news') => {
    let borderClass = 'border-slate-200 hover:border-blue-300';
    let iconColor = 'text-slate-400';
    let textColor = 'text-slate-800';
    
    if (type === 'alert') {
        borderClass = 'border-l-4 border-l-red-500 border-y border-r border-red-100 bg-red-50/20';
        iconColor = 'text-red-500';
        textColor = 'text-slate-900';
    } else if (type === 'blog') {
        borderClass = 'border-purple-200 hover:border-purple-300 bg-purple-50/10';
        iconColor = 'text-purple-400';
    } else if (type === 'rss') {
        borderClass = 'border-orange-200 hover:border-orange-300 bg-orange-50/10';
        iconColor = 'text-orange-400';
    }

    return (
        <a 
        key={`${item.url}-${item.title}`}
        href={item.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`block p-3 rounded-lg border shadow-sm hover:shadow-md transition-all group mb-3 ${borderClass}`}
        >
        <div className="flex justify-between items-start mb-1">
            <h4 className={`text-sm font-bold ${textColor} group-hover:text-primary transition-colors leading-tight line-clamp-2`}>{item.title}</h4>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
            <span className={`font-semibold uppercase tracking-wider ${iconColor}`}>{item.source}</span>
            <span>{item.date}</span>
        </div>
        <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">{item.snippet}</p>
        </a>
    );
  };

  const renderColumnHeader = (title: string, count: number, loading: boolean, color: string, icon: React.ReactNode, onRefresh?: () => void) => (
    <div className={`p-3 border-b flex justify-between items-center h-[50px] sticky top-0 bg-opacity-95 backdrop-blur-sm z-10 ${
        color === 'purple' ? 'bg-purple-50 border-purple-100 text-purple-900' :
        color === 'orange' ? 'bg-orange-50 border-orange-100 text-orange-900' :
        color === 'red' ? 'bg-red-50 border-red-100 text-red-900' :
        'bg-slate-50 border-slate-200 text-slate-800'
    }`}>
        <div className="flex items-center gap-2">
           <h3 className="font-bold flex items-center gap-2 text-sm">
              {icon}
              {title}
           </h3>
           {onRefresh && (
             <button 
               onClick={(e) => { e.stopPropagation(); onRefresh(); }} 
               className={`p-1 rounded-full hover:bg-black/5 transition-colors ${loading ? 'animate-spin' : ''}`}
               title="Refresh"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
             </button>
           )}
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-sm bg-white ${
             color === 'purple' ? 'text-purple-600 border-purple-100' :
             color === 'orange' ? 'text-orange-600 border-orange-100' :
             color === 'red' ? 'text-red-600 border-red-100' :
             'text-slate-500 border-slate-200'
        }`}>
            {loading ? '...' : count}
        </span>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] relative">
        
        {/* 4-Column Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden pb-2">
            
            {/* 1. Blogs Column */}
            <div className="flex flex-col bg-white rounded-xl border border-purple-100 overflow-hidden h-full">
                {renderColumnHeader('Blogs', blogData.length, loadingBlogs, 'purple', (
                    <span className="bg-purple-100 p-1 rounded-md text-purple-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                    </span>
                ))}
                <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-purple-50/30 to-transparent">
                    {loadingBlogs ? (
                        <div className="space-y-3 animate-pulse">
                            {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg"></div>)}
                        </div>
                    ) : blogData.length > 0 ? (
                        blogData.map(item => renderCard(item, 'blog'))
                    ) : (
                        <div className="h-40 flex items-center justify-center text-slate-300 text-xs">No blogs</div>
                    )}
                </div>
            </div>

            {/* 2. RSS Feeds Column */}
            <div className="flex flex-col bg-white rounded-xl border border-orange-100 overflow-hidden h-full">
                {renderColumnHeader('RSS Feeds', rssData.length, loadingRss, 'orange', (
                    <span className="bg-orange-100 p-1 rounded-md text-orange-600">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
                    </span>
                ))}
                <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-orange-50/30 to-transparent">
                    {loadingRss ? (
                        <div className="space-y-3 animate-pulse">
                             {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg"></div>)}
                        </div>
                    ) : rssData.length > 0 ? (
                        rssData.map(item => renderCard(item, 'rss'))
                    ) : (
                        <div className="h-40 flex items-center justify-center text-slate-300 text-xs">No feed items</div>
                    )}
                </div>
            </div>

            {/* 3. Job Alerts Column (External API) */}
            <div className="flex flex-col bg-white rounded-xl border border-red-100 overflow-hidden h-full">
                {renderColumnHeader('Job Alerts', jobAlerts.length, loadingAlerts, 'red', (
                    <span className="bg-red-100 p-1 rounded-md text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </span>
                ), loadJobAlerts)}
                
                <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-red-50/20 to-transparent">
                    {loadingAlerts ? (
                        <div className="space-y-3 animate-pulse">
                             {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg"></div>)}
                        </div>
                    ) : alertError ? (
                         <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400 mb-2 opacity-75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                             <p className="text-xs font-medium text-red-500 mb-1">Failed to fetch alerts</p>
                             <p className="text-[10px] text-slate-400 mb-2">{alertError}</p>
                             <button onClick={loadJobAlerts} className="px-3 py-1 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-50">Retry</button>
                        </div>
                    ) : jobAlerts.length > 0 ? (
                        jobAlerts.map(item => renderCard(item, 'alert'))
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-300">
                             <p className="text-xs font-medium">No active alerts</p>
                             <button onClick={loadJobAlerts} className="mt-2 text-[10px] text-blue-500 hover:underline">Refresh</button>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. News Column */}
            <div className="flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
                {renderColumnHeader('News', clientData.news.length, loadingClient, 'slate', (
                    <span className="bg-blue-50 p-1 rounded-md text-blue-600">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </span>
                ))}
                <div className="flex-1 overflow-y-auto p-3">
                    {loadingClient ? (
                        <div className="space-y-3 animate-pulse">
                             {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-lg"></div>)}
                        </div>
                    ) : clientData.news.length > 0 ? (
                        clientData.news.map(item => renderCard(item, 'news'))
                    ) : (
                        <div className="h-40 flex items-center justify-center text-slate-300 text-xs">No news</div>
                    )}
                </div>
            </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-between px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center gap-6 w-full">
                
                {/* 1. Blog Selector */}
                <div className="flex flex-col gap-1 w-1/3">
                    <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Blog Source</label>
                    <div className="relative">
                        <select 
                            value={selectedBlogFeed.id}
                            onChange={(e) => setSelectedBlogFeed(BLOG_FEEDS.find(f => f.id === e.target.value) || BLOG_FEEDS[0])}
                            className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none"
                        >
                            {BLOG_FEEDS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </div>
                </div>

                {/* 2. RSS Feed Selector */}
                <div className="flex flex-col gap-1 w-1/3">
                    <label className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">RSS Feed</label>
                    <div className="relative">
                        <select 
                            value={selectedRssFeed.id}
                            onChange={(e) => setSelectedRssFeed(RSS_FEEDS.find(f => f.id === e.target.value) || RSS_FEEDS[0])}
                            className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none"
                        >
                            {RSS_FEEDS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </div>
                </div>

                {/* 3. Client Selector (Controls News Only now) */}
                <div className="flex flex-col gap-1 w-1/3">
                    <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Tracked Client News</label>
                    <div className="relative">
                        <select 
                            value={selectedClient.id}
                            onChange={(e) => setSelectedClient(SAMPLE_CLIENTS.find(c => c.id === e.target.value) || SAMPLE_CLIENTS[0])}
                            className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
                        >
                            {SAMPLE_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default IntelligenceTab;