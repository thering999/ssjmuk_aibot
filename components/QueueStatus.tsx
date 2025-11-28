
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { QueueTicket } from '../types';

const QueueStatus: React.FC = () => {
  const { t } = useTranslation();
  
  // Mock data for demonstration
  const myTicket: QueueTicket = {
    id: 'Q-123',
    hospitalName: 'รพ.มุกดาหาร',
    department: 'อายุรกรรม (Medicine)',
    queueNumber: 'A-042',
    currentQueue: 'A-035',
    estimatedWaitMinutes: 35
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {t('queueTitle')}
        </h3>
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">{t('queueStatusWaiting')}</span>
      </div>
      
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 text-center border border-teal-100 dark:border-teal-800">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{myTicket.hospitalName} - {myTicket.department}</p>
        <div className="flex justify-center items-end space-x-4 my-2">
            <div className="text-center">
                <p className="text-xs text-gray-500">{t('queueYourNumber')}</p>
                <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">{myTicket.queueNumber}</p>
            </div>
            <div className="text-center pb-1">
                <p className="text-xs text-gray-500">{t('queueCurrent')}</p>
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">{myTicket.currentQueue}</p>
            </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          {t('queueWaitTime')} <span className="font-bold text-teal-600">{myTicket.estimatedWaitMinutes}</span> {t('queueMinutes')}
        </p>
      </div>
    </div>
  );
};

export default QueueStatus;
