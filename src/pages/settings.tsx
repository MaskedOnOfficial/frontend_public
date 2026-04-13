import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { useTheme } from "../context/use-theme";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Moon, Sun, LogOut, Settings, Shield, User, Mail, Calendar, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setBio(user.bio || "");
    }
  }, [user]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.put("/users/me", { display_name: displayName, bio });
      await refreshUser();
      setMessage("Profile updated successfully!");
      setMessageType("success");
      setEditing(false);
    } catch (error: unknown) {
      setMessage(getApiErrorMessage(error, "Update failed"));
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await logout();
    navigate("/auth/login", { replace: true });
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Back nav */}
        <Link to="/profile/me" className="text-text-muted hover:text-text text-sm mb-6 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text tracking-tight">Settings</h1>
              <p className="text-text-muted text-sm">Manage your account and preferences</p>
            </div>
          </div>
        </motion.div>

        {/* Status message */}
        {message && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={`${messageType === "success" ? "bg-success/10 border-success/15 text-success" : "bg-error/10 border-error/20 text-error"} border rounded-xl px-4 py-3 mb-6 text-sm`}>
            {message}
          </motion.div>
        )}

        {/* Profile Edit section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Profile Information
            </h2>
            {!editing && (
              <button onClick={() => { setEditing(true); setMessage(""); }}
                className="btn-secondary-luxe text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
                  className="input-luxe w-full rounded-xl px-4 py-3.5 resize-none text-sm" placeholder="Tell people about yourself..." />
                <p className="text-text-dim text-[10px] mt-1 text-right">{bio.length}/500</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="btn-primary-luxe font-bold px-6 py-3 rounded-xl transition disabled:opacity-50 flex-1 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
                </button>
                <button type="button" onClick={() => { setEditing(false); setDisplayName(user.display_name); setBio(user.bio || ""); }}
                  className="btn-secondary-luxe px-6 py-3 rounded-xl transition">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {[
                { icon: User, label: "Display Name", value: user.display_name },
                { icon: Mail, label: "Email", value: user.email },
                { icon: Shield, label: "Username", value: `@${user.username}` },
                { icon: Edit3, label: "Bio", value: user.bio || "No bio set" },
                { icon: Calendar, label: "Member Since", value: new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 border-b border-primary/[0.06] pb-4 last:border-b-0 last:pb-0">
                  <item.icon className="w-4 h-4 text-text-dim mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-text-dim uppercase tracking-wider font-bold block">{item.label}</span>
                    <p className="text-text mt-0.5 text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Theme */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-warning" />}
            Appearance
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => toggleTheme("dark")}
              className={`px-4 py-3.5 rounded-xl font-bold text-sm transition border flex items-center justify-center gap-2 ${
                theme === "dark"
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-surface-light text-text border-primary/[0.08] hover:border-primary/15"
              }`}>
              <Moon className="w-4 h-4" /> Dark Mode
            </button>
            <button onClick={() => toggleTheme("light")}
              className={`px-4 py-3.5 rounded-xl font-bold text-sm transition border flex items-center justify-center gap-2 ${
                theme === "light"
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-surface-light text-text border-primary/[0.08] hover:border-primary/15"
              }`}>
              <Sun className="w-4 h-4" /> Light Mode
            </button>
          </div>
        </motion.div>

        {/* Dashboard Link */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-hot" /> Host Dashboard
          </h2>
          <p className="text-text-muted text-sm mb-4">Manage your hosted parties, view requests, and track metrics.</p>
          <Link to="/dashboard" className="btn-secondary-luxe w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
            Open Host Dashboard
          </Link>
        </motion.div>

        {/* Sign Out */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-6">
          <button onClick={handleSignOut}
            className="bg-error/10 text-error hover:bg-error/20 font-bold px-4 py-3.5 rounded-xl transition border border-error/15 text-sm w-full flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      </div>
    </div>
  );
}
