import { useState, useRef, useEffect, useCallback } from 'react';
import type { SupportedLanguage } from '../i18n/types';
import { SUPPORTED_LANGUAGES } from '../i18n/types';

export type SpeechRecognitionState = 'idle' | 'listening' | 'processing' | 'error';
export type SpeechErrorCode = 'permission-denied' | 'not-supported' | 'no-speech' | 'network' | 'aborted' | 'generic';

// Browser SpeechRecognition types
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => IWindowSpeechRecognition;
    webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
  }
}

export function useSpeechRecognition(language: SupportedLanguage) {
  const [state, setState] = useState<SpeechRecognitionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorCode, setErrorCode] = useState<SpeechErrorCode | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const activeLangRef = useRef(language);

  // Keep active language ref updated
  useEffect(() => {
    activeLangRef.current = language;
  }, [language]);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognitionAPI));
    }
  }, []);

  const getSpeechLocale = useCallback((lang: SupportedLanguage): string => {
    const opt = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    return opt?.speechLocale ?? 'en-IN';
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
    }
    setState('idle');
  }, []);

  const cancelListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
    }
    setTranscript('');
    setInterimTranscript('');
    setState('idle');
    setErrorCode(null);
  }, []);

  const startListening = useCallback(
    (onResultCallback?: (fullText: string) => void) => {
      setErrorCode(null);
      setInterimTranscript('');

      if (typeof window === 'undefined') return;

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setIsSupported(false);
        setErrorCode('not-supported');
        setState('error');
        return;
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }

      try {
        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;

        const targetLocale = getSpeechLocale(activeLangRef.current);
        recognition.lang = targetLocale;
        recognition.continuous = false; // Capture discrete farmer question utterance
        recognition.interimResults = true;

        recognition.onstart = () => {
          setState('listening');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentInterim = '';
          let finalUtterance = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalUtterance += piece;
            } else {
              currentInterim += piece;
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
          }

          if (finalUtterance) {
            const trimmed = finalUtterance.trim();
            setTranscript(trimmed);
            setInterimTranscript('');
            setState('idle');
            if (onResultCallback && trimmed) {
              onResultCallback(trimmed);
            }
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          const err = event.error;
          if (err === 'not-allowed' || err === 'service-not-allowed') {
            setErrorCode('permission-denied');
          } else if (err === 'no-speech') {
            setErrorCode('no-speech');
          } else if (err === 'network') {
            setErrorCode('network');
          } else if (err === 'aborted') {
            setErrorCode('aborted');
          } else {
            setErrorCode('generic');
          }
          setState('error');
        };

        recognition.onend = () => {
          setState((prev) => (prev === 'listening' ? 'idle' : prev));
        };

        recognition.start();
      } catch (err) {
        setErrorCode('generic');
        setState('error');
      }
    },
    [getSpeechLocale],
  );

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    state,
    isListening: state === 'listening',
    isSupported,
    transcript,
    interimTranscript,
    errorCode,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript: () => {
      setTranscript('');
      setInterimTranscript('');
      setErrorCode(null);
    },
  };
}
