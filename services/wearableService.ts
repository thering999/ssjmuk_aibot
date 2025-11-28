
import type { WearableData } from '../types';

// Simulate fetching data from an API (e.g., Google Fit)
export const fetchWearableData = async (): Promise<WearableData> => {
    // In a real app, this would use the Google Fit REST API with OAuth token
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

    // Generate somewhat random realistic data
    const steps = Math.floor(Math.random() * (12000 - 2000) + 2000);
    const heartRate = Math.floor(Math.random() * (100 - 60) + 60);
    const caloriesBurned = Math.floor(steps * 0.04) + 1500; // Rough estimate
    const sleepScore = Math.floor(Math.random() * (95 - 60) + 60);
    const spo2 = Math.floor(Math.random() * (100 - 95) + 95);

    return {
        steps,
        heartRate,
        caloriesBurned,
        sleepScore,
        spo2,
        sleepStages: {
            deep: Math.floor(Math.random() * 60) + 30,
            light: Math.floor(Math.random() * 180) + 120,
            rem: Math.floor(Math.random() * 60) + 30,
            awake: Math.floor(Math.random() * 30) + 10,
        },
        lastSync: Date.now(),
    };
};
