
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { processFiles, SUPPORTED_IMAGE_MIME_TYPES } from '../utils/fileUtils';
import { analyzeMeal } from '../services/nutritionService';
import { saveMealLog, getMealLogs, deleteMealLog, addHealthPoints } from '../services/firebase';
import type { MealLog, AttachedFile } from '../types';
import LoadingIndicator from './LoadingIndicator';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const NutritionTracker: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [mode, setMode] = useState<'photo' | 'text'>('photo');
    const [inputFile, setInputFile] = useState<AttachedFile | null>(null);
    const [inputText, setInputText] = useState('');
    const [analysis, setAnalysis] = useState<Omit<MealLog, 'id' | 'userId' | 'timestamp'> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [todayLogs, setTodayLogs] = useState<MealLog[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const DAILY_CALORIE_GOAL = 2000; // Default goal, could be user-configurable later

    const loadTodayLogs = async () => {
        if (user) {
            try {
                const logs = await getMealLogs(user.uid, new Date());
                setTodayLogs(logs);
            } catch (error) {
                console.error("Failed to load meal logs:", error);
            }
        }
    };

    useEffect(() => {
        loadTodayLogs();
    }, [user]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const processed = await processFiles([file], SUPPORTED_IMAGE_MIME_TYPES, () => alert(t('analyzerErrorInvalidFile')));
            if (processed.length > 0) {
                setInputFile(processed[0]);
                setAnalysis(null);
            }
        }
    };

    const handleAnalyze = async () => {
        if ((mode === 'photo' && !inputFile) || (mode === 'text' && !inputText.trim())) return;

        setIsLoading(true);
        try {
            const result = await analyzeMeal(mode === 'photo' ? inputFile! : inputText);
            setAnalysis(result);
        } catch (error) {
            console.error(error);
            alert(t('errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveLog = async () => {
        if (!user || !analysis) return;
        setIsSaving(true);
        try {
            await saveMealLog(user.uid, {
                ...analysis,
                timestamp: Date.now(),
            });
            
            // Award health points
            const points = 5; // 5 points per meal log
            await addHealthPoints(user.uid, points);
            
            setAnalysis(null);
            setInputFile(null);
            setInputText('');
            await loadTodayLogs();
            alert(`Logged successfully! You earned ${points} Health Coins!`);
        } catch (error) {
            console.error(error);
            alert(t('dashboardSaveError'));
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!user) return;
        if(confirm(t('dashboardDeleteConfirm'))) {
            await deleteMealLog(user.uid, id);
            await loadTodayLogs();
        }
    }

    const totalCalories = todayLogs.reduce((sum, log) => sum + log.calories, 0);
    const totalProtein = todayLogs.reduce((sum, log) => sum + log.protein, 0);
    const totalCarbs = todayLogs.reduce((sum, log) => sum + log.carbs, 0);
    const totalFat = todayLogs.reduce((sum, log) => sum + log.fat, 0);

    const macroChartData = {
        labels: ['Protein (g)', 'Carbs (g)', 'Fat (g)'],
        datasets: [
            {
                data: analysis ? [analysis.protein, analysis.carbs, analysis.fat] : [totalProtein, totalCarbs, totalFat],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
                borderWidth: 0,
            },
        ],
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('nutritionTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('nutritionSubtitle')}</p>
                </div>

                {/* Input Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex space-x-4 mb-4">
                        <button
                            onClick={() => setMode('photo')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'photo' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                            {t('nutritionModePhoto')}
                        </button>
                        <button
                            onClick={() => setMode('text')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'text' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                            {t('nutritionModeText')}
                        </button>
                    </div>

                    {mode === 'photo' ? (
                        <div 
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {inputFile ? (
                                <div className="relative inline-block">
                                    <img src={`data:${inputFile.mimeType};base64,${inputFile.base64}`} alt="Preview" className="max-h-48 rounded-md mx-auto" />
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{inputFile.name}</p>
                                </div>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400">{t('nutritionUploadPrompt')}</p>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>
                    ) : (
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={t('nutritionTextPlaceholder')}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:outline-none h-32 resize-none"
                        />
                    )}

                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || (mode === 'photo' && !inputFile) || (mode === 'text' && !inputText)}
                        className="mt-4 w-full py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isLoading ? <LoadingIndicator className="h-5 w-5 text-white" /> : t('nutritionAnalyzeButton')}
                    </button>
                </div>

                {/* Analysis Result */}
                {analysis && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 fade-in">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{analysis.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Calories</p>
                                        <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{analysis.calories}</p>
                                    </div>
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Health Score</p>
                                        <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{analysis.healthScore}/10</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-400">
                                    {analysis.analysis}
                                </p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-32 h-32">
                                    <Doughnut data={macroChartData} options={{ plugins: { legend: { display: false } }, cutout: '70%' }} />
                                </div>
                                <div className="flex space-x-4 mt-4 text-xs">
                                    <div className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>Protein: {analysis.protein}g</div>
                                    <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>Carbs: {analysis.carbs}g</div>
                                    <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>Fat: {analysis.fat}g</div>
                                </div>
                            </div>
                        </div>
                        {user ? (
                            <button
                                onClick={handleSaveLog}
                                disabled={isSaving}
                                className="mt-6 w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
                            >
                                {isSaving ? <LoadingIndicator className="h-5 w-5 text-white" /> : t('nutritionSaveLog')}
                            </button>
                        ) : (
                            <p className="mt-4 text-center text-xs text-gray-500">{t('dashboardSaveDisabledTooltip')}</p>
                        )}
                    </div>
                )}

                {/* Today's Logs */}
                {user && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('nutritionTodayLogs')}</h3>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('nutritionTotalCalories')}</p>
                                <p className={`text-xl font-bold ${totalCalories > DAILY_CALORIE_GOAL ? 'text-red-500' : 'text-teal-600'}`}>
                                    {totalCalories} / {DAILY_CALORIE_GOAL} kcal
                                </p>
                            </div>
                        </div>
                        
                        {/* Calorie Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
                            <div 
                                className={`h-2.5 rounded-full ${totalCalories > DAILY_CALORIE_GOAL ? 'bg-red-500' : 'bg-teal-600'}`} 
                                style={{ width: `${Math.min((totalCalories / DAILY_CALORIE_GOAL) * 100, 100)}%` }}
                            ></div>
                        </div>

                        <div className="space-y-3">
                            {todayLogs.length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-4">{t('nutritionNoLogs')}</p>
                            ) : (
                                todayLogs.map(log => (
                                    <div key={log.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        {log.imageUrl ? (
                                            <img src={log.imageUrl} alt={log.name} className="w-12 h-12 rounded-md object-cover mr-3" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3 text-lg">🍽️</div>
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{log.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {log.calories} kcal</p>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mr-3 text-right hidden sm:block">
                                            P: {log.protein}g <br/> C: {log.carbs}g
                                        </div>
                                        <button onClick={() => handleDelete(log.id)} className="text-gray-400 hover:text-red-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NutritionTracker;
