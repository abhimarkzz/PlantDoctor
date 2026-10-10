import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n/types';
import { TRANSLATIONS } from '../i18n/translations';
import { LanguageProvider, useTranslation } from '../i18n/LanguageContext';
import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { AskPage } from '../pages/AskPage';
import { DiagnosticResultCard } from '../components/DiagnosticResultCard';
import { SourceCard } from '../components/SourceCard';
import { getCrops, getRegions, getGrowthStages, cropLabel, regionLabel } from '../data/catalog';
import type { AnswerResult } from '../models/types';
import { ToastProvider } from '../components/Toast';

describe('1. Global Language System & Dictionary Completeness Audit', () => {
  const languages: SupportedLanguage[] = ['en', 'hi', 'te', 'ta'];
  const expectedKeyCount = Object.keys(TRANSLATIONS.en).length;

  it('guarantees that every supported language has 100% of translation keys populated', () => {
    const enKeys = Object.keys(TRANSLATIONS.en);

    for (const lang of languages) {
      const dict = TRANSLATIONS[lang];
      const missingKeys: string[] = [];
      const emptyKeys: string[] = [];

      for (const key of enKeys) {
        if (!(key in dict)) {
          missingKeys.push(key);
        } else if (typeof dict[key as keyof typeof dict] !== 'string' || dict[key as keyof typeof dict].trim() === '') {
          emptyKeys.push(key);
        }
      }

      expect(missingKeys, `Locale '${lang}' is missing keys: ${missingKeys.join(', ')}`).toEqual([]);
      expect(emptyKeys, `Locale '${lang}' has empty keys: ${emptyKeys.join(', ')}`).toEqual([]);
      expect(Object.keys(dict).length).toBe(expectedKeyCount);
    }
  });

  it('provides correct document language codes and speech locales', () => {
    const locales = Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, l.speechLocale]));
    expect(locales).toEqual({
      en: 'en-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
    });
  });
});

describe('2. Agricultural Taxonomies & Catalog Localization', () => {
  it('localizes crop taxonomy across all four languages', () => {
    const enCrops = getCrops('en');
    const hiCrops = getCrops('hi');
    const teCrops = getCrops('te');
    const taCrops = getCrops('ta');

    expect(enCrops.length).toBeGreaterThanOrEqual(16);
    expect(hiCrops.length).toBe(enCrops.length);
    expect(teCrops.length).toBe(enCrops.length);
    expect(taCrops.length).toBe(enCrops.length);

    expect(cropLabel('tomato', 'en')).toBe('Tomato');
    expect(cropLabel('tomato', 'hi')).toBe('टमाटर');
    expect(cropLabel('tomato', 'te')).toBe('టమాటా');
    expect(cropLabel('tomato', 'ta')).toBe('தக்காளி');

    expect(cropLabel('rice', 'en')).toBe('Rice / Paddy');
    expect(cropLabel('rice', 'hi')).toBe('चावल / धान');
    expect(cropLabel('rice', 'te')).toBe('వరి (వరి ధాన్యం)');
    expect(cropLabel('rice', 'ta')).toBe('நெல்');
  });

  it('localizes regional agro-climatic zones across all four languages', () => {
    const enRegions = getRegions('en');
    const hiRegions = getRegions('hi');
    const teRegions = getRegions('te');
    const taRegions = getRegions('ta');

    expect(enRegions.length).toBe(7);
    expect(hiRegions.length).toBe(7);
    expect(teRegions.length).toBe(7);
    expect(taRegions.length).toBe(7);

    expect(regionLabel('tropical', 'en')).toBe('Tropical');
    expect(regionLabel('tropical', 'hi')).toBe('उष्णकटिबंधीय (Tropical)');
    expect(regionLabel('tropical', 'te')).toBe('ఉష్ణమండల (Tropical)');
    expect(regionLabel('tropical', 'ta')).toBe('வெப்பமண்டல (Tropical)');
  });

  it('localizes growth stages across all four languages', () => {
    expect(getGrowthStages('en').length).toBe(5);
    expect(getGrowthStages('hi').length).toBe(5);
    expect(getGrowthStages('te').length).toBe(5);
    expect(getGrowthStages('ta').length).toBe(5);
  });
});

