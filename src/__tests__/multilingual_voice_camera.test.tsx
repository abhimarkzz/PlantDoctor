import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SUPPORTED_LANGUAGES } from '../i18n/types';
import { TRANSLATIONS } from '../i18n/translations';
import { LanguageProvider, useTranslation } from '../i18n/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { FarmerInputSection } from '../components/FarmerInputSection';
import { DiagnosticResultCard } from '../components/DiagnosticResultCard';
import { validateImageFile } from '../utils/imageUtils';
import type { AnswerResult } from '../models/types';

describe('V2 Phase 3: Multilingual Localization System', () => {
  it('defines all 4 Indian languages with correct scripts and speech locales', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(4);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(['en', 'hi', 'te', 'ta']);

    const hindi = SUPPORTED_LANGUAGES.find((l) => l.code === 'hi')!;
    expect(hindi.nativeName).toBe('हिन्दी');
    expect(hindi.speechLocale).toBe('hi-IN');

    const telugu = SUPPORTED_LANGUAGES.find((l) => l.code === 'te')!;
    expect(telugu.nativeName).toBe('తెలుగు');
    expect(telugu.speechLocale).toBe('te-IN');

    const tamil = SUPPORTED_LANGUAGES.find((l) => l.code === 'ta')!;
    expect(tamil.nativeName).toBe('தமிழ்');
    expect(tamil.speechLocale).toBe('ta-IN');
  });

  it('contains complete matching translation keys across all 4 dictionaries', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const hiKeys = Object.keys(TRANSLATIONS.hi).sort();
    const teKeys = Object.keys(TRANSLATIONS.te).sort();
    const taKeys = Object.keys(TRANSLATIONS.ta).sort();

    expect(hiKeys).toEqual(enKeys);
    expect(teKeys).toEqual(enKeys);
    expect(taKeys).toEqual(enKeys);
  });

  it('switches languages dynamically without page reload', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
    });

    expect(result.current.language).toBe('en');
    expect(result.current.t.actionSpeak).toBe('Speak Problem');

    act(() => {
      result.current.setLanguage('hi');
    });

    expect(result.current.language).toBe('hi');
    expect(result.current.t.actionSpeak).toBe('बोलकर पूछें');
    expect(result.current.speechLocale).toBe('hi-IN');

    act(() => {
      result.current.setLanguage('te');
    });

    expect(result.current.language).toBe('te');
    expect(result.current.t.actionSpeak).toBe('మాట్లాడి అడగండి');
    expect(result.current.speechLocale).toBe('te-IN');

    act(() => {
      result.current.setLanguage('ta');
    });

    expect(result.current.language).toBe('ta');
    expect(result.current.t.actionSpeak).toBe('பேசி கேளுங்கள்');
    expect(result.current.speechLocale).toBe('ta-IN');
  });

  it('renders LanguageSelector with buttons for all 4 languages', () => {
    render(
      <LanguageProvider>
        <LanguageSelector />
      </LanguageProvider>,
    );

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('हिन्दी')).toBeInTheDocument();
    expect(screen.getByText('తెలుగు')).toBeInTheDocument();
    expect(screen.getByText('தமிழ்')).toBeInTheDocument();
  });
});

describe('V2 Phase 1 & 2: Farmer Input & Speech Recognition Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the 3 prominent farmer actions: Speak, Take Photo, and Choose Photo', () => {
    render(
      <LanguageProvider>
        <FarmerInputSection onSubmit={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByLabelText(/Speak Problem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Take a Photo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose Photo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask Plant Doctor/i })).toBeInTheDocument();
  });

  it('validates empty inputs honestly before submission', () => {
    const mockSubmit = vi.fn();
    render(
      <LanguageProvider>
        <FarmerInputSection onSubmit={mockSubmit} />
      </LanguageProvider>,
    );

    const submitBtn = screen.getByRole('button', { name: /Ask Plant Doctor/i });
    fireEvent.click(submitBtn);

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Please speak or enter a question before submitting/i)).toBeInTheDocument();
  });

  it('submits typed question correctly', () => {
    const mockSubmit = vi.fn();
    render(
      <LanguageProvider>
        <FarmerInputSection onSubmit={mockSubmit} />
      </LanguageProvider>,
    );

    const textarea = screen.getByLabelText(/Describe or Speak the Problem/i);
    fireEvent.change(textarea, { target: { value: 'Why are tomato leaves yellowing?' } });

    const submitBtn = screen.getByRole('button', { name: /Ask Plant Doctor/i });
    fireEvent.click(submitBtn);

    expect(mockSubmit).toHaveBeenCalledWith(
      'Why are tomato leaves yellowing?',
      null,
      expect.objectContaining({ cropId: null }),
    );
  });
});

