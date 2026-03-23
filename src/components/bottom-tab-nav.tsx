import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Feed", icon: "◉" },
  { to: "/parties", label: "Discover", icon: "◇" },
  { to: "/parties/create", label: "Host", icon: "+" },
  { to: "/my-requests", label: "Requests", icon: "◎" },
  { to: "/dashboard", label: "Dashboard", icon: "◍" },
] as const;

export default function BottomTabNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-surface/90 backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="mx-auto max-w-3xl px-2 py-1.5">
        <ul className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center rounded-xl py-2.5 text-[11px] font-semibold transition ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-text-muted hover:text-text hover:bg-white/5"
                  }`
                }
              >
                <span className="text-sm leading-none">{tab.icon}</span>
                <span className="mt-1 leading-none">{tab.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
