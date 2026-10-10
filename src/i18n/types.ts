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
  installAppPwa: string;
  networkOnline: string;
  offlineMode: string;
  ready: string;
  cachedShell: string;

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
  describeProblemAria: string;
  questionPlaceholder: string;
  askDoctor: string;
  askQuestion: string;
  illustrativeBannerTitle: string;
  submitting: string;
  searching: string;
  askAnother: string;
  viewSources: string;
  hideSources: string;
  retakePhoto: string;
  removePhoto: string;
  photoAttached: string;
  imagePreviewAlt: string;
  photoAttachedDetail: string;
  yourQuestionLabel: string;
  questionHint: string;
  askBtn: string;
  checkPlantHealth: string;
  optional: string;
  askOfflineBannerTitle: string;
  askOfflineBannerDesc: string;
  askOfflineScreenTitle: string;
  askOfflineScreenMessage: string;
  viewIllustrativeExample: string;
  backToAsk: string;
  viewFullEvidenceDetails: string;
  editQuestion: string;

  // Offline AI Model & Pack
  offlineAiPackTitle: string;
  offlineAiPackDesc: string;
  offlineModelReady: string;
  offlineModelNotInstalled: string;
  offlineDiagnosisReady: string;
  offlineDiagnosisPartial: string;
  offlinePrepareBtn: string;
  offlineRemoveModelBtn: string;
  offlineVerifying: string;
  offlineModelVerified: string;

  // System Operational States
  stateOnlineAtlasReady: string;
  stateOfflinePhotoDiagnosisReady: string;
  stateOfflineModelReady: string;
  stateOfflineKnowledgePackReady: string;
  statePartialOfflineAvailability: string;
  stateAppAvailableOffline: string;
  stateResourcesMissingOrOutdated: string;

  // Context Accordion
  hideCropRegion: string;
  addCropRegionOptional: string;

  // Crop & Region Taxonomy Labels
  cropLabel: string;
  regionLabel: string;
  growthStageLabel: string;
  selectCropOptional: string;
  selectRegionOptional: string;
  selectStageOptional: string;

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
  noticeHeading: string;

  // Source Cards
  originalSourceExcerpt: string;
  originalSourceNote: string;
  sourceRelevance: string;
  sourceVerified: string;
  sourceNotVerified: string;
  sourceViewLink: string;
  sourceAuthors: string;
  sourceInstitution: string;

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

  // Home Page Elements
  homeConnectionHeading: string;
  homeOfflineLibraryHeading: string;
  homeRecentQuestionsHeading: string;
  clearHistory: string;
  evidenceStatusGuideDesc: string;
  systemNotesHeading: string;
  systemNotesPoint1: string;
  systemNotesPoint2: string;
  systemNotesPoint3: string;

  // Connection & Offline Banners
  online: string;
  offline: string;
  backendConnected: string;
  backendNotConnected: string;
  checkingBackend: string;
  cachedShellOffline: string;
  offlineNotice: string;
  offlineNoticeShort: string;
  offlineSearchAvailable: string;
  offlineLibraryEmpty: string;
  offlineScreenTitle: string;
  offlineScreenMessage: string;
  offlineScopeBoundary: string;
  offlineScopeHint: string;
  offlineScopeNote: string;
  checkConnectionRetry: string;
  backendUnavailableBanner: string;
  backendUnavailableNotice: string;

  // Library & Packs
  libraryTitle: string;
  libraryDescription: string;
  librarySearchPlaceholder: string;
  libraryFilterAria: string;
  libraryEmptyTitle: string;
  libraryEmptyDesc: string;
  libraryUnavailableTitle: string;
  libraryUnavailableDesc: string;
  libraryPreviewPacksBtn: string;
  libraryOfflineCatalogTitle: string;
  libraryOfflineCatalogDesc: string;
  noPacksMatching: string;
  packDownloadBtn: string;
  packDownloading: string;
  packInstalled: string;
  packRemoveBtn: string;
  packRemoving: string;
  packSourcesCount: string;
  packSize: string;
  packLastUpdated: string;
  packLastVerified: string;
  packChecksum: string;
  packVersion: string;
  packNotFoundTitle: string;
  packNotFoundDesc: string;
  illustrativePackWarning: string;

  // Evidence Detail Page
  evidenceDetailsTitle: string;
  overallAssessment: string;
  importantCaveats: string;
  understandingStatuses: string;
  understandingStatusesDesc: string;
  evidenceNotFoundTitle: string;
  evidenceNotFoundDesc: string;
  generatedAtLabel: string;

  // About Page
  aboutTitle: string;
  aboutSubtitle: string;
  aboutMissionTitle: string;
  aboutMissionDesc: string;
  aboutGateTitle: string;
  aboutGateDesc: string;
  aboutTrustTitle: string;
  aboutTrustDesc: string;
  aboutTrustItem1: string;
  aboutTrustItem2: string;
  aboutTrustItem3: string;
  aboutTrustItem4: string;
  aboutTrustItem5: string;
  aboutArchTitle: string;
  aboutArchDesc: string;
  aboutArchItem1: string;
  aboutArchItem2: string;
  aboutArchItem3: string;
  aboutArchItem4: string;
  aboutArchItem5: string;
  aboutLimitsTitle: string;
  aboutLimitsItem1: string;
  aboutLimitsItem2: string;
  aboutLimitsItem3: string;
  aboutLimitsItem4: string;
  aboutLimitsItem5: string;
  aboutEthicsTitle: string;
  aboutEthicsItem1: string;
  aboutEthicsItem2: string;
  aboutEthicsItem3: string;
  aboutEthicsItem4: string;
  aboutEthicsItem5: string;
  aboutPwaTitle: string;
  aboutPwaDesc: string;
  aboutPwaAndroidTitle: string;
  aboutPwaAndroidStep1: string;
  aboutPwaAndroidStep2: string;
  aboutPwaAndroidStep3: string;
  aboutPwaAndroidStep4: string;
  aboutPwaIosTitle: string;
  aboutPwaIosStep1: string;
  aboutPwaIosStep2: string;
  aboutPwaIosStep3: string;
  aboutPwaIosStep4: string;
  aboutPwaNote: string;
  aboutVersionBadge: string;

  // Validation & Errors
  errorEmptyQuestion: string;
  errorShortQuestion: string;
  errorImageTooLarge: string;
  errorInvalidImage: string;
  errorGeneric: string;
  tryAgain: string;
  pageNotFoundTitle: string;
  pageNotFoundDesc: string;
  returnToHome: string;

  // Additional Common & UI Keys
  backToLibrary: string;
  downloadForOfflineUse: string;
  packStorageStatus: string;
  packStatusAvailable: string;
  packStatusUpdateAvailable: string;
  packLastSynced: string;
  packStoredOfflineNotice: string;
  packRemoveStorageNote: string;
  packDownloadDemoNote: string;
  packDownloadDesc: string;
  packKnownLimitations: string;
  packLimitSync: string;
  packLimitVectors: string;
  packLimitRegulations: string;
  packBundlesNote: string;
  optionalBadge: string;
  dismiss: string;
  cannotReachBackend: string;
  stillOfflineAlert: string;
  offlineShellDisconnected: string;
  offlineIndexDbNotice: string;
  offlineNotificationAria: string;
  illustrativeBadge: string;
  originalExcerptLabel: string;
  viewOriginalExcerpt: string;
  hideOriginalExcerpt: string;
  translatedExplanationLabel: string;
  installModalTitle: string;
  installModalSubtitle: string;
  installModalClose: string;
  installModalOneClick: string;
  installModalOneClickBtn: string;
  installModalAndroidTab: string;
  installModalIosTab: string;
  installModalCloseBtn: string;
  cameraSwitch: string;
  cameraTakePicture: string;
  cameraCancel: string;
  cameraClose: string;
  cameraNotSupported: string;
  cameraPermissionDenied: string;
  cameraNotFound: string;
  cameraGalleryAlternative: string;
  illustrativeExampleTitle: string;
  illustrativeExampleDesc: string;
  defaultPhotoQuery: string;
}
