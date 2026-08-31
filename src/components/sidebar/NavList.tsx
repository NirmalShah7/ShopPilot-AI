import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/lib/constants";

interface NavListProps {
  collapsed?: boolean;
}

export function NavList({ collapsed = false }: NavListProps) {
  return (
    <nav className="px-2 py-2">
      {NAV_ITEMS.map(({ id, label, path, icon: Icon, badge }) => (
        <NavLink
          key={id}
          to={path}
          end={path === "/"}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            `w-full flex items-center rounded-lg text-sm mb-0.5 transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2"
            } ${
              isActive
                ? "bg-app-accent-soft text-app-text font-medium"
                : "text-app-text-soft hover:bg-app-bg"
            }`
          }
        >
          <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span className="text-[10px] font-medium bg-app-accent text-white px-1.5 py-0.5 rounded">
                  {badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
