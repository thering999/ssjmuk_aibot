
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { getHealthRecords, deleteHealthRecord, getAIHealthSummary, getMealLogs, getMoodLogs, getAppointments, deleteAppointment } from '../services/healthDashboardService';
import { getUserProfile, updateUserProfile } from '../services/firebase';
import type { HealthRecord, AnalyzedMetric, UserProfile, MedicationSchedule, MealLog, MoodLog, AppointmentRecord } from '../types';
import type { TFunction } from 'i18next';
import { Line } from 'react-chartjs-2';
import LoadingIndicator from './LoadingIndicator';
import QueueStatus from './QueueStatus';
import RewardsShop from './RewardsShop';
import WearableStats from './WearableStats';
import AIInsights from './AIInsights'; // Import the new component
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { format, isFuture } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AIHealthSummary: React.FC<{ records: HealthRecord[]; t: TFunction }> = ({ records, t }) => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await getAIHealthSummary(records);
            setSummary(result);
        } catch (err) {
            setError(t('dashboardAiSummaryError'));
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (records.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">{t('dashboardAiSummaryTitle')}</h3>
            {summary && !isLoading && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{summary}</p>}
            {isLoading && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <LoadingIndicator className="h-4 w-4 mr-2" />
                    <span>{t('dashboardAiSummaryLoading')}</span>
                </div>
            )}
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
            {!summary && !isLoading && (
                <button
                    onClick={handleGenerateSummary}
                    className="px-3 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700"
                >
                    {t('dashboardAiSummaryButton')}
                </button>
            )}
        </div>
    );
};

