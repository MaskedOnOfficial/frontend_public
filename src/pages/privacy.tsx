import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
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

export default function PrivacyPolicyPage() {
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Privacy Policy</h1>
              <p className="text-text-muted text-xs">Last updated: April 27, 2026</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6">

          <p className="text-text-muted text-sm leading-relaxed mb-8">
            maskedOn ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read it carefully.
          </p>

          <Section title="1. Information We Collect">
            <p><strong className="text-text">Account information:</strong> When you register, we collect your display name, username, email address, and password (stored as a bcrypt hash — never in plain text).</p>
            <p><strong className="text-text">Profile information:</strong> Bio, profile photos, and social connections you choose to add.</p>
            <p><strong className="text-text">Party & event data:</strong> Events you create, join requests you make or receive, attendance records, and associated photos.</p>
            <p><strong className="text-text">Rating data:</strong> Star ratings you give or receive after events.</p>
            <p><strong className="text-text">Device information:</strong> Push notification tokens (if you opt in), device type, and operating system — used only for delivering notifications.</p>
            <p><strong className="text-text">Usage data:</strong> Pages visited, features used, and interaction patterns — collected in aggregate, not individually tracked.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Create and manage your account</li>
              <li>Enable party discovery, requests, approvals, and attendance</li>
              <li>Calculate and display your social rating</li>
              <li>Send push notifications about party approvals, ratings, and friend activity (only if you opt in)</li>
              <li>Detect and prevent fraud, abuse, and violations of our Terms of Service</li>
              <li>Improve the platform through aggregated analytics</li>
            </ul>
            <p>We do <strong className="text-text">not</strong> sell your personal information to third parties.</p>
          </Section>

          <Section title="3. Information Sharing">
            <p><strong className="text-text">With other users:</strong> Your display name, username, bio, photos, and social rating are visible to other users on the platform. Your email address is never shared.</p>
            <p><strong className="text-text">With service providers:</strong> We use Supabase for database hosting and Firebase for push notifications. These providers process your data on our behalf and are bound by data processing agreements.</p>
            <p><strong className="text-text">Legal requirements:</strong> We may disclose information if required by law, court order, or to protect the rights and safety of our users.</p>
          </Section>

          <Section title="4. Data Retention">
            <p>We retain your account data for as long as your account is active. If you delete your account, your personal information is permanently removed within 30 days. Party records and ratings may be retained in anonymised form for platform integrity.</p>
          </Section>

          <Section title="5. Security">
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>bcrypt hashing for all passwords</li>
              <li>JWT tokens for authentication (short-lived access tokens + refresh tokens)</li>
              <li>HTTPS encryption for all data in transit</li>
              <li>Parameterised SQL queries to prevent injection attacks</li>
              <li>Rate limiting on sensitive endpoints</li>
            </ul>
            <p>No method of transmission over the internet is 100% secure. We cannot guarantee absolute security but are committed to using best practices.</p>
          </Section>

          <Section title="6. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-text">Access</strong> your personal data at any time through your profile and settings</li>
              <li><strong className="text-text">Correct</strong> inaccurate data via the settings page</li>
              <li><strong className="text-text">Delete</strong> your account and all associated data from Settings → Delete Account</li>
              <li><strong className="text-text">Opt out</strong> of push notifications at any time through your device settings</li>
            </ul>
          </Section>

          <Section title="7. Cookies & Local Storage">
            <p>We use browser local storage to store your authentication tokens and UI preferences (e.g., dark/light theme). We do not use third-party advertising cookies. You can clear local storage through your browser settings, which will log you out of the app.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>maskedOn is intended for users aged 18 and older. We do not knowingly collect information from anyone under 18. If we become aware that a minor has created an account, we will delete it promptly.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via an in-app notification. Continued use of the platform after changes constitutes acceptance of the revised policy.</p>
          </Section>

          <Section title="10. Contact Us">
            <p>
              If you have questions about this Privacy Policy or wish to exercise your rights, contact us at{" "}
              <a href="mailto:privacy@maskedon.app" className="text-primary hover:underline">privacy@maskedon.app</a>.
            </p>
          </Section>

        </motion.div>
      </div>
    </div>
  );
}
