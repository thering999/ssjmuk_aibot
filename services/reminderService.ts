// @google/genai-fix: Updated import for `parse` to be compatible with date-fns v2+
import { isFuture, differenceInMilliseconds } from 'date-fns';
import { parse } from 'date-fns/parse';

/**
 * Parses a time string (like "8:00 AM", "tomorrow at 9pm") and calculates the delay in milliseconds.
 * This is a very basic parser and could be improved with a more robust library or AI-based time extraction.
 * @param time - The string representation of the time.
 * @returns The delay in milliseconds from now, or null if the time is in the past or invalid.
 */
const calculateDelay = (time: string): number | null => {
    // This is a simplified parser. A real-world app would use a more robust NLP library.
    // For this demo, we'll handle simple cases.
    const now = new Date();
    let reminderDate: Date | null = null;
    
    // Case 1: "at 8:00 AM", "at 9pm"
    const timeMatch = time.match(/(\d{1,2}:\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
        const parsedTime = parse(timeMatch[0], 'h:mm a', new Date());
        reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parsedTime.getHours(), parsedTime.getMinutes());
        if (!isFuture(reminderDate)) {
            // If the time is already past today, set it for tomorrow
            reminderDate.setDate(reminderDate.getDate() + 1);
        }
    }
    // Case 2: "tomorrow at ..."
    else if (time.toLowerCase().includes("tomorrow")) {
        const timePartMatch = time.match(/(\d{1,2}(:\d{2})?)\s*(am|pm)?/i);
        if (timePartMatch) {
            const parsedTime = parse(timePartMatch[0], 'h:mm a', new Date());
             reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, parsedTime.getHours(), parsedTime.getMinutes());
        }
    }

    if (reminderDate && isFuture(reminderDate)) {
        return differenceInMilliseconds(reminderDate, now);
    }

    return null;
};


/**
 * Requests permission and sets a browser notification for a medication reminder.
 * @param time - The time for the reminder (e.g., "8:00 AM").
 * @param medication - The name of the medication.
 * @returns A promise that resolves to a confirmation or error message.
 */
export const setReminder = async (
    time: string,
    medication: string = 'your medication'
): Promise<string> => {
    if (!('Notification' in window)) {
        return "Sorry, your browser does not support notifications.";
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        return "Notification permission was denied. I can't set a reminder.";
    }
    
    const delay = calculateDelay(time);

    if (delay === null) {
        return `I couldn't understand the time "${time}" or it's in the past. Please try again with a specific time like "at 5 PM" or "tomorrow at 9 AM".`;
    }

    const reminderTime = new Date(Date.now() + delay);

    setTimeout(() => {
        new Notification('Medication Reminder', {
            body: `It's time to take ${medication}.`,
            icon: '/vite.svg', // A default icon
        });
    }, delay);

    return `OK. I will remind you to take ${medication} at ${reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
};
