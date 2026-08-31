import { ChevronDown } from "lucide-react";

interface UserMenuProps {
  name?: string;
  plan?: string;
  collapsed?: boolean;
}

export function UserMenu({
  name = "Your account",
  plan = "Free plan",
  collapsed = false,
}: UserMenuProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="border-t border-app-border p-3">
      <button
        title={collapsed ? name : undefined}
        className={`w-full flex items-center rounded-lg hover:bg-app-bg transition-colors ${
          collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2 py-2"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-app-accent text-white flex items-center justify-center text-xs font-medium shrink-0">
          {initial}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-app-text truncate">
                {name}
              </p>
              <p className="text-xs text-app-text-muted truncate">{plan}</p>
            </div>
            <ChevronDown
              className="w-4 h-4 text-app-text-muted shrink-0"
              aria-hidden="true"
            />
          </>
        )}
      </button>
    </div>
  );
}
