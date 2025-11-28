
import React, { useState, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../hooks/useAuth';
import { processFiles, SUPPORTED_IMAGE_MIME_TYPES } from '../utils/fileUtils';
import { identifyMedication } from '../services/medicationService';
import { getUserProfile, updateUserProfile } from '../services/firebase';
import type { AttachedFile, DrugAnalysis, UserProfile } from '../types';
import LoadingIndicator from './LoadingIndicator';
import Toast from './Toast';

const SmartPharmacy: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'scan' | 'cabinet'>('scan');
    const [file, setFile] = useState<AttachedFile | null>(null);
    const [analysis, setAnalysis] = useState<DrugAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch profile on mount to show cabinet and for safety checks
    React.useEffect(() => {
        if (user) {
            getUserProfile(user.uid).then(profile => setUserProfile(profile));
        }
    }, [user]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
             const processed = await processFiles([selectedFile], SUPPORTED_IMAGE_MIME_TYPES, () => alert(t('analyzerErrorInvalidFile')));
             if (processed.length > 0) {
                 setFile(processed[0]);
                 setAnalysis(null); // Reset previous analysis
             }
        }
    };

    const handleScan = async () => {
        if (!file) return;
        setIsLoading(true);
        try {
            const result = await identifyMedication(file, userProfile);
            setAnalysis(result);
        } catch (error) {
            console.error(error);
            setToastMessage(t('errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToCabinet = async () => {
        if (!user || !analysis) return;
        setIsSaving(true);
        try {
            const currentMeds = userProfile?.medications || [];
            // Avoid duplicates
            if (!currentMeds.includes(analysis.drugName)) {
                const updatedMeds = [...currentMeds, analysis.drugName];
                await updateUserProfile(user.uid, { medications: updatedMeds });
                setUserProfile(prev => prev ? { ...prev, medications: updatedMeds } : null);
                setToastMessage(t('pharmacyAddedSuccess'));
            } else {
                setToastMessage(t('pharmacyAlreadyExists'));
            }
        } catch (error) {
            console.error(error);
            setToastMessage(t('profileSaveError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveFromCabinet = async (medName: string) => {
        if (!user || !userProfile) return;
        if (!confirm(t('dashboardDeleteConfirm'))) return;
        
        try {
            const updatedMeds = (userProfile.medications || []).filter(m => m !== medName);
            await updateUserProfile(user.uid, { medications: updatedMeds });
            setUserProfile({ ...userProfile, medications: updatedMeds });
        } catch (error) {
            console.error(error);
            setToastMessage(t('profileSaveError'));
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-teal-700 dark:text-teal-300">{t('pharmacyTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('pharmacySubtitle')}</p>
                </div>

                <div className="flex space-x-2 justify-center bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 w-fit mx-auto">
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'scan' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        {t('pharmacyTabScan')}
                    </button>
                    <button
                        onClick={() => setActiveTab('cabinet')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'cabinet' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        {t('pharmacyTabCabinet')}
                    </button>
                </div>

                {activeTab === 'scan' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            {!file ? (
                                <div 
                                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <p className="text-gray-600 dark:text-gray-300">{t('pharmacyUploadPrompt')}</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <img src={`data:${file.mimeType};base64,${file.base64}`} alt="Medication" className="max-h-64 rounded-lg shadow-sm mb-4" />
                                    <div className="flex space-x-3">
                                        <button onClick={() => { setFile(null); setAnalysis(null); }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                                            {t('cancel')}
                                        </button>
                                        <button 
                                            onClick={handleScan} 
                                            disabled={isLoading}
                                            className="px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold flex items-center disabled:opacity-50"
                                        >
                                            {isLoading ? <LoadingIndicator className="h-4 w-4 text-white mr-2" /> : null}
                                            {t('pharmacyAnalyzeButton')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {analysis && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 fade-in">
                                {/* Safety Badge */}
                                <div className={`mb-4 p-3 rounded-lg flex items-start ${analysis.safetyCheck.safe ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
                                    {analysis.safetyCheck.safe ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-sm">{analysis.safetyCheck.safe ? t('pharmacySafetySafe') : t('pharmacySafetyWarning')}</h3>
                                        {!analysis.safetyCheck.safe && <p className="text-xs mt-1">{analysis.safetyCheck.warningMessage}</p>}
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{analysis.drugName}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{analysis.genericName}</p>

                                <div className="space-y-3 text-sm">
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300">{t('pharmacyLabelIndication')}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{analysis.indication}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300">{t('pharmacyLabelUsage')}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{analysis.dosageInstruction}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300">{t('pharmacyLabelSideEffects')}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{analysis.commonSideEffects.join(', ')}</p>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold text-orange-600 dark:text-orange-400">{t('pharmacyLabelWarnings')}</h4>
                                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                                            {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                </div>

                                {user && (
                                    <button
                                        onClick={handleAddToCabinet}
                                        disabled={isSaving}
                                        className="mt-6 w-full py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSaving ? t('saving') : t('pharmacyAddToCabinet')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'cabinet' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                         <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('pharmacyMyCabinetTitle')}</h2>
                         {!user ? (
                              <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('profileSignInPromptBody')}</p>
                         ) : (!userProfile?.medications || userProfile.medications.length === 0) ? (
                             <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('pharmacyCabinetEmpty')}</p>
                         ) : (
                             <div className="space-y-2">
                                 {userProfile.medications.map((med, index) => (
                                     <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                         <div className="flex items-center">
                                             <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full mr-3 text-blue-600 dark:text-blue-300">
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                             </div>
                                             <span className="font-medium text-gray-800 dark:text-gray-200">{med}</span>
                                         </div>
                                         <button onClick={() => handleRemoveFromCabinet(med)} className="text-red-500 hover:text-red-700 p-2">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                )}
            </div>
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
        </div>
    );
};

export default SmartPharmacy;
