import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/auth-hook";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold text-text mb-3">{title}</h2>
      <div className="text-text-muted text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? (user ? "/settings" : "/");

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10 md:pt-8">

        <Link to={from} className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Terms of Service</h1>
              <p className="text-text-muted text-xs">Last updated: April 27, 2026</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6">

          <p className="text-text-muted text-sm leading-relaxed mb-8">
            By creating an account or using maskedOn ("the Platform"), you agree to these Terms of Service. Please read them carefully. If you do not agree, do not use the Platform.
          </p>

          <Section title="1. Eligibility">
            <p>You must be at least <strong className="text-text">18 years old</strong> to use maskedOn. By registering, you represent that you meet this requirement. We reserve the right to terminate accounts that violate this rule.</p>
          </Section>

          <Section title="2. Your Account">
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Provide accurate and truthful registration information</li>
              <li>Not share your account with others</li>
              <li>Notify us immediately of any unauthorised access to your account</li>
              <li>Not create multiple accounts to circumvent bans or ratings</li>
            </ul>
          </Section>

          <Section title="3. Acceptable Use">
            <p>You agree not to use maskedOn to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Post false, misleading, or fraudulent party listings</li>
              <li>Harass, threaten, or intimidate other users</li>
              <li>Discriminate against others based on race, religion, gender, sexual orientation, disability, or nationality</li>
              <li>Share illegal content, including but not limited to content involving minors</li>
              <li>Scrape, crawl, or automate interactions with the Platform without written permission</li>
              <li>Attempt to reverse-engineer, hack, or otherwise compromise the Platform's security</li>
              <li>Manipulate the social rating system (e.g., through fake accounts, coordinated review bombing)</li>
            </ul>
          </Section>

          <Section title="4. Party Hosting Responsibilities">
            <p>As a host, you are solely responsible for:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The accuracy of your event listing, including venue, date, time, and capacity</li>
              <li>Complying with all applicable local laws regarding events, noise, and occupancy</li>
              <li>Ensuring the safety and well-being of attendees at your event</li>
              <li>Honouring approved tickets; cancellations must be communicated promptly</li>
            </ul>
            <p>maskedOn is a platform for discovery and management — we are <strong className="text-text">not</strong> the organiser, venue, or host of any event.</p>
          </Section>

          <Section title="5. Social Rating System">
            <p>Ratings are given voluntarily by event participants. We reserve the right to investigate and remove ratings that are found to be fraudulent, coerced, or in violation of these Terms. Ratings are not removed solely because they are unfavourable.</p>
          </Section>

          <Section title="6. Payments">
            <p>maskedOn currently uses a mock payment system for demonstration purposes. No real financial transactions are processed through the Platform at this time. When real payments are introduced, separate payment terms will apply.</p>
          </Section>

          <Section title="7. Content Ownership">
            <p>You retain ownership of photos and content you post. By uploading content, you grant maskedOn a non-exclusive, royalty-free licence to display it on the Platform for the purpose of providing our services. You may delete your content at any time.</p>
            <p>You warrant that you have the rights to any content you upload and that it does not infringe any third-party intellectual property rights.</p>
          </Section>

          <Section title="8. Termination">
            <p>We reserve the right to suspend or permanently terminate your account at our sole discretion if you violate these Terms. You may delete your account at any time from Settings. Account deletion is permanent and irreversible.</p>
          </Section>

          <Section title="9. Disclaimers & Limitation of Liability">
            <p>maskedOn is provided "as is" without warranties of any kind. We are not liable for:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The conduct of hosts or guests at events</li>
              <li>Inaccuracies in event listings created by hosts</li>
              <li>Loss or damage arising from your use or inability to use the Platform</li>
              <li>Any indirect, incidental, or consequential damages</li>
            </ul>
            <p>Our total liability to you for any claim shall not exceed the amount you paid to maskedOn in the 12 months preceding the claim (currently ₹0, as the Platform is free).</p>
          </Section>

          <Section title="10. Governing Law">
            <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra.</p>
          </Section>

          <Section title="11. Changes to These Terms">
            <p>We may update these Terms from time to time. We will notify you of material changes via in-app notification. Continued use of the Platform constitutes acceptance of the updated Terms.</p>
          </Section>

          <Section title="12. Contact">
            <p>
              For legal inquiries, contact us at{" "}
              <a href="mailto:legal@maskedon.app" className="text-primary hover:underline">legal@maskedon.app</a>.
            </p>
          </Section>

        </motion.div>
      </div>
    </div>
  );
}
