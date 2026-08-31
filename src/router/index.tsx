import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import AgentHome from "@/pages/AgentHome";
import Browse from "@/pages/Browse";
import Orders from "@/pages/Orders";
import Audit from "@/pages/Audit";
import Merchant from "@/pages/Merchant";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <AgentHome /> },
      { path: "browse", element: <Browse /> },
      { path: "orders", element: <Orders /> },
      { path: "audit", element: <Audit /> },
      { path: "merchant", element: <Merchant /> },
    ],
  },
]);
