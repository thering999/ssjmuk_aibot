
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile } from '../services/firebase';
import { generateMealPlan, generateWorkoutPlan } from '../services/planningService';
import type { UserProfile, HealthPlan, MealPlanDay, WorkoutPlanDay } from '../types';
import LoadingIndicator from './LoadingIndicator';

const HealthPlanner: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [activeTab, setActiveTab] = useState<'meal' | 'workout'>('meal');
    const [plan, setPlan] = useState<HealthPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            getUserProfile(user.uid).then(setUserProfile);
        }
    }, [user]);

    const handleGenerate = async () => {
        setIsLoading(true);
        setPlan(null);
        try {
            let result: HealthPlan;
            if (activeTab === 'meal') {
                result = await generateMealPlan(userProfile);
            } else {
                result = await generateWorkoutPlan(userProfile);
            }
            setPlan(result);
        } catch (error) {
            console.error(error);
            alert(t('errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!plan) return;
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(plan, null, 2)], {type: 'application/json'});
        element.href = URL.createObjectURL(file);
        element.download = `${plan.type}_Plan_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Helper to render Meal Schedule
    const renderMealSchedule = (schedule: MealPlanDay[]) => (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {schedule.map((day, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-teal-100 dark:border-teal-900">
                    <h3 className="text-lg font-bold text-teal-700 dark:text-teal-300 mb-2">{day.day}</h3>
                    <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">🍳 Breakfast:</span> {day.breakfast}</p>
                        <p><span className="font-semibold">🍱 Lunch:</span> {day.lunch}</p>
                        <p><span className="font-semibold">🍲 Dinner:</span> {day.dinner}</p>
                        <p><span className="font-semibold">🍎 Snack:</span> {day.snack}</p>
                        <p className="text-right text-xs text-gray-500 mt-2">Total: {day.totalCalories} kcal</p>
                    </div>
                </div>
            ))}
        </div>
    );

    // Helper to render Workout Schedule
    const renderWorkoutSchedule = (schedule: WorkoutPlanDay[]) => (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {schedule.map((day, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-blue-100 dark:border-blue-900">
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-2">{day.day}</h3>
                    <div className="space-y-2 text-sm">
                        <p className="text-lg font-medium">{day.activity}</p>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>⏱ {day.duration}</span>
                            <span className={`px-2 rounded-full ${day.intensity === 'High' ? 'bg-red-100 text-red-700' : day.intensity === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {day.intensity} Intensity
                            </span>
                        </div>
                        <p className="text-gray-500 italic mt-2">"{day.notes}"</p>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-5xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('plannerTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('plannerSubtitle')}</p>
                </div>

                <div className="flex justify-center space-x-4 mb-6">
                    <button
                        onClick={() => { setActiveTab('meal'); setPlan(null); }}
                        className={`px-6 py-2 rounded-full font-medium transition-all ${activeTab === 'meal' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
                    >
                        🥗 {t('plannerTabMeal')}
                    </button>
                    <button
                        onClick={() => { setActiveTab('workout'); setPlan(null); }}
                        className={`px-6 py-2 rounded-full font-medium transition-all ${activeTab === 'workout' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
                    >
                        💪 {t('plannerTabWorkout')}
                    </button>
                </div>

                {!plan && !isLoading && (
                    <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="text-6xl mb-4">{activeTab === 'meal' ? '🥦' : '🏃'}</div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                            {activeTab === 'meal' ? t('plannerGenerateMeal') : t('plannerGenerateWorkout')}
                        </h2>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            {t('plannerPrompt')}
                        </p>
                        <button
                            onClick={handleGenerate}
                            className={`px-8 py-3 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 ${activeTab === 'meal' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {t('plannerButtonGenerate')}
                        </button>
                        {!user && <p className="text-xs text-red-500 mt-4">{t('profileSignInPromptBody')}</p>}
                    </div>
                )}

                {isLoading && (
                    <div className="flex flex-col items-center justify-center p-12">
                        <LoadingIndicator className={`h-12 w-12 ${activeTab === 'meal' ? 'text-teal-600' : 'text-blue-600'}`} />
                        <p className="mt-4 text-gray-600 dark:text-gray-300 animate-pulse">{t('plannerLoading')}</p>
                    </div>
                )}

                {plan && (
                    <div className="fade-in space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{plan.title}</h2>
                                    <p className="text-gray-500 text-sm">For: {plan.createdFor}</p>
                                </div>
                                <button onClick={handleDownload} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </button>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-6">
                                {plan.summary}
                            </p>
                            
                            {plan.type === 'Meal' 
                                ? renderMealSchedule(plan.schedule as MealPlanDay[]) 
                                : renderWorkoutSchedule(plan.schedule as WorkoutPlanDay[])
                            }
                        </div>
                        
                        <div className="flex justify-center">
                            <button onClick={handleGenerate} className="text-sm text-gray-500 hover:text-gray-700 underline">
                                {t('plannerRegenerate')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HealthPlanner;
