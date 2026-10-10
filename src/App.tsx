import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { LanguageProvider } from './i18n/LanguageContext';
import { Layout } from './app/Layout';
import { HomePage } from './pages/HomePage';
import { AskPage } from './pages/AskPage';
import { EvidenceDetailPage } from './pages/EvidenceDetailPage';
import { LibraryPage } from './pages/LibraryPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPolicyPage, TermsPage, StoragePolicyPage } from './pages/LegalPages';

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="ask" element={<AskPage />} />
          <Route path="evidence/:id" element={<EvidenceDetailPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/:id" element={<PackDetailPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="storage" element={<StoragePolicyPage />} />
          <Route
            path="*"
            element={
              <div className="py-16 text-center space-y-4">
                <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Page not found</h1>
                <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
                <div>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dark transition-colors cursor-pointer"
                  >
                    Return to Home
                  </Link>
                </div>
              </div>
            }
          />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </LanguageProvider>
  );
}

export default App;
