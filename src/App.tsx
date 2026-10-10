import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './app/Layout';
import { HomePage } from './pages/HomePage';
import { AskPage } from './pages/AskPage';
import { EvidenceDetailPage } from './pages/EvidenceDetailPage';
import { LibraryPage } from './pages/LibraryPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { AboutPage } from './pages/AboutPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="ask" element={<AskPage />} />
          <Route path="evidence/:id" element={<EvidenceDetailPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/:id" element={<PackDetailPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route
            path="*"
            element={
              <div className="py-16 text-center">
                <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Page not found</h1>
                <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
