import React, { useState, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { Geolocation, MapSearchResult } from '../types';
import { searchPlaces } from '../services/mapService';
import LoadingIndicator from './LoadingIndicator';

interface CommunityHealthMapProps {
    userLocation: Geolocation | null;
    locationError: string | null;
}

const CommunityHealthMap: React.FC<CommunityHealthMapProps> = ({ userLocation, locationError }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<MapSearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim() || !userLocation) {
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const searchResult = await searchPlaces(query, userLocation);
            setResult(searchResult);
        } catch (err) {
            console.error(err);
            setError(t('mapError'));
        } finally {
            setIsLoading(false);
        }
    }, [query, userLocation, t]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center mt-8">
                    <LoadingIndicator className="h-8 w-8 text-teal-600 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Searching...</p>
                </div>
            );
        }
        
        if (error) {
            return <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-center">{error}</div>;
        }

        if (result) {
            return (
                <div className="mt-8 space-y-6 fade-in">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-200">{result.summary}</p>
                    </div>
                    {result.places.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.places.map((place, index) => (
                                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100">{place.title}</h3>
                                    </div>
                                    <a 
                                        href={place.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 w-full flex items-center justify-center px-3 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {t('mapViewOnMap')}
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400">{t('mapNoResults')}</p>
                    )}
                </div>
            );
        }
        
        // Initial state
        return (
             <div className="text-center mt-8 text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3" /></svg>
                <p className="mt-2">{t('mapInitialMessage')}</p>
             </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-3xl mx-auto">
                <div className="text-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('mapTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('mapSubtitle')}</p>
                </div>

                <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-500">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('mapSearchPlaceholder')}
                        className="flex-1 w-full bg-transparent p-2 focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        disabled={!userLocation || !!locationError}
                    />
                     <button
                        type="submit"
                        disabled={isLoading || !query.trim() || !userLocation}
                        className="p-2 rounded-full bg-teal-600 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600 hover:bg-teal-700 transition-colors flex-shrink-0"
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                </form>
                {locationError && (
                    <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{locationError}</p>
                )}

                {renderContent()}
            </div>
        </div>
    );
};

export default CommunityHealthMap;
