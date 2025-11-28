
import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { FamilyMember } from '../types';

const FamilyConnect: React.FC = () => {
    const { t } = useTranslation();
    
    // Mock data
    const [members, setMembers] = useState<FamilyMember[]>([
        { 
            id: '1', 
            name: 'Grandma Malee', 
            relation: 'Grandmother', 
            status: 'Normal', 
            lastCheckIn: Date.now() - 3600000, // 1 hour ago
            sharedMetrics: { steps: 1200, mood: 'Good' } 
        },
        { 
            id: '2', 
            name: 'Dad', 
            relation: 'Father', 
            status: 'Need Attention', 
            lastCheckIn: Date.now() - 86400000, // 1 day ago
            sharedMetrics: { steps: 500, mood: 'Stressed' }
        }
    ]);

    return (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-3xl mx-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-teal-700 dark:text-teal-300">{t('familyTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('familySubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {members.map(member => (
                        <div key={member.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div className="flex items-center mb-3 sm:mb-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white mr-4 ${member.status === 'Normal' ? 'bg-green-500' : 'bg-orange-500'}`}>
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{member.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.relation} • Last seen {new Date(member.lastCheckIn).toLocaleTimeString()}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:items-end w-full sm:w-auto space-y-2">
                                <div className="flex items-center space-x-4 text-sm">
                                    <span className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        {member.sharedMetrics?.steps} steps
                                    </span>
                                    <span className="flex items-center text-gray-600 dark:text-gray-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
                                        </svg>
                                        {member.sharedMetrics?.mood}
                                    </span>
                                </div>
                                <div className="flex space-x-2 w-full">
                                    <button className="flex-1 sm:flex-none px-3 py-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 rounded-md text-sm font-medium hover:bg-teal-200 dark:hover:bg-teal-800/60">
                                        {t('familyCall')}
                                    </button>
                                    <button className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                                        {t('familyViewDetails')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <button className="mt-6 w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    {t('familyAddMember')}
                </button>
            </div>
        </div>
    );
};

export default FamilyConnect;
