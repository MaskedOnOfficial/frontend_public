import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Compass, Plus, Inbox, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Feed", icon: Home, end: true },
  { to: "/parties", label: "Discover", icon: Compass, end: false },
  { to: "/parties/create", label: "Host", icon: Plus, end: false, special: true },
  { to: "/my-requests", label: "Requests", icon: Inbox, end: false },
  { to: "/profile/me", label: "Profile", icon: User, end: false },
] as const;

export default function BottomTabNav() {
  const location = useLocation();

  // Highlight Profile tab for /profile/me and /settings
  function isProfileActive() {
    return location.pathname === "/profile/me" || location.pathname.startsWith("/settings");
  }

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)" }}>
      {/* Frosted glass backdrop */}
      <div className="absolute inset-0 bottom-nav-glass backdrop-blur-2xl" />

      <div className="relative mx-auto max-w-lg px-3 pt-1.5 pb-1">
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isProfileTab = tab.to === "/profile/me";
            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  aria-label={tab.label}
                  className={({ isActive: navIsActive }) => {
                    const isActive = isProfileTab ? isProfileActive() : navIsActive;
                    return `flex flex-col items-center justify-center py-1.5 text-[10px] font-semibold transition-colors tap-active ${
                      'special' in tab && tab.special
                        ? "text-white"
                        : isActive
                          ? "text-primary"
                          : "text-text-dim"
                    }`;
                  }}
                >
                  {({ isActive: navIsActive }) => {
                    const isActive = isProfileTab ? isProfileActive() : navIsActive;
                    return (
                    <>
                      {'special' in tab && tab.special ? (
                        <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center -mt-5 transition-all ${
                          isActive
                            ? "bg-gradient-to-br from-primary to-hot shadow-lg shadow-primary/25 scale-105"
                            : "bg-gradient-to-br from-primary/80 to-accent/80 shadow-md shadow-primary/15"
                        }`}>
                          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="relative p-1.5">
                          {isActive && (
                            <motion.div
                              layoutId="bottom-tab-active"
                              className="absolute inset-0 bg-primary/10 rounded-xl"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Icon className={`relative z-10 w-[22px] h-[22px] transition-colors ${isActive ? "text-primary" : ""}`} strokeWidth={isActive ? 2.2 : 1.7} />
                        </div>
                      )}
                      <span className={`leading-none tracking-wide ${'special' in tab && tab.special ? "mt-1.5" : "mt-0.5"}`}>
                        {tab.label}
                      </span>
                    </>
                  )}}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
