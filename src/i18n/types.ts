export type SupportedLanguage = 'en' | 'hi' | 'te' | 'ta';

export interface LanguageOption {
  code: SupportedLanguage;
  locale: string;
  name: string;
  nativeName: string;
  speechLocale: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', locale: 'en-IN', name: 'English', nativeName: 'English', speechLocale: 'en-IN' },
  { code: 'hi', locale: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', speechLocale: 'hi-IN' },
  { code: 'te', locale: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', speechLocale: 'te-IN' },
  { code: 'ta', locale: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', speechLocale: 'ta-IN' },
];

export interface TranslationDictionary {
  // Navigation & Branding
  appName: string;
  tagline: string;
  navHome: string;
  navAsk: string;
  navLibrary: string;
  navAbout: string;
  installApp: string;

  // Language Selector
  selectLanguage: string;
  chooseLanguage: string;

  // Farmer Home Prominent Actions
  actionSpeak: string;
  actionSpeakDesc: string;
  actionCamera: string;
  actionCameraDesc: string;
  actionGallery: string;
  actionGalleryDesc: string;

  // Question Submission Flow
  startQuestion: string;
  questionPlaceholder: string;
  askDoctor: string;
  submitting: string;
  askAnother: string;
  viewSources: string;
  retakePhoto: string;
  removePhoto: string;
  photoAttached: string;
  imagePreviewAlt: string;

  // Speech Recognition States
  micIdle: string;
  micListening: string;
  micProcessing: string;
  micStop: string;
  micCancel: string;
  micErrorDenied: string;
  micErrorUnsupported: string;
  micErrorNoSpeech: string;
  micErrorNetwork: string;
  micErrorGeneric: string;

  // Text to Speech
  listenAnswer: string;
  listeningAnswer: string;
  pauseAudio: string;
  resumeAudio: string;
  stopAudio: string;
  ttsNotSupported: string;
  ttsVoiceNotFound: string;

  // Diagnostic Results
  diagnosticResult: string;
  likelyIssue: string;
  observations: string;
  possibleCauses: string;
  differentialChecks: string;
  recommendedSteps: string;
  safetyWarnings: string;
  confidence: string;
  missingContext: string;
  sourcesHeading: string;
  evidenceStatusHeading: string;

  // Evidence Statuses
  statusApplicable: string;
  statusApplicableDesc: string;
  statusContextIncomplete: string;
  statusContextIncompleteDesc: string;
  statusConflicting: string;
  statusConflictingDesc: string;
  statusFreshnessUnverified: string;
  statusFreshnessUnverifiedDesc: string;
  statusInsufficient: string;
  statusInsufficientDesc: string;

  // Connection & Offline
  online: string;
  offline: string;
  backendConnected: string;
  backendNotConnected: string;
  checkingBackend: string;
  cachedShellOffline: string;
  offlineNotice: string;
  offlineSearchAvailable: string;
  offlineLibraryEmpty: string;

  // Validation & Errors
  errorEmptyQuestion: string;
  errorShortQuestion: string;
  errorImageTooLarge: string;
  errorInvalidImage: string;
  errorGeneric: string;

  // Crop Context (Optional)
  cropLabel: string;
  regionLabel: string;
  growthStageLabel: string;
  selectCropOptional: string;
  selectRegionOptional: string;
}
