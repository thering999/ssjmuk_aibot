import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { HealthHubArticle, NewsCategory } from '../types';
import { fetchHealthNews } from '../services/healthHubService';

const categoryStyles: Record<NewsCategory, { icon: React.ReactNode; color: string }> = {
  Alert: {
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
  },
  Campaign: {
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.036 9.284-5.116M15.536 13.683A4.001 4.001 0 0117 19h-1.832c-4.1 0-7.625 2.036-9.284 5.116" /></svg>,
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  },
  News: {
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
    color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
  },
  Tip: {
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
    color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
  },
};

const ArticleCard: React.FC<{ article: HealthHubArticle }> = ({ article }) => {
    const { t } = useTranslation();
    const style = categoryStyles[article.category] || categoryStyles.News;
    const categoryKey = `hubCategory_${article.category}` as const;
  
    return (
        <div className={`p-4 rounded-lg border-l-4 ${style.color} bg-white dark:bg-gray-800 shadow-sm fade-in`}>
            <div className="flex items-center mb-2">
                <div className={`flex items-center space-x-2 px-2 py-0.5 rounded-full text-xs font-semibold ${style.color}`}>
                    {style.icon}
                    <span>{t(categoryKey)}</span>
                </div>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{article.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{article.summary}</p>
            <a href={article.source} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-2 inline-block">
                Read more
            </a>
        </div>
    );
};

const HealthHub: React.FC = () => {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<HealthHubArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const news = await fetchHealthNews();
      setArticles(news);
    } catch (err) {
      console.error(err);
      setError(t('hubError'));
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    getNews();
  }, [getNews]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('hubTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('hubSubtitle')}</p>
        </div>
        
        <div className="mb-6 flex justify-center">
            <button
                onClick={getNews}
                disabled={isLoading}
                className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center shadow"
            >
                {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5" /></svg>
                )}
                {isLoading ? t('hubLoading') : t('hubRefresh')}
            </button>
        </div>

        {isLoading && (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                ))}
            </div>
        )}
        
        {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-center">
                {error}
            </div>
        )}

        {!isLoading && !error && (
            <div className="space-y-4">
                {articles.map((article, index) => (
                    <ArticleCard key={index} article={article} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default HealthHub;