describe('3. Home Page Localization & Content Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Hindi labels and evidence descriptions when Hindi is selected', () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="hi">
          <HomePage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('बोलकर पूछें')).toBeInTheDocument();
    expect(screen.getByText('फोटो खींचें')).toBeInTheDocument();
    expect(screen.getByText('फोटो चुनें')).toBeInTheDocument();
    expect(screen.getByText('साक्ष्य स्थिति मूल्यांकन')).toBeInTheDocument();
    expect(screen.getByText('लागू होने योग्य साक्ष्य')).toBeInTheDocument();
    expect(screen.getByText('विरोधाभासी साक्ष्य')).toBeInTheDocument();
  });

  it('renders Telugu labels and evidence descriptions when Telugu is selected', () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="te">
          <HomePage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('మాట్లాడి అడగండి')).toBeInTheDocument();
    expect(screen.getByText('ఫోటో తీయండి')).toBeInTheDocument();
    expect(screen.getByText('ఫోటో ఎంచుకోండి')).toBeInTheDocument();
    expect(screen.getByText('ఆధారాల స్థితి విశ్లేషణ')).toBeInTheDocument();
    expect(screen.getByText('వర్తించే ఆధారాలు')).toBeInTheDocument();
  });

  it('renders Tamil labels and evidence descriptions when Tamil is selected', () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="ta">
          <HomePage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('பேசி கேளுங்கள்')).toBeInTheDocument();
    expect(screen.getByText('படம் எடுக்க')).toBeInTheDocument();
    expect(screen.getByText('கேலரியில் இருந்து தேர்வு')).toBeInTheDocument();
    expect(screen.getByText('சான்றுகள் நிலை மதிப்பீடு')).toBeInTheDocument();
    expect(screen.getByText('பொருந்தக்கூடிய சான்றுகள்')).toBeInTheDocument();
  });
});

describe('4. Ask Page: Input Preservation Across Language Changes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retains the farmer question text when switching languages dynamically', () => {
    function TestApp() {
      const { setLanguage } = useTranslation();
      return (
        <div>
          <button type="button" onClick={() => setLanguage('hi')}>Switch to Hindi</button>
          <button type="button" onClick={() => setLanguage('ta')}>Switch to Tamil</button>
          <AskPage />
        </div>
      );
    }

    render(
      <ToastProvider>
        <MemoryRouter>
          <LanguageProvider initialLanguage="en">
            <TestApp />
          </LanguageProvider>
        </MemoryRouter>
      </ToastProvider>,
    );

    const textarea = screen.getByPlaceholderText(/My tomato plants have yellowing/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'My paddy leaves have brown diamond spots' } });
    expect(textarea.value).toBe('My paddy leaves have brown diamond spots');

    // Switch to Hindi
    fireEvent.click(screen.getByText('Switch to Hindi'));
    expect(screen.getByText('आपका सवाल')).toBeInTheDocument();
    expect(textarea.value).toBe('My paddy leaves have brown diamond spots');

    // Switch to Tamil
    fireEvent.click(screen.getByText('Switch to Tamil'));
    expect(screen.getByText('உங்கள் கேள்வி')).toBeInTheDocument();
    expect(textarea.value).toBe('My paddy leaves have brown diamond spots');
  });
});

describe('5. About Page: Factual Accuracy & Localization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does NOT contain misleading claims of disconnected backends or planned-only features', () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="en">
          <AboutPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    // Verify accurate modern architecture claims are present
    expect(screen.getByText(/FastAPI REST backend with PyMongo/i)).toBeInTheDocument();
    expect(screen.getByText(/MongoDB Atlas Vector Search/i)).toBeInTheDocument();
    expect(screen.getByText(/Hybrid Reciprocal Rank Fusion \(RRF\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Progressive Web App \(PWA\)/i)).toBeInTheDocument();

    // Verify obsolete claims were removed
    expect(screen.queryByText(/None of these backend components are connected in the current frontend milestone/i)).toBeNull();
    expect(screen.queryByText(/No backend, database, or model is connected/i)).toBeNull();
    expect(screen.queryByText(/Offline knowledge packs are not downloadable/i)).toBeNull();
  });

  it('localizes the About page into Hindi, Telugu, and Tamil', () => {
    const { unmount } = render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="hi">
          <AboutPage />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('प्लांट डॉक्टर के बारे में')).toBeInTheDocument();
    expect(screen.getByText(/हमारा उद्देश्य/)).toBeInTheDocument();
    expect(screen.getByText('सिस्टम वास्तुकला (Architecture)')).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="ta">
          <AboutPage />
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('பிளான்ட் டாக்டர் பற்றி')).toBeInTheDocument();
    expect(screen.getByText(/நோக்கம்/)).toBeInTheDocument();
    expect(screen.getByText('கட்டமைப்பு (Architecture)')).toBeInTheDocument();
  });
});

