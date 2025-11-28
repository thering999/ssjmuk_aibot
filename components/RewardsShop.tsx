
import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { RewardItem } from '../types';
import { deductHealthPoints } from '../services/firebase';
import LoadingIndicator from './LoadingIndicator';

interface RewardsShopProps {
    userHealthPoints: number;
    userId: string;
    onClose: () => void;
    onRedeemSuccess: () => void;
}

const RewardsShop: React.FC<RewardsShopProps> = ({ userHealthPoints, userId, onClose, onRedeemSuccess }) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [redeemedItem, setRedeemedItem] = useState<RewardItem | null>(null);

    const rewards: RewardItem[] = [
        { id: 'r1', name: 'Vitamin C Pack', description: 'A 30-day supply of Vitamin C supplements.', cost: 50, icon: '🍊' },
        { id: 'r2', name: 'Health Check Discount', description: '10% off your next health check-up.', cost: 100, icon: '🏥' },
        { id: 'r3', name: 'Priority Queue', description: 'Skip the queue for your next appointment.', cost: 200, icon: '⚡' },
        { id: 'r4', name: 'Healthy Snack Box', description: 'A box of curated healthy snacks.', cost: 80, icon: '🥗' },
    ];

    const handleRedeem = async (item: RewardItem) => {
        if (userHealthPoints < item.cost) return;
        
        if (!confirm(`Redeem ${item.name} for ${item.cost} coins?`)) return;

        setIsLoading(true);
        try {
            await deductHealthPoints(userId, item.cost);
            setRedeemedItem(item);
            onRedeemSuccess();
        } catch (error) {
            console.error("Redemption failed:", error);
            alert("Failed to redeem. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (redeemedItem) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-bounce-in">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 mb-2">Redeemed!</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        You have successfully redeemed <strong>{redeemedItem.name}</strong>.
                    </p>
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Show this code to staff:</p>
                        <p className="text-2xl font-mono font-bold text-gray-800 dark:text-gray-100 tracking-widest">
                            {Math.random().toString(36).substr(2, 8).toUpperCase()}
                        </p>
                    </div>
                    <button 
                        onClick={() => { setRedeemedItem(null); onClose(); }}
                        className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-teal-50 dark:bg-teal-900/20 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Health Rewards Shop</h2>
                        <p className="text-teal-600 dark:text-teal-400 font-medium flex items-center mt-1">
                            Your Balance: <span className="text-xl font-bold ml-2">{userHealthPoints} 🪙</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Items Grid */}
                <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rewards.map(item => (
                        <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow bg-white dark:bg-gray-800 relative overflow-hidden">
                            <div className="text-4xl mb-3">{item.icon}</div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{item.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">{item.description}</p>
                            
                            <div className="flex justify-between items-center mt-auto">
                                <span className="font-bold text-yellow-600 dark:text-yellow-500">{item.cost} Coins</span>
                                <button
                                    onClick={() => handleRedeem(item)}
                                    disabled={userHealthPoints < item.cost || isLoading}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                        userHealthPoints >= item.cost 
                                        ? 'bg-teal-600 text-white hover:bg-teal-700' 
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                    }`}
                                >
                                    {isLoading ? <LoadingIndicator className="h-4 w-4" /> : 'Redeem'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RewardsShop;
