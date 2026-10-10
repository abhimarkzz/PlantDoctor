import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Database, AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Legal / information pages.
 *
 * Content describes the application's ACTUAL, verified data behavior (local-first,
 * no accounts, no analytics/trackers, no server-side retention of user inputs).
 * It intentionally does NOT claim legal compliance or certification, and it does
 * NOT invent operator/business/grievance details. Missing operator information is
 * marked as a launch blocker for the project owner to complete.
 *
 * English is authoritative. Localized legal translations require professional
 * review before publication and are intentionally not auto-translated here.
 */

const LAST_UPDATED = '2026-10-11';

function LegalShell({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/about" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to About
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary shrink-0">{icon}</div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated: {LAST_UPDATED} · English (authoritative)</p>
        </div>
      </div>
      <div className="space-y-5 text-sm text-card-foreground/90 leading-relaxed">{children}</div>
      <div className="rounded-xl bg-muted p-4 text-xs text-muted-foreground">
        This page describes how the software actually behaves. It is engineering documentation,
        not legal advice, and makes no claim of certification or full compliance with any law.
      </div>
    </div>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="font-heading text-base font-semibold text-foreground mt-5 mb-1.5">{children}</h2>;
}

function OperatorBlocker() {
  return (
    <div role="note" className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Operator details required before public launch</p>
          <p className="mt-1">
            The legal entity, registered address, grievance-officer name, and contact email are
            not yet provided and must be supplied by the project owner. They are intentionally left
            blank rather than filled with placeholder data.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalShell icon={<ShieldCheck size={22} aria-hidden="true" />} title="Privacy & Data Handling">
      <p>
        Plant Doctor is designed to collect as little personal data as possible. It has no user
        accounts, no advertising, and no third-party analytics or tracking SDKs.
      </p>

      <H>What you provide</H>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Your question text</strong> and the <strong>crop / region / growth stage</strong> you select.</li>
        <li>An <strong>optional photo</strong> of a plant, if you choose to attach one.</li>
        <li>Your <strong>language</strong> preference.</li>
      </ul>

      <H>How it is processed</H>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong>When online:</strong> your question text and selected context are sent to the
          Plant Doctor backend, which queries a MongoDB Atlas evidence database to retrieve matching
          agricultural sources. The backend does not store your questions or answers, and does not
          keep a per-user history (verified: no question/answer database writes, no request logging
          of question or image content).
        </li>
        <li>
          <strong>Photos:</strong> an attached photo is processed in memory to assist assessment and
          is not written to disk or a database by the backend (verified: no image persistence). The
          app also supports on-device image classification in your browser (ONNX Runtime Web), in
          which case the photo does not leave your device.
        </li>
        <li>
          <strong>Optional cloud language model (Gemini):</strong> not configured in this build. If
          enabled in future, the data flow and notice must be updated before it is used.
        </li>
      </ul>

      <H>Stored on your device only</H>
      <p>
        Downloaded offline knowledge packs (IndexedDB) and small conveniences such as your recent
        questions and language choice (browser local storage) are kept on your device. They are not
        transmitted to us and can be cleared from the app or via your browser settings.
      </p>

      <H>Retention</H>
      <p>
        We do not retain your questions, answers, or photos on the server. On-device data persists
        until you clear it.
      </p>

      <H>Your choices & rights</H>
      <p>
        You can use the app without an account, decline to attach photos, and clear on-device data at
        any time. India's Digital Personal Data Protection framework may grant additional rights
        (access, correction, erasure, grievance redressal). Because the app stores no personal data
        server-side, most such requests concern on-device data you already control; a grievance
        contact must still be provided before public launch.
      </p>

      <OperatorBlocker />
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell icon={<FileText size={22} aria-hidden="true" />} title="Terms of Use">
      <p>
        Plant Doctor provides evidence-grounded agricultural information to help you understand
        possible causes of plant-health issues and locate traceable sources. It is decision support,
        not a guaranteed diagnosis or a substitute for professional agronomic advice.
      </p>

      <H>Appropriate use</H>
      <ul className="list-disc list-inside space-y-1">
        <li>Treat results as guidance to verify, not as confirmed instructions.</li>
        <li>A photo assessment or model score is not proof of a specific disease.</li>
        <li>Follow local regulations and label directions for any pesticide or treatment, and consult a local agricultural extension service for high-stakes decisions.</li>
      </ul>

      <H>Availability & limitations</H>
      <ul className="list-disc list-inside space-y-1">
        <li>Online question answering and library sync require an internet connection and a running backend.</li>
        <li>Offline features are limited to the application shell and any knowledge packs you have downloaded.</li>
        <li>The service is provided on an "as is" basis without warranties of accuracy, availability, or fitness for a particular purpose, to the extent permitted by law.</li>
      </ul>

      <H>No payments</H>
      <p>
        Plant Doctor does not sell products, subscriptions, or paid consultations. There is no
        checkout, payment processing, or refund process. A refund policy is therefore not applicable
        to the current product.
      </p>

      <OperatorBlocker />
    </LegalShell>
  );
}

export function StoragePolicyPage() {
  return (
    <LegalShell icon={<Database size={22} aria-hidden="true" />} title="Cookies & Local Storage">
      <p>
        Plant Doctor does not use advertising or analytics cookies, and loads no third-party tracking
        scripts. Because there is no non-essential tracking, there is no consent banner to accept or
        reject — there is nothing to opt out of.
      </p>

      <H>What is stored, and where</H>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Service worker cache</strong> — the app shell and static assets, so the app opens quickly and works offline. Essential for the installable (PWA) experience.</li>
        <li><strong>IndexedDB</strong> — knowledge packs you choose to download for offline reference.</li>
        <li><strong>Local storage</strong> — small conveniences such as your recent questions and language preference.</li>
      </ul>
      <p>
        All of the above stays on your device. None of it is a tracking cookie, and none of it is
        sent to an analytics provider. Browser storage used for app functionality is not equivalent
        to advertising tracking.
      </p>

      <H>Clearing your data</H>
      <p>
        You can clear on-device data from the app where offered, or via your browser's site-data
        controls. Clearing it removes downloaded packs and saved preferences.
      </p>
    </LegalShell>
  );
}
