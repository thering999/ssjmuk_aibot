import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { db } from './firebase'; // Assuming db is exported from firebase.ts
import type { HealthRecord } from '../types';

const getHealthRecordsCollection = (uid: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return db.collection('users').doc(uid).collection('healthRecords');
};

export const saveHealthRecord = async (uid: string, recordData: Omit<HealthRecord, 'id' | 'userId'>): Promise<string> => {
    const healthRecordsRef = getHealthRecordsCollection(uid);
    const docRef = await healthRecordsRef.add({
        ...recordData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Use server timestamp for consistency
    });
    return docRef.id;
};

export const getHealthRecords = async (uid: string): Promise<HealthRecord[]> => {
    const healthRecordsRef = getHealthRecordsCollection(uid);
    const q = healthRecordsRef.orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    
    return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            userId: uid,
            title: data.title,
            analysis: data.analysis,
            createdAt: (data.createdAt as firebase.firestore.Timestamp).toMillis(),
        } as HealthRecord;
    });
};

export const deleteHealthRecord = async (uid: string, recordId: string): Promise<void> => {
    const recordDocRef = getHealthRecordsCollection(uid).doc(recordId);
    await recordDocRef.delete();
};
