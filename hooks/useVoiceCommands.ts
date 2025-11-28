import { useState, useEffect, useRef, useCallback } from 'react';
import { interpretVoiceCommand } from '../services/chatService';
import type { TFunction } from 'i18next';

// Define a minimal interface for SpeechRecognition to satisfy TypeScript
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onend: () => void;
  onerror: (event: any) => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

// Map of command function names to their callback functions
type VoiceCommandActions = Record<string, () => void>;

export const useVoiceCommands = (
  actions: VoiceCommandActions,
  language: 'en' | 'th' | 'lo',
  t: TFunction,
  onShowToast: (message: string) => void
) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const actionsRef = useRef(actions);
  const isProcessingCommand = useRef(false); // To prevent multiple API calls

  // Keep the actions ref up to date without re-triggering the effect
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const isCommandSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isListening && isCommandSupported) {
      setIsListening(true);
    }
  }, [isListening, isCommandSupported]);

  useEffect(() => {
    if (!isListening || !isCommandSupported) {
      if (recognitionRef.current) {
          recognitionRef.current.stop();
      }
      return;
    }

    const WAKE_WORD = t('voiceWakeWord').toLowerCase();
    const GO_TO_SLEEP_COMMAND = t('voiceSleepCommand').toLowerCase();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = false; // We only want the final transcript
    recognition.lang = language === 'th' ? 'th-TH' : (language === 'lo' ? 'lo-LA' : 'en-US');

    recognition.onresult = async (event) => {
      if (isProcessingCommand.current) return;

      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      
      if (transcript.startsWith(WAKE_WORD)) {
        const commandPhrase = transcript.substring(WAKE_WORD.length).trim();
        console.log(`[Voice Command] Heard command phrase: "${commandPhrase}"`);
        
        if (commandPhrase === GO_TO_SLEEP_COMMAND) {
             onShowToast(t('toastVoiceSleep'));
             stopListening();
             return;
        }
        
        if (commandPhrase) {
            isProcessingCommand.current = true;
            onShowToast(t('toastVoiceProcessing'));
            
            const functionNameToCall = await interpretVoiceCommand(commandPhrase, t);
            
            if (functionNameToCall && actionsRef.current[functionNameToCall]) {
                console.log(`[Voice Command] Executing: "${functionNameToCall}"`);
                actionsRef.current[functionNameToCall]();
            } else {
                 onShowToast(t('toastVoiceUnrecognized'));
                 console.log(`[Voice Command] Unrecognized or unmapped command: "${commandPhrase}"`);
            }

            // Stop and restart to clear buffer and wait for next wake word
            recognition.stop();
            isProcessingCommand.current = false;
        }
      }
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
       if (event.error !== 'no-speech' && event.error !== 'aborted') {
         setIsListening(false);
       }
    };

    recognition.start();
    console.log('[Voice Command] Listening for wake word...');

    return () => {
      if (recognitionRef.current) {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
          recognitionRef.current = null;
      }
    };
  }, [isListening, isCommandSupported, language, t, stopListening, onShowToast]);

  return { isListening, startListening, stopListening, isCommandSupported };
};