import { NavLink, useLocation } from "react-router-dom";
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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 6px)" }}>
      {/* Frosted backdrop */}
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-2xl border-t border-primary/[0.08]" />

      <div className="relative mx-auto max-w-lg px-2 py-1.5">
        <ul className="grid grid-cols-5 gap-1">
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
                    return `flex flex-col items-center justify-center rounded-2xl py-2 text-[10px] font-semibold transition-all duration-200 tap-active ${
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
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center -mt-4 shadow-lg transition-all ${
                          isActive
                            ? "bg-gradient-to-br from-primary to-hot shadow-primary/30 scale-110"
                            : "bg-gradient-to-br from-primary/80 to-accent/80 shadow-primary/20"
                        }`}>
                          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                          <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                          {isActive && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-sm shadow-primary/50" />
                          )}
                        </div>
                      )}
                      <span className={`mt-0.5 leading-none tracking-wide ${'special' in tab && tab.special ? "mt-1.5" : ""}`}>
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