describe('6. Dynamic Results & Agricultural Assessment Localization', () => {
  const dummyTamilResult: AnswerResult = {
    id: 'res-ta-001',
    query: 'தக்காளி இலைகளில் மஞ்சள் புள்ளிகள்',
    summary: 'தக்காளியில் ஆரம்பகால கருகல் நோய் பூஞ்சை தொற்று காரணமாக ஏற்படுகிறது.',
    overallStatus: 'applicable',
    evidenceChunks: [
      {
        id: 'chunk-en-001',
        sourceId: 'src-001',
        source: {
          id: 'src-001',
          identifier: 'ICAR-TNAU-2023',
          title: 'Tomato Disease Management Guide',
          authors: ['Dr. S. Ramanathan', 'Dr. K. Murugan'],
          publishedDate: '2023-04-12',
          url: 'https://icar.gov.in',
          institution: 'Tamil Nadu Agricultural University (TNAU)',
          lastVerified: '2024-01-10',
        },
        text: 'Early blight caused by Alternaria solani produces characteristic target-like brown spots with yellow halos on tomato foliage.',
        status: 'applicable',
        relevanceScore: 0.94,
        pageOrSection: 'Section 4.1',
      },
    ],
    caveats: ['கள பரிசோதனை அவசியம்.'],
    assessment: {
      id: 'assess-ta-001',
      query: 'தக்காளி இலைகளில் மஞ்சள் புள்ளிகள்',
      likelyIssue: 'தக்காளியில் ஆரம்பகால கருகல் நோய் (Early Blight)',
      confidenceLevel: 'உயர் (High)',
      visibleObservations: ['கீழ் இலைகளில் செறிவான மஞ்சள் நிற வளையங்கள்'],
      possibleCauses: ['ஆல்டர்நேரியா சோலானி பூஞ்சை தொற்று'],
      differentialChecks: ['இலைகளின் அடிப்பகுதியில் பூஞ்சை வித்திகளைப் பரிசோதிக்கவும்'],
      recommendedNextSteps: ['பாதிக்கப்பட்ட இலைகளை நீக்கி வயலை விட்டு அகற்றவும்'],
      warnings: ['மருந்து தெளிக்கும் போது முகக்கவசம் அணியவும்'],
      missingContext: ['உங்கள் பாசன இடைவெளி என்ன?'],
      overallStatus: 'applicable',
      evidenceChunks: [],
      caveats: [],
      language: 'ta',
      visionModelStatus: 'ready',
      imageAttached: true,
      generatedAt: new Date().toISOString(),
    },
    generatedAt: new Date().toISOString(),
    isIllustrative: false,
  };

  it('renders full Tamil agricultural advice, warnings, next steps, and audio controls', () => {
    render(
      <MemoryRouter>
        <LanguageProvider initialLanguage="ta">
          <DiagnosticResultCard result={dummyTamilResult} onAskAnother={vi.fn()} />
        </LanguageProvider>
      </MemoryRouter>,
    );

    // Diagnostic card headings in Tamil
    expect(screen.getByText('நோய் கண்டறிதல் & பகுப்பாய்வு')).toBeInTheDocument();
    expect(screen.getByText(/சாத்தியமான பிரச்சனை/)).toBeInTheDocument();
    expect(screen.getByText('தக்காளியில் ஆரம்பகால கருகல் நோய் (Early Blight)')).toBeInTheDocument();
    expect(screen.getByText('பரிந்துரைக்கப்படும் தீர்வுகள்')).toBeInTheDocument();
    expect(screen.getByText('பாதிக்கப்பட்ட இலைகளை நீக்கி வயலை விட்டு அகற்றவும்')).toBeInTheDocument();
    expect(screen.getByText(/பாதுகாப்பு எச்சரிக்கைகள்/)).toBeInTheDocument();
    expect(screen.getByText('மருந்து தெளிக்கும் போது முகக்கவசம் அணியவும்')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /பதிலைக் கேளுங்கள்/i })).toBeInTheDocument();
  });

  it('renders SourceCard with "Original Source Excerpt (English)" badge and localized provenance', () => {
    render(
      <LanguageProvider initialLanguage="ta">
        <SourceCard chunk={dummyTamilResult.evidenceChunks[0]} />
      </LanguageProvider>,
    );

    // Provenance badge and metadata
    expect(screen.getByText('அசல் மூலப் பகுதி (ஆங்கிலம்)')).toBeInTheDocument();
    expect(screen.getByText(/Tamil Nadu Agricultural University/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. S\. Ramanathan/i)).toBeInTheDocument();
    expect(screen.getByText(/Early blight caused by Alternaria solani/i)).toBeInTheDocument();
  });
});
