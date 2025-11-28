import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { getUserProfile, updateUserProfile } from '../services/firebase';
import type { UserProfile } from '../types';
import LoadingIndicator from './LoadingIndicator';
import Toast from './Toast';

const Profile: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [profile, setProfile] = useState<Partial<UserProfile>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            getUserProfile(user.uid)
                .then(userProfile => {
                    if (userProfile) {
                        setProfile(userProfile);
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // For array fields, split by comma
        if (['interests', 'preferences', 'allergies', 'medicalConditions', 'medications', 'healthGoals'].includes(name)) {
             setProfile(prev => ({ ...prev, [name]: value.split(',').map(item => item.trim()).filter(Boolean) }));
        } else {
            setProfile(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; // name is 'name' or 'phone'
        setProfile(prev => ({
            ...prev,
            emergencyContact: {
                ...(prev.emergencyContact || { name: '', phone: '' }),
                [name]: value
            }
        }));
    };
    
    // Helper to join array fields for display in input
    const getArrayValue = (field?: string[]) => field?.join(', ') || '';

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateUserProfile(user.uid, profile);
            setToastMessage(t('profileSaveSuccess'));
        } catch (error) {
            console.error(error);
            setToastMessage(t('profileSaveError'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LoadingIndicator className="h-8 w-8 text-teal-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('profileSignInPromptTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('profileSignInPromptBody')}</p>
            </div>
        );
    }
    
    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-3xl mx-auto">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{t('profileTitle')}</h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{t('profileSubtitle')}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{t('profileSectionPersonal')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <input type="text" name="name" id="name" value={profile.name || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                            </div>
                             <div>
                                <label htmlFor="work" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Work / Occupation</label>
                                <input type="text" name="work" id="work" value={profile.work || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                            </div>
                        </div>
                         <div className="mt-4">
                            <label htmlFor="interests" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Interests</label>
                            <input type="text" name="interests" id="interests" placeholder="e.g., hiking, reading, cooking" value={getArrayValue(profile.interests)} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                             <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate with commas</p>
                        </div>
                         <div className="mt-4">
                            <label htmlFor="preferences" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferences</label>
                            <input type="text" name="preferences" id="preferences" placeholder="e.g., prefer simple explanations, vegetarian" value={getArrayValue(profile.preferences)} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                             <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate with commas</p>
                        </div>
                    </div>
                    
                     <div>
                        <h2 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{t('profileSectionHealth')}</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Allergies</label>
                                <input type="text" name="allergies" id="allergies" placeholder="e.g., peanuts, pollen" value={getArrayValue(profile.allergies)} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate with commas</p>
                            </div>
                            <div>
                                <label htmlFor="medicalConditions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Medical Conditions</label>
                                <input type="text" name="medicalConditions" id="medicalConditions" placeholder="e.g., asthma, hypertension" value={getArrayValue(profile.medicalConditions)} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate with commas</p>
                            </div>
                            <div>
                                <label htmlFor="medications" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Medications</label>
                                <input type="text" name="medications" id="medications" placeholder="e.g., albuterol inhaler, lisinopril" value={getArrayValue(profile.medications)} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate with commas</p>
                            </div>
                             <div>
                                <label htmlFor="healthGoals" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Health Goals</label>
                                <input type="text" name="healthGoals" id="healthGoals" placeholder="e.g., lose 5kg, run a 5k" value={getArrayValue(profile.healthGoals)} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separate with commas</p>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{t('profileSectionEmergency')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="econtact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profileEmergencyName')}</label>
                                <input type="text" name="name" id="econtact-name" value={profile.emergencyContact?.name || ''} onChange={handleEmergencyContactChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                            </div>
                             <div>
                                <label htmlFor="econtact-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profileEmergencyPhone')}</label>
                                <input type="tel" name="phone" id="econtact-phone" value={profile.emergencyContact?.phone || ''} onChange={handleEmergencyContactChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-5">
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-400"
                            >
                                {isSaving ? t('saving') : t('saveChanges')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
             {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
        </div>
    );
};

export default Profile;
