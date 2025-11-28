
import type { Appointment } from '../types';
import { saveAppointment } from './firebase';

/**
 * A mock function to simulate booking a doctor's appointment.
 * Now integrates with Firebase to save the record.
 * @param specialty - The medical specialty for the appointment.
 * @param date - The requested date.
 * @param time - The requested time.
 * @param userId - The user's ID (optional, if logged in).
 * @returns A promise that resolves to a confirmation or failure message.
 */
export const bookAppointment = async (
    specialty: string,
    date: string,
    time: string,
    userId?: string
): Promise<Appointment> => {
    console.log(`[Tool Executed] bookAppointment with specialty: "${specialty}", date: "${date}", time: "${time}", userId: "${userId}"`);
    
    // Simulate network delay and simple validation
    await new Promise(resolve => setTimeout(resolve, 800)); 

    try {
        const appointmentDate = new Date(`${date}T${time}`);
        if (isNaN(appointmentDate.getTime())) {
            throw new Error("Invalid date or time format.");
        }

        if (appointmentDate < new Date()) {
            return {
                success: false,
                message: `Failed to book appointment: The requested time ${date} at ${time} is in the past.`,
            };
        }

        // Generate Confirmation ID
        const confirmationId = `BK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // If user is logged in, save to Firebase
        if (userId) {
            try {
                await saveAppointment(userId, {
                    specialty,
                    date,
                    time,
                    confirmationId,
                    timestamp: Date.now()
                });
            } catch (dbError) {
                console.error("Failed to save appointment to database:", dbError);
                // Proceeding even if save fails, but normally we might want to alert the user
            }
        }

        return {
            success: true,
            confirmationId: confirmationId,
            message: `Appointment confirmed with a ${specialty} specialist on ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Your confirmation ID is ${confirmationId}.`,
        };

    } catch (e: any) {
         return {
            success: false,
            message: `An error occurred while booking: ${e.message}`,
        };
    }
};
