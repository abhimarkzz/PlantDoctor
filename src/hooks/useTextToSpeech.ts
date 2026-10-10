import { useState, useRef, useEffect, useCallback } from 'react';
import type { SupportedLanguage } from '../i18n/types';
import { SUPPORTED_LANGUAGES } from '../i18n/types';

export type TtsState = 'idle' | 'playing' | 'paused' | 'error';

export function useTextToSpeech(language: SupportedLanguage) {
  const [state, setState] = useState<TtsState>('idle');
  const [isSupported, setIsSupported] = useState(true);
  const [hasVoice, setHasVoice] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    }
  }, []);

  const getVoiceForLanguage = useCallback((lang: SupportedLanguage): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const opt = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    const targetPrefix = opt?.code ?? 'en';
    const targetLocale = opt?.speechLocale?.toLowerCase() ?? 'en-in';

    // 1. Try exact locale match (e.g. 'hi-IN')
    let found = voices.find((v) => v.lang.toLowerCase() === targetLocale);
    if (found) return found;

    // 2. Try prefix match (e.g. 'hi')
    found = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
    if (found) return found;

    // 3. Fallback for English
    if (targetPrefix === 'en') {
      found = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (found) return found;
    }

    return null;
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setState('idle');
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.pause();
        setState('paused');
      } catch {
        // Ignore
      }
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.resume();
        setState('playing');
      } catch {
        // Ignore
      }
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setIsSupported(false);
        setState('error');
        return;
      }

      // Stop any existing playback
      window.speechSynthesis.cancel();

      if (!text || !text.trim()) {
        setState('idle');
        return;
      }

      try {
        // Clean text: strip markdown bullets, hashes, bold markers
        const plainText = text
          .replace(/[*#_`]/g, '')
          .replace(/•/g, '')
          .replace(/\[.*?\]\(.*?\)/g, '')
          .trim();

        const utterance = new SpeechSynthesisUtterance(plainText);
        utteranceRef.current = utterance;

        const opt = SUPPORTED_LANGUAGES.find((l) => l.code === language);
        utterance.lang = opt?.speechLocale ?? 'en-IN';

        const matchingVoice = getVoiceForLanguage(language);
        if (matchingVoice) {
          utterance.voice = matchingVoice;
          setHasVoice(true);
        } else {
          // If no matching voice for hi/te/ta, note it but still let browser try
          setHasVoice(language === 'en');
        }

        utterance.onstart = () => {
          setState('playing');
        };

        utterance.onend = () => {
          setState('idle');
        };

        utterance.onerror = (e) => {
          // 'canceled' or 'interrupted' is normal when user taps stop
          if (e.error === 'canceled' || e.error === 'interrupted') {
            setState('idle');
          } else {
            setState('error');
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setState('error');
      }
    },
    [language, getVoiceForLanguage],
  );

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    state,
    isPlaying: state === 'playing',
    isPaused: state === 'paused',
    isSupported,
    hasVoice,
    speak,
    pause,
    resume,
    stop,
  };
}
