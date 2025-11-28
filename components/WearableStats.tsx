
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { fetchWearableData } from '../services/wearableService';
import type { WearableData } from '../types';
import LoadingIndicator from './LoadingIndicator';

const WearableStats: React.FC = () => {
    const { t } = useTranslation();
    const [data, setData] = useState<WearableData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await fetchWearableData();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch wearable data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Simulate auto-refresh every minute
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading && !data) {
        return <div className="p-4 flex justify-center"><LoadingIndicator className="h-6 w-6 text-teal-600" /></div>;
    }

    if (!data) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {t('wearableTitle')}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('wearableSynced')} {new Date(data.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Steps */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <p className="text-xs text-orange-600 dark:text-orange-300 font-semibold uppercase">{t('wearableSteps')}</p>
                    <div className="flex items-end">
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.steps.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1"> / 10,000</span>
                    </div>
                    <div className="w-full bg-orange-200 dark:bg-orange-800 h-1.5 rounded-full mt-2">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min((data.steps / 10000) * 100, 100)}%` }}></div>
                    </div>
                </div>

                {/* Heart Rate */}
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <p className="text-xs text-red-600 dark:text-red-300 font-semibold uppercase">{t('wearableHeartRate')}</p>
                    <div className="flex items-center">
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.heartRate}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1"> bpm</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 ml-auto animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                {/* Calories */}
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-300 font-semibold uppercase">{t('wearableCalories')}</p>
                    <div className="flex items-end">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{data.caloriesBurned}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1"> kcal</span>
                    </div>
                </div>

                {/* Sleep */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                    <p className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold uppercase">{t('wearableSleep')}</p>
                    <div className="flex items-end">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{data.sleepScore}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1"> / 100</span>
                    </div>
                </div>
            </div>
            <p className="mt-3 text-xs text-gray-400 text-center">Connected via Google Fit</p>
        </div>
    );
};

export default WearableStats;
