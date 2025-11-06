import { useState, useEffect, useRef, useCallback } from 'react';

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

// Map of commands to their callback functions
type VoiceCommands = Record<string, () => void>;

export const useVoiceCommands = (
  commands: VoiceCommands,
  language: 'en' | 'th',
  t: (key: string) => string
) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const commandsRef = useRef(commands);

  // Keep the commands ref up to date without re-triggering the effect
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  const isCommandSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  
  const stopListening = useCallback(() => {
    if (isListening) {
      setIsListening(false);
    }
  }, [isListening]);

  useEffect(() => {
    if (!isListening || !isCommandSupported) {
      return;
    }

    const WAKE_WORD = t('voiceWakeWord').toLowerCase();
    const GO_TO_SLEEP_COMMAND = t('voiceSleepCommand').toLowerCase();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'th' ? 'th-TH' : 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      const transcript = finalTranscript.toLowerCase().trim();
      if (transcript.startsWith(WAKE_WORD)) {
        const commandPhrase = transcript.substring(WAKE_WORD.length).trim();
        console.log(`[Voice Command] Heard command: "${commandPhrase}"`);
        
        // Handle sleep command
        if (commandPhrase === GO_TO_SLEEP_COMMAND) {
             stopListening();
             return;
        }
        
        // Find and execute the command
        const commandKeys = Object.keys(commandsRef.current);
        const foundCommand = commandKeys.find(key => commandPhrase.includes(key));
        
        if (foundCommand) {
          console.log(`[Voice Command] Executing: "${foundCommand}"`);
          commandsRef.current[foundCommand]();
          // Stop and restart to clear the transcript buffer
          recognition.stop();
        }
      }
    };

    recognition.onend = () => {
      // If we are still supposed to be listening, restart recognition.
      // This handles mic timeouts or when we stop it after a command.
      if (isListening) {
        recognition.start();
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // Ignore common, recoverable errors that don't require stopping the service.
      // 'aborted' is expected when we programmatically stop recognition after a command.
      if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') {
        // Don't stop listening
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
    console.log('[Voice Command] Listening for wake word...');

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isListening, isCommandSupported, language, t, stopListening]);

  const startListening = useCallback(() => {
    if (!isListening) {
      setIsListening(true);
    }
  }, [isListening]);

  return { isListening, startListening, stopListening, isCommandSupported };
};