const StatusIndicator: React.FC<{ status: AnalyzedMetric['status']; t: TFunction }> = ({ status, t }) => {
    const statusMap = {
        High: { text: t('statusHigh'), color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200' },
        Low: { text: t('statusLow'), color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' },
        Normal: { text: t('statusNormal'), color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' },
        Abnormal: { text: t('statusAbnormal'), color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' },
        Unavailable: { text: 'N/A', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
    };
    const { text, color } = statusMap[status] || statusMap.Unavailable;
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{text}</span>
    );
};

const SummaryCards: React.FC<{ latestRecord: HealthRecord | undefined; t: TFunction; healthPoints?: number; onOpenShop: () => void }> = ({ latestRecord, t, healthPoints, onOpenShop }) => {
    const keyMetrics = useMemo(() => {
        if (!latestRecord) return [];
        const KEY_METRIC_NAMES = ['Glucose', 'Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'Hemoglobin'];
        return latestRecord.analysis.detailedResults.filter(metric => 
            KEY_METRIC_NAMES.includes(metric.metric)
        );
    }, [latestRecord]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 relative">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('dashboardSummaryTitle')}</h3>
                    {latestRecord && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboardSummarySubtitle', { date: new Date(latestRecord.createdAt).toLocaleDateString() })}</p>
                    )}
                </div>
                {typeof healthPoints === 'number' && (
                    <button 
                        onClick={onOpenShop}
                        className="flex items-center bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 px-3 py-1.5 rounded-full transition-colors cursor-pointer border border-yellow-200 dark:border-yellow-800"
                        title="Click to visit Rewards Shop"
                    >
                        <span className="text-xl mr-1">🪙</span>
                        <span className="font-bold text-yellow-700 dark:text-yellow-400">{healthPoints} {t('healthCoins')}</span>
                    </button>
                )}
            </div>
            
            {!latestRecord ? (
                 <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">{t('dashboardNoVitals')}</p>
            ) : keyMetrics.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {keyMetrics.map(metric => (
                        <div key={metric.metric} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{metric.metric}</span>
                                <StatusIndicator status={metric.status} t={t} />
                            </div>
                            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                {metric.value} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{metric.unit}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Range: {metric.range}</p>
                        </div>
                    ))}
                </div>
            ) : (
                 <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">{t('dashboardNoVitals')}</p>
            )}
        </div>
    );
};


const HealthTrendChart: React.FC<{ records: HealthRecord[]; t: TFunction }> = ({ records, t }) => {
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    
    const { trackableMetrics, chartData } = useMemo(() => {
        const metricCounts: Record<string, number> = {};
        const allMetricsData: Record<string, { x: number; y: number }[]> = {};

        records.forEach(record => {
            record.analysis.detailedResults.forEach(metric => {
                const numericValue = parseFloat(metric.value.replace(/[^0-9.]/g, ''));
                if (!isNaN(numericValue)) {
                    if (!allMetricsData[metric.metric]) {
                        metricCounts[metric.metric] = 0;
                        allMetricsData[metric.metric] = [];
                    }
                    metricCounts[metric.metric]++;
                    allMetricsData[metric.metric].push({
                        x: record.createdAt,
                        y: numericValue
                    });
                }
            });
        });

        const trackableMetrics = Object.keys(metricCounts).filter(m => metricCounts[m] >= 2).sort();
        
        const colors = ['#14b8a6', '#3b82f6', '#ec4899', '#f97316', '#8b5cf6', '#ef4444'];
        
        const datasets = selectedMetrics.map((metric, index) => {
             const dataForMetric = allMetricsData[metric]?.sort((a, b) => a.x - b.x) || [];
             return {
                label: metric,
                data: dataForMetric.map(d => d.y),
                borderColor: colors[index % colors.length],
                backgroundColor: `${colors[index % colors.length]}33`, // Add alpha for fill
                fill: true,
                tension: 0.1,
            };
        });

        // Use the labels from the first selected metric's data
        const firstMetricData = allMetricsData[selectedMetrics[0]]?.sort((a, b) => a.x - b.x) || [];

        const chartData = {
            labels: firstMetricData.map(d => format(new Date(d.x), 'MMM d, yy')),
            datasets: datasets,
        };

        return { trackableMetrics, chartData };
    }, [records, selectedMetrics]);

    useEffect(() => {
        // Set a default metric to be selected when the component loads
        if (trackableMetrics.length > 0 && selectedMetrics.length === 0) {
            setSelectedMetrics([trackableMetrics[0]]);
        }
    }, [trackableMetrics, selectedMetrics]);
    
    const handleMetricToggle = (metric: string) => {
        setSelectedMetrics(prev => 
            prev.includes(metric) 
                ? prev.filter(m => m !== metric)
                : [...prev, metric]
        );
    };

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' as const, labels: { color: document.body.classList.contains('dark') ? '#D1D5DB' : '#4B5563' } },
            title: { display: false },
        },
        scales: {
            x: { ticks: { color: document.body.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
            y: { ticks: { color: document.body.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
        }
    };

    if (records.length < 2) return null;

    if (trackableMetrics.length === 0) {
        return (
            <div className="p-4 text-center bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                {t('dashboardChartNoMetrics')}
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                 <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('dashboardChartTitle')}</h3>
                 <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">{t('dashboardChartMultiSelectTitle')}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {trackableMetrics.map(metric => (
                            <label key={metric} className="flex items-center space-x-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedMetrics.includes(metric)}
                                    onChange={() => handleMetricToggle(metric)}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-gray-700 dark:text-gray-200">{metric}</span>
                            </label>
                        ))}
                    </div>
                 </div>
             </div>
             <div className="h-72">
                {selectedMetrics.length > 0 ? (
                    <Line options={chartOptions} data={chartData} />
                ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                        {t('dashboardChartSelectMetric')}
                    </div>
                )}
             </div>
        </div>
    );
};

const HealthRecordCard: React.FC<{ record: HealthRecord; onDelete: (id: string) => void; t: TFunction }> = ({ record, onDelete, t }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { analysis } = record;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden fade-in">
            <div className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">{record.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(record.createdAt).toLocaleString()}</p>
                    </div>
                     <div className="flex items-center space-x-2">
                        <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="p-1.5 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <svg className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{analysis.summary}</p>
            </div>
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="space-y-4">
                        {analysis.keyFindings.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('analysisKeyFindings')}</h4>
                                <div className="space-y-2">
                                    {analysis.keyFindings.map(item => (
                                        <div key={item.metric} className="p-2 border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 rounded-r-md">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-sm">{item.metric}</span>
                                                <StatusIndicator status={item.status} t={t} />
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.value} {item.unit} (Range: {item.range})</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('analysisDetailedResults')}</h4>
                            <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                                {analysis.detailedResults.map(item => (
                                    <li key={item.metric} className="py-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-sm">{item.metric}</span>
                                            <span className="text-sm">{item.value} {item.unit}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                            <span>Range: {item.range}</span>
                                            <StatusIndicator status={item.status} t={t} />
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{item.explanation}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MedicationScheduleView: React.FC<{ 
    schedules: MedicationSchedule[]; 
    onDelete: (id: string) => void;
    t: TFunction 
}> = ({ schedules, onDelete, t }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">{t('dashboardMedicationScheduleTitle')}</h3>
            {schedules.length === 0 ? (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No medication schedules set.</p>
            ) : (
                <div className="space-y-3">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-start justify-between">
                            <div className="flex-1">
                                <p className="font-bold text-gray-800 dark:text-gray-100">{schedule.medication}</p>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 space-y-1">
                                    <p><span className="font-semibold">{t('dashboardMedicationScheduleDosage')}:</span> {schedule.dosage || 'N/A'}</p>
                                    <p><span className="font-semibold">{t('dashboardMedicationScheduleFrequency')}:</span> {schedule.frequency}</p>
                                    <p><span className="font-semibold">{t('dashboardMedicationScheduleTime')}:</span> {schedule.times.join(', ')}</p>
                                    {schedule.endsAt && <p><span className="font-semibold">{t('dashboardMedicationScheduleEnds')}:</span> {new Date(schedule.endsAt).toLocaleDateString()}</p>}
                                </div>
                            </div>
                            <button onClick={() => onDelete(schedule.id)} className="p-1.5 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// New Components for Nutrition and Wellness Integration
const NutritionSummaryCard: React.FC<{ meals: MealLog[]; t: TFunction }> = ({ meals, t }) => {
    const totalCalories = meals.reduce((acc, meal) => acc + meal.calories, 0);
    const count = meals.length;
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
             <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">{t('dashboardNutritionSummary')}</h3>
             <div className="flex items-center justify-between">
                <div>
                    <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalCalories} <span className="text-sm text-gray-500 font-normal">kcal</span></p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{count} meals logged today</p>
                </div>
                 <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600 dark:text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 </div>
             </div>
        </div>
    );
};

const WellnessSummaryCard: React.FC<{ latestLog: MoodLog | undefined; t: TFunction }> = ({ latestLog, t }) => {
    if (!latestLog) return null;
    
    const moodEmojis: Record<string, string> = {
        'Great': '😄', 'Good': '🙂', 'Okay': '😐', 'Low': '😔', 'Stressed': '😫', 'Anxious': '😰',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
             <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">{t('dashboardWellnessSummary')}</h3>
             <div className="flex items-center">
                 <span className="text-3xl mr-3">{moodEmojis[latestLog.mood]}</span>
                 <div>
                     <p className="font-medium text-gray-800 dark:text-gray-200">{t(`wellnessMood${latestLog.mood}`)}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(latestLog.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                 </div>
             </div>
        </div>
    );
};

// --- NEW: Appointment and Timeline Components ---

const AppointmentsCard: React.FC<{ 
    appointments: AppointmentRecord[]; 
    onDelete: (id: string) => void; 
    t: TFunction 
}> = ({ appointments, onDelete, t }) => {
    const upcoming = appointments.filter(apt => {
        const aptDate = new Date(`${apt.date}T${apt.time}`);
        return isFuture(aptDate);
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('dashboardAppointmentsTitle')}</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
            </div>
            
            {upcoming.length === 0 ? (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-2">{t('dashboardNoAppointments')}</p>
            ) : (
                <div className="space-y-3">
                    {upcoming.map(apt => (
                        <div key={apt.id} className="p-3 border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-700/50 rounded-r-md flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{apt.specialty}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(`${apt.date}T${apt.time}`).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">ID: {apt.confirmationId}</p>
                            </div>
                            <button onClick={() => onDelete(apt.id)} className="text-gray-400 hover:text-red-500 p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

type TimelineItem = 
    | { type: 'report', data: HealthRecord, date: number }
    | { type: 'meal', data: MealLog, date: number }
    | { type: 'mood', data: MoodLog, date: number }
    | { type: 'appointment', data: AppointmentRecord, date: number };

const HealthTimeline: React.FC<{ items: TimelineItem[]; t: TFunction }> = ({ items, t }) => {
    if (items.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">{t('dashboardTimelineTitle')}</h3>
            <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-6">
                {items.map((item, index) => {
                    let icon, title, desc, colorClass;
                    const dateStr = new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

                    if (item.type === 'report') {
                        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
                        title = item.data.title;
                        desc = t('analyzerTitle');
                        colorClass = 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
                    } else if (item.type === 'meal') {
                        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
                        title = item.data.name;
                        desc = `${item.data.calories} kcal`;
                        colorClass = 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400';
                    } else if (item.type === 'mood') {
                        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
                        title = t(`wellnessMood${item.data.mood}`);
                        desc = item.data.note || 'Check-in';
                        colorClass = 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
                    } else { // Appointment
                        icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
                        title = `${t('dashboardAppointmentsTitle')}: ${item.data.specialty}`;
                        desc = new Date(`${item.data.date}T${item.data.time}`).toLocaleString();
                        colorClass = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                    }

                    return (
                        <div key={`${item.type}-${index}`} className="relative">
                            <div className={`absolute -left-[25px] w-8 h-8 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 ${colorClass}`}>
                                {icon}
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 block mb-1">{dateStr}</span>
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
        setRecords([]);
        setProfile(null);
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    setError(null);
    try {
      const [userRecords, userProfile, meals, moods, apts] = await Promise.all([
          getHealthRecords(user.uid),
          getUserProfile(user.uid),
          getMealLogs(user.uid, new Date()), // Get today's meals
          getMoodLogs(user.uid), // Get mood history
          getAppointments(user.uid)
      ]);
      setRecords(userRecords);
      setProfile(userProfile);
      setTodayMeals(meals);
      setMoodLogs(moods);
      setAppointments(apts);
    } catch (err) {
      console.error(err);
      setError(t('dashboardError'));
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteRecord = async (id: string) => {
    if (!user || !window.confirm(t('dashboardDeleteConfirm'))) return;
    try {
        await deleteHealthRecord(user.uid, id);
        setRecords(prev => prev.filter(rec => rec.id !== id));
    } catch (err) {
        console.error("Failed to delete record:", err);
        setError(t('dashboardDeleteError'));
    }
  };

  const handleDeleteSchedule = async (id: string) => {
      if (!user || !profile || !window.confirm(t('dashboardMedicationScheduleDeleteConfirm'))) return;
      try {
          const updatedSchedules = profile.medicationSchedules?.filter(s => s.id !== id) || [];
          await updateUserProfile(user.uid, { medicationSchedules: updatedSchedules });
          setProfile(prev => prev ? { ...prev, medicationSchedules: updatedSchedules } : null);
      } catch (err) {
          console.error("Failed to delete schedule:", err);
          setError("Failed to delete schedule.");
      }
  };
  
  const handleDeleteAppointment = async (id: string) => {
      if (!user || !window.confirm(t('dashboardDeleteConfirm'))) return;
      try {
          await deleteAppointment(user.uid, id);
          setAppointments(prev => prev.filter(a => a.id !== id));
      } catch (err) {
          console.error("Failed to delete appointment:", err);
      }
  };
  
  const handleExportDoctor = () => {
      if (!profile && records.length === 0) return;
      setIsExporting(true);
      
      const latestRecord = records[0];
      const meds = profile?.medications?.join(', ') || 'None';
      const allergies = profile?.allergies?.join(', ') || 'None';
      const conditions = profile?.medicalConditions?.join(', ') || 'None';
      
      let summary = `PATIENT HEALTH SUMMARY\nGenerated by Public Health AI Assistant\nDate: ${new Date().toLocaleDateString()}\n\n`;
      
      summary += `[PROFILE]\nName: ${profile?.name || 'N/A'}\nConditions: ${conditions}\nAllergies: ${allergies}\nCurrent Medications: ${meds}\n\n`;
      
      if (latestRecord) {
          summary += `[LATEST LAB REPORT - ${new Date(latestRecord.createdAt).toLocaleDateString()}]\n`;
          latestRecord.analysis.keyFindings.forEach(f => {
             summary += `- ${f.metric}: ${f.value} ${f.unit} (${f.status})\n`; 
          });
          summary += '\n';
      }
      
      if (todayMeals.length > 0) {
          const cals = todayMeals.reduce((a, b) => a + b.calories, 0);
          summary += `[NUTRITION TODAY]\nTotal Calories: ${cals}\nMeals: ${todayMeals.map(m => m.name).join(', ')}\n\n`;
      }
      
      if (moodLogs.length > 0) {
           summary += `[LATEST MOOD]\n${new Date(moodLogs[0].timestamp).toLocaleString()}: ${moodLogs[0].mood} - "${moodLogs[0].note || ''}"\n`;
      }
      
      navigator.clipboard.writeText(summary);
      alert(t('dashboardExportDoctorSuccess'));
      setIsExporting(false);
  };

  const handleRedeemSuccess = async () => {
      // Refresh profile to update points
      if (user) {
          const updatedProfile = await getUserProfile(user.uid);
          setProfile(updatedProfile);
      }
  };

  // Process items for Timeline
  const timelineItems = useMemo(() => {
      const items: TimelineItem[] = [];
      records.forEach(r => items.push({ type: 'report', data: r, date: r.createdAt }));
      todayMeals.forEach(m => items.push({ type: 'meal', data: m, date: m.timestamp }));
      moodLogs.forEach(m => items.push({ type: 'mood', data: m, date: m.timestamp }));
      appointments.forEach(a => items.push({ type: 'appointment', data: a, date: a.timestamp })); // Use creation time for timeline flow
      
      return items.sort((a, b) => b.date - a.date).slice(0, 10); // Show latest 10
  }, [records, todayMeals, moodLogs, appointments]);

  const renderContent = () => {
      if (isLoading) {
          return <div className="flex items-center justify-center py-10"><LoadingIndicator className="h-8 w-8 text-teal-600" /> <span className="ml-3 text-gray-500 dark:text-gray-400">{t('dashboardLoading')}</span></div>;
      }
      if (error) {
          return <div className="text-center text-red-500 dark:text-red-400">{error}</div>;
      }
      if (!user) {
          return <div className="text-center text-gray-500 dark:text-gray-400">{t('dashboardSaveDisabledTooltip')}</div>
      }
      if (records.length === 0 && (!profile?.medicationSchedules || profile.medicationSchedules.length === 0) && todayMeals.length === 0 && moodLogs.length === 0 && appointments.length === 0) {
          return (
              <div className="text-center py-10 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">{t('dashboardEmptyTitle')}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('dashboardEmptyBody')}</p>
              </div>
          );
      }
      return (
          <div className="space-y-6">
              {/* Action Bar */}
              <div className="flex justify-end">
                  <button 
                    onClick={handleExportDoctor}
                    disabled={isExporting}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                      {t('dashboardExportDoctor')}
                  </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Summaries and Timeline */}
                  <div className="lg:col-span-2 space-y-6">
                      <AIInsights /> {/* Inserted Insight Engine */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SummaryCards latestRecord={records[0]} t={t} healthPoints={profile?.healthPoints} onOpenShop={() => setIsShopOpen(true)} />
                          <WearableStats />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <QueueStatus />
                          <NutritionSummaryCard meals={todayMeals} t={t} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <WellnessSummaryCard latestLog={moodLogs[0]} t={t} />
                      </div>
                      <AIHealthSummary records={records} t={t} />
                      <HealthTrendChart records={records} t={t} />
                  </div>

                  {/* Right Column: Appointments and Schedules */}
                  <div className="space-y-6">
                      <AppointmentsCard appointments={appointments} onDelete={handleDeleteAppointment} t={t} />
                      {profile?.medicationSchedules && profile.medicationSchedules.length > 0 && <MedicationScheduleView schedules={profile.medicationSchedules} onDelete={handleDeleteSchedule} t={t} />}
                      <HealthTimeline items={timelineItems} t={t} />
                  </div>
              </div>

              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4">Detailed History</h3>
              {records.map(record => (
                  <HealthRecordCard key={record.id} record={record} onDelete={handleDeleteRecord} t={t} />
              ))}

              {/* Rewards Shop Modal */}
              {isShopOpen && user && (
                  <RewardsShop 
                      userHealthPoints={profile?.healthPoints || 0}
                      userId={user.uid}
                      onClose={() => setIsShopOpen(false)}
                      onRedeemSuccess={handleRedeemSuccess}
                  />
              )}
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('dashboardTitle')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboardSubtitle')}</p>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
