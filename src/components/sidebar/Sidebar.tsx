import { AnimatePresence, motion } from "framer-motion";
import { Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useChatStore } from "@/store/chatStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNavigate } from "react-router-dom";
import { ChatHistoryList } from "@/components/sidebar/ChatHistoryList";
import { NavList } from "@/components/sidebar/NavList";
import { UserMenu } from "@/components/sidebar/UserMenu";

interface SidebarContentProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SidebarContent({ collapsed = false, onToggleCollapse }: SidebarContentProps) {
  const createThread = useChatStore((s) => s.createThread);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-app-sidebar border-r border-app-border overflow-hidden">
      <div className={`flex items-center gap-2 p-4 ${collapsed ? "flex-col" : ""}`}>
        <button
          onClick={() => { createThread(); navigate("/"); }}
          title={collapsed ? "New chat" : undefined}
          className={`flex items-center justify-center gap-2 bg-app-accent hover:bg-app-accent-hover text-white text-sm font-medium rounded-xl py-2.5 transition-colors ${
            collapsed ? "w-10 h-10 shrink-0" : "flex-1"
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          {!collapsed && "New chat"}
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-app-text-soft hover:bg-app-bg transition-colors shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ChatHistoryList />
        </div>
      )}
      {collapsed && <div className="flex-1" />}

      <NavList collapsed={collapsed} />
      <UserMenu collapsed={collapsed} />
    </div>
  );
}

export function Sidebar() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isMobileSidebarOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar);
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);

  if (isDesktop) {
    return (
      <motion.div
        animate={{ width: isSidebarCollapsed ? 72 : 288 }}
        transition={{ type: "tween", duration: 0.2 }}
        className="shrink-0 h-full"
      >
        <SidebarContent
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
            className="fixed inset-0 bg-black/30 z-40"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-y-0 left-0 z-50 w-72"
          >
            <SidebarContent />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