describe('V2 Phase 5: Image Validation', () => {
  it('validates correct image MIME types and rejects unsupported files', () => {
    const validJpg = new File(['fake-bytes'], 'leaf.jpg', { type: 'image/jpeg' });
    const validPng = new File(['fake-bytes'], 'leaf.png', { type: 'image/png' });
    const validWebp = new File(['fake-bytes'], 'leaf.webp', { type: 'image/webp' });
    const invalidPdf = new File(['fake-bytes'], 'leaf.pdf', { type: 'application/pdf' });

    expect(validateImageFile(validJpg).valid).toBe(true);
    expect(validateImageFile(validPng).valid).toBe(true);
    expect(validateImageFile(validWebp).valid).toBe(true);
    expect(validateImageFile(invalidPdf).valid).toBe(false);
  });

  it('rejects oversized images (> 10MB)', () => {
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'giant.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(bigFile);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/larger than 10MB/i);
  });
});

describe('V2 Phase 4 & 6: Diagnostic Result Card & Audio Control', () => {
  const mockResult: AnswerResult = {
    id: 'ans-101',
    query: 'Tomato leaf blight with dark concentric rings',
    summary: 'Evidence indicates possible Early Blight (Alternaria solani).',
    overallStatus: 'applicable',
    evidenceChunks: [],
    caveats: ['Check local fungicide regulations.'],
    isIllustrative: false,
    generatedAt: new Date().toISOString(),
    assessment: {
      id: 'assess-101',
      query: 'Tomato leaf blight with dark concentric rings',
      likelyIssue: 'Early Blight (Alternaria solani)',
      visibleObservations: ['Dark brown concentric spots on lower leaves', 'Yellowing chlorotic halo around lesions'],
      possibleCauses: ['Alternaria solani fungal pathogen favored by warm humid foliage'],
      differentialChecks: ['Distinguish from Septoria leaf spot by ring pattern'],
      recommendedNextSteps: ['Prune infected lower foliage', 'Avoid overhead sprinkler irrigation'],
      warnings: ['Do not compost heavily blighted debris'],
      confidenceLevel: 'Moderate - Characteristic concentric rings observed',
      missingContext: [],
      overallStatus: 'applicable',
      evidenceChunks: [],
      caveats: [],
      language: 'en',
      visionModelStatus: 'gemini_vision_active',
      imageAttached: true,
      generatedAt: new Date().toISOString(),
    },
  };

  it('renders structured diagnostic observations, causes, and next steps', () => {
    render(
      <LanguageProvider>
        <DiagnosticResultCard result={mockResult} />
      </LanguageProvider>,
    );

    expect(screen.getByText('Early Blight (Alternaria solani)')).toBeInTheDocument();
    expect(screen.getByText('Dark brown concentric spots on lower leaves')).toBeInTheDocument();
    expect(screen.getByText(/Prune infected lower foliage/i)).toBeInTheDocument();
    expect(screen.getByText(/Do not compost heavily blighted debris/i)).toBeInTheDocument();
  });

  it('renders prominent Listen to Answer button with audio controls', () => {
    render(
      <LanguageProvider>
        <DiagnosticResultCard result={mockResult} />
      </LanguageProvider>,
    );

    const listenBtn = screen.getByRole('button', { name: /Listen to Answer/i });
    expect(listenBtn).toBeInTheDocument();
  });
});
