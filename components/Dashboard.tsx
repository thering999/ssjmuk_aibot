import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { getHealthRecords, deleteHealthRecord } from '../services/healthDashboardService';
import type { HealthRecord, AnalyzedMetric } from '../types';
import type { TFunction } from 'i18next';
import { Line } from 'react-chartjs-2';
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
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

const SummaryCards: React.FC<{ latestRecord: HealthRecord | undefined; t: TFunction }> = ({ latestRecord, t }) => {
    const keyMetrics = useMemo(() => {
        if (!latestRecord) return [];
        const KEY_METRIC_NAMES = ['Glucose', 'Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'Hemoglobin'];
        return latestRecord.analysis.detailedResults.filter(metric => 
            KEY_METRIC_NAMES.includes(metric.metric)
        );
    }, [latestRecord]);

    if (!latestRecord) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('dashboardSummaryTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('dashboardSummarySubtitle', { date: new Date(latestRecord.createdAt).toLocaleDateString() })}</p>
            {keyMetrics.length > 0 ? (
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


const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!user) {
        setRecords([]);
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    setError(null);
    try {
      const userRecords = await getHealthRecords(user.uid);
      setRecords(userRecords);
    } catch (err) {
      console.error(err);
      setError(t('dashboardError'));
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    if (!user || !window.confirm(t('dashboardDeleteConfirm'))) return;

    try {
        await deleteHealthRecord(user.uid, id);
        setRecords(prev => prev.filter(rec => rec.id !== id));
    } catch (err) {
        console.error("Failed to delete record:", err);
        setError(t('dashboardDeleteError'));
    }
  };

  const renderContent = () => {
      if (isLoading) {
          return <div className="text-center text-gray-500 dark:text-gray-400">{t('dashboardLoading')}</div>;
      }
      if (error) {
          return <div className="text-center text-red-500 dark:text-red-400">{error}</div>;
      }
      if (!user) {
          return <div className="text-center text-gray-500 dark:text-gray-400">{t('dashboardSaveDisabledTooltip')}</div>
      }
      if (records.length === 0) {
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
              <SummaryCards latestRecord={records[0]} t={t} />
              <HealthTrendChart records={records} t={t} />
              {records.map(record => (
                  <HealthRecordCard key={record.id} record={record} onDelete={handleDelete} t={t} />
              ))}
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl mx-auto">
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