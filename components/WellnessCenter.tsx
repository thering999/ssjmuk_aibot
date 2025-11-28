
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import type { MoodType, MoodLog, SleepLog } from '../types';
import { analyzeMood, analyzeSleep } from '../services/wellnessService';
import { saveMoodLog, getMoodLogs, deleteMoodLog, addHealthPoints, saveSleepLog, getSleepLogs, deleteSleepLog } from '../services/firebase';
import LoadingIndicator from './LoadingIndicator';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const moodEmojis: Record<MoodType, string> = {
    'Great': '😄',
    'Good': '🙂',
    'Okay': '😐',
    'Low': '😔',
    'Stressed': '😫',
    'Anxious': '😰',
};

const moodColors: Record<MoodType, string> = {
    'Great': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'Good': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    'Okay': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'Low': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'Stressed': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'Anxious': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const WellnessCenter: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'mood' | 'sleep'>('mood');
    
    // Mood State
    const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
    const [note, setNote] = useState('');
    const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);
    const [currentMoodResponse, setCurrentMoodResponse] = useState('');
    const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
    
    // Sleep State
    const [bedtime, setBedtime] = useState('22:00');
    const [waketime, setWaketime] = useState('07:00');
    const [sleepQuality, setSleepQuality] = useState<SleepLog['quality']>('Good');
    const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
    const [isSavingSleep, setIsSavingSleep] = useState(false);

    // Breathing State
    const [isBreathingActive, setIsBreathingActive] = useState(false);

    const loadLogs = async () => {
        if (user) {
            try {
                const [moods, sleeps] = await Promise.all([getMoodLogs(user.uid), getSleepLogs(user.uid)]);
                setMoodLogs(moods);
                setSleepLogs(sleeps);
            } catch (error) {
                console.error("Failed to load logs:", error);
            }
        }
    };

    useEffect(() => {
        loadLogs();
    }, [user]);

    // --- Mood Logic ---
    const handleCheckIn = async () => {
        if (!selectedMood) return;
        setIsAnalyzingMood(true);
        try {
            const response = await analyzeMood(selectedMood, note);
            setCurrentMoodResponse(response);
            
            if (user) {
                await saveMoodLog(user.uid, {
                    mood: selectedMood,
                    note,
                    aiResponse: response,
                    timestamp: Date.now(),
                });
                const points = 2;
                await addHealthPoints(user.uid, points);
                await loadLogs();
            }
        } catch (error) {
            console.error(error);
            alert(t('errorOccurred'));
        } finally {
            setIsAnalyzingMood(false);
        }
    };

    const resetCheckIn = () => {
        setSelectedMood(null);
        setNote('');
        setCurrentMoodResponse('');
    };

    const handleDeleteMood = async (id: string) => {
        if (user && confirm(t('dashboardDeleteConfirm'))) {
            await deleteMoodLog(user.uid, id);
            loadLogs();
        }
    };

    // --- Sleep Logic ---
    const handleSleepSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingSleep(true);
        
        try {
            // Calculate duration
            const start = new Date(`2000-01-01T${bedtime}`);
            const end = new Date(`2000-01-01T${waketime}`);
            let diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60; // hours
            if (diff < 0) diff += 24; // Overnight

            const newSleepLog = {
                bedtime,
                waketime,
                durationHours: diff,
                quality: sleepQuality,
            };

            const advice = await analyzeSleep(newSleepLog);

            await saveSleepLog(user.uid, {
                ...newSleepLog,
                aiAnalysis: advice,
                timestamp: Date.now(),
            });
            
            await addHealthPoints(user.uid, 5); // 5 points for sleep tracking
            await loadLogs();
            alert(t('sleepSavedSuccess'));

        } catch (error) {
            console.error(error);
            alert(t('dashboardSaveError'));
        } finally {
            setIsSavingSleep(false);
        }
    };

    const handleDeleteSleep = async (id: string) => {
        if (user && confirm(t('dashboardDeleteConfirm'))) {
            await deleteSleepLog(user.uid, id);
            loadLogs();
        }
    };

    // --- Chart Data ---
    const sleepChartData = {
        labels: sleepLogs.slice(0, 7).reverse().map(l => new Date(l.timestamp).toLocaleDateString(undefined, {weekday: 'short'})),
        datasets: [
            {
                label: 'Hours',
                data: sleepLogs.slice(0, 7).reverse().map(l => l.durationHours),
                backgroundColor: 'rgba(20, 184, 166, 0.6)',
            }
        ]
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-3xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-teal-700 dark:text-teal-300">{t('wellnessTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('wellnessSubtitle')}</p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex justify-center space-x-2 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm w-fit mx-auto border border-gray-200 dark:border-gray-700">
                    <button onClick={() => setActiveTab('mood')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'mood' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {t('wellnessTabMood')}
                    </button>
                    <button onClick={() => setActiveTab('sleep')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'sleep' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {t('wellnessTabSleep')}
                    </button>
                </div>

                {activeTab === 'mood' && (
                    <>
                    {/* Breathing Exercise Widget */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center relative overflow-hidden">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('wellnessBreathingTitle')}</h2>
                        {isBreathingActive ? (
                            <div className="py-8 relative flex flex-col items-center">
                                <div className="w-32 h-32 bg-teal-200 dark:bg-teal-800 rounded-full animate-[pulse_4s_ease-in-out_infinite] flex items-center justify-center opacity-80">
                                    <div className="w-24 h-24 bg-teal-400 dark:bg-teal-600 rounded-full animate-[pulse_4s_ease-in-out_infinite_reverse] opacity-90"></div>
                                </div>
                                <p className="mt-6 text-teal-700 dark:text-teal-300 font-medium animate-[pulse_4s_ease-in-out_infinite]">
                                    {t('wellnessBreathingInstruction')}
                                </p>
                                <button onClick={() => setIsBreathingActive(false)} className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    {t('stopGeneration')}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsBreathingActive(true)} className="px-6 py-2 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 rounded-full font-medium hover:bg-teal-200 dark:hover:bg-teal-900/60 transition-colors">
                                {t('wellnessStartBreathing')}
                            </button>
                        )}
                    </div>

                    {/* Check-in Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        {!currentMoodResponse ? (
                            <>
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('wellnessCheckInTitle')}</h2>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                                    {(Object.keys(moodEmojis) as MoodType[]).map(mood => (
                                        <button
                                            key={mood}
                                            onClick={() => setSelectedMood(mood)}
                                            className={`p-3 rounded-xl flex flex-col items-center transition-all ${selectedMood === mood ? 'bg-teal-50 dark:bg-teal-900/30 ring-2 ring-teal-500 scale-105' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            <span className="text-2xl mb-1">{moodEmojis[mood]}</span>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t(`wellnessMood${mood}`)}</span>
                                        </button>
                                    ))}
                                </div>
                                
                                {selectedMood && (
                                    <div className="fade-in">
                                        <textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder={t('wellnessNotePlaceholder')}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:outline-none h-24 resize-none mb-4"
                                        />
                                        <button
                                            onClick={handleCheckIn}
                                            disabled={isAnalyzingMood}
                                            className="w-full py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-70 flex justify-center items-center"
                                        >
                                            {isAnalyzingMood ? <LoadingIndicator className="h-5 w-5 text-white" /> : t('wellnessCheckInButton')}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="fade-in">
                                <div className="flex items-center mb-4">
                                    <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-full mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600 dark:text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('wellnessAiResponseTitle')}</h3>
                                </div>
                                <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-100 dark:border-teal-800/50 mb-6">
                                    {currentMoodResponse}
                                </p>
                                <button
                                    onClick={resetCheckIn}
                                    className="w-full py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {t('wellnessNewCheckIn')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mood History */}
                    {user && moodLogs.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 px-1">{t('wellnessHistoryTitle')}</h3>
                            {moodLogs.map(log => (
                                <div key={log.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                                    <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[80px]">
                                        <span className="text-3xl mb-1">{moodEmojis[log.mood]}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${moodColors[log.mood]}`}>
                                            {t(`wellnessMood${log.mood}`)}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-2">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex-1">
                                        {log.note && <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">"{log.note}"</p>}
                                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md italic">
                                            {log.aiResponse}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteMood(log.id)}
                                        className="self-start md:self-center text-gray-400 hover:text-red-500 p-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    </>
                )}

                {activeTab === 'sleep' && (
                    <div className="space-y-6 fade-in">
                        {/* Sleep Input */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('sleepTrackerTitle')}</h2>
                            <form onSubmit={handleSleepSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">{t('sleepBedtime')}</label>
                                        <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">{t('sleepWaketime')}</label>
                                        <input type="time" value={waketime} onChange={e => setWaketime(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">{t('sleepQuality')}</label>
                                    <div className="flex justify-between bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                        {(['Poor', 'Fair', 'Good', 'Excellent'] as SleepLog['quality'][]).map(q => (
                                            <button
                                                key={q}
                                                type="button"
                                                onClick={() => setSleepQuality(q)}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${sleepQuality === q ? 'bg-teal-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                            >
                                                {t(`sleepQuality${q}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" disabled={isSavingSleep || !user} className="w-full py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                                    {isSavingSleep ? t('saving') : t('saveLog')}
                                </button>
                                {!user && <p className="text-xs text-center text-red-500">{t('profileSignInPromptBody')}</p>}
                            </form>
                        </div>

                        {/* Sleep Stats */}
                        {sleepLogs.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">{t('sleepTrends')}</h3>
                                <div className="h-48">
                                    <Bar data={sleepChartData} options={{responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }} />
                                </div>
                            </div>
                        )}

                        {/* Sleep History */}
                        <div className="space-y-4">
                            {sleepLogs.map(log => (
                                <div key={log.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-gray-200">{new Date(log.timestamp).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{log.bedtime} - {log.waketime} ({log.durationHours.toFixed(1)} hrs)</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{t(`sleepQuality${log.quality}`)}</span>
                                        </div>
                                        <button onClick={() => handleDeleteSleep(log.id)} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                    {log.aiAnalysis && (
                                        <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-sm text-teal-800 dark:text-teal-200 italic">
                                            💡 {log.aiAnalysis}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WellnessCenter;
