
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { generateHealthInsights } from '../services/insightService';
import type { HealthInsight } from '../types';
import LoadingIndicator from './LoadingIndicator';

const InsightCard: React.FC<{ insight: HealthInsight }> = ({ insight }) => {
    const colorMap = {
        'Correlation': 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        'Prediction': 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
        'Anomaly': 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    };

    const iconMap = {
        'Correlation': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
        'Prediction': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        'Anomaly': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    };

    return (
        <div className={`p-4 rounded-lg border ${colorMap[insight.type]} flex flex-col gap-2`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    {iconMap[insight.type]}
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{insight.title}</h4>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-300">{insight.type}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{insight.description}</p>
            <div className="mt-2 p-2 bg-white/60 dark:bg-gray-800/50 rounded text-xs text-gray-700 dark:text-gray-200 italic">
                💡 {insight.recommendation}
            </div>
        </div>
    );
};

const AIInsights: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [insights, setInsights] = useState<HealthInsight[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            generateHealthInsights(user)
                .then(data => setInsights(data))
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }, [user]);

    if (!user || (insights.length === 0 && !isLoading)) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-800 p-4 mb-6">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center">
                <span className="text-xl mr-2">✨</span> {t('aiInsightsTitle')}
            </h3>
            
            {isLoading ? (
                <div className="flex justify-center p-4">
                    <LoadingIndicator className="h-6 w-6 text-indigo-500" />
                </div>
            ) : (
                <div className="space-y-3">
                    {insights.map((insight, i) => (
                        <InsightCard key={i} insight={insight} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AIInsights;
