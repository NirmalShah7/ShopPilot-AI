import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useUIStore } from "@/store/uiStore";
import { ToastViewport } from "@/components/ui/ToastViewport";

export function AppShell() {
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar);

  return (
    <div className="h-screen w-full flex bg-app-bg overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-app-border bg-app-sidebar">
          <button onClick={openMobileSidebar} aria-label="Open menu">
            <Menu className="w-5 h-5 text-app-text" aria-hidden="true" />
          </button>
          <span className="font-medium text-app-text">Shopping agent</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
