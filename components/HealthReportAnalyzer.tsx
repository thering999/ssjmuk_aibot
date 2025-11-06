
import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { processFiles } from '../utils/fileUtils';
import { analyzeHealthReport } from '../services/healthReportService';
import { saveHealthRecord } from '../services/healthDashboardService';
import type { AttachedFile, HealthReportAnalysis, AnalyzedMetric } from '../types';

const StatusIndicator: React.FC<{ status: AnalyzedMetric['status'] }> = ({ status }) => {
    const { t } = useTranslation();
    const statusMap = {
        High: { text: t('statusHigh'), color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> },
        Low: { text: t('statusLow'), color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> },
        Normal: { text: t('statusNormal'), color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> },
        Abnormal: { text: t('statusAbnormal'), color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
        Unavailable: { text: 'N/A', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200', icon: null },
    };
    const { text, color, icon } = statusMap[status] || statusMap.Unavailable;
    return (
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {icon}
            <span>{text}</span>
        </div>
    );
};

interface HealthReportAnalyzerProps {
    onShowToast: (message: string) => void;
}

const HealthReportAnalyzer: React.FC<HealthReportAnalyzerProps> = ({ onShowToast }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [file, setFile] = useState<AttachedFile | null>(null);
    const [analysis, setAnalysis] = useState<HealthReportAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (selectedFile: File) => {
        if (selectedFile && selectedFile.type.startsWith('image/')) {
            try {
                const [processedFile] = await processFiles([selectedFile]);
                setFile(processedFile);
                setAnalysis(null);
                setError(null);
            } catch (err) {
                console.error(err);
                setError("Failed to process file.");
            }
        } else {
            setError("Please upload a valid image file.");
        }
    };

    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>, enter: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(enter);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        handleDrag(e, false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    }, [handleDrag]);

    const handleAnalyze = async () => {
        if (!file) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await analyzeHealthReport(file);
            setAnalysis(result);
        } catch (err) {
            console.error(err);
            setError(t('analyzerError'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = async () => {
        if (!analysis || !user) return;
        
        const defaultTitle = `Report - ${new Date().toLocaleDateString()}`;
        const title = window.prompt(t('dashboardSavePrompt'), defaultTitle);

        if (title) { // Proceed if user clicks OK, even with empty string
            setIsSaving(true);
            try {
                await saveHealthRecord(user.uid, {
                    title: title || defaultTitle,
                    createdAt: Date.now(),
                    analysis,
                });
                onShowToast(t('dashboardSaveSuccess'));
            } catch (err) {
                console.error("Failed to save report:", err);
                onShowToast(t('dashboardSaveError'));
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center p-4 md:p-6 overflow-y-auto bg-gray-100 dark:bg-gray-900/50">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('analyzerTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('analyzerSubtitle')}</p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-4 rounded-r-md mb-6">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200">{t('analyzerDisclaimerTitle')}</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">{t('analyzerDisclaimerBody')}</p>
                </div>
                
                {!file && (
                     <div
                        onDragEnter={(e) => handleDrag(e, true)}
                        onDragLeave={(e) => handleDrag(e, false)}
                        onDragOver={(e) => handleDrag(e, true)}
                        onDrop={handleDrop}
                        className={`w-full p-10 border-2 border-dashed rounded-xl transition-colors duration-200 ${isDragging ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} accept="image/*" className="hidden" />
                        <div className="flex flex-col items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('analyzerUploadPrompt').split(', or ')[0]}, or{' '}
                                <button onClick={() => fileInputRef.current?.click()} className="font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300 focus:outline-none">
                                    {t('analyzerUploadPrompt').split(', or ')[1]}
                                </button>
                            </p>
                        </div>
                    </div>
                )}
                
                {file && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Uploaded Report</h3>
                                <img src={`data:${file.mimeType};base64,${file.base64}`} alt="Health report preview" className="rounded-md border border-gray-200 dark:border-gray-700 max-h-[500px] w-full object-contain" />
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isLoading}
                                    className="mt-4 w-full px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            {t('analyzerLoading')}
                                        </>
                                    ) : (
                                        t('analyzerButtonText')
                                    )}
                                </button>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold">AI Analysis</h3>
                                     {analysis && (
                                        <div title={!user ? t('dashboardSaveDisabledTooltip') : undefined}>
                                            <button 
                                                onClick={handleSave} 
                                                disabled={isSaving || !user}
                                                className="px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                                {isSaving ? t('dashboardSaving') : t('dashboardSave')}
                                            </button>
                                        </div>
                                     )}
                                </div>

                                {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>}
                                {analysis ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">{t('analysisSummary')}</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{analysis.summary}</p>
                                        </div>
                                        {analysis.keyFindings.length > 0 && (
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('analysisKeyFindings')}</h4>
                                                <div className="space-y-2">
                                                    {analysis.keyFindings.map(item => (
                                                        <div key={item.metric} className="p-2 border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 rounded-r-md">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-semibold text-sm">{item.metric}</span>
                                                                <StatusIndicator status={item.status} />
                                                            </div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.value} {item.unit} (Range: {item.range})</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                         <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
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
                                                            <StatusIndicator status={item.status} />
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{item.explanation}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 dark:text-gray-400 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                        Analysis results will appear here.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HealthReportAnalyzer;