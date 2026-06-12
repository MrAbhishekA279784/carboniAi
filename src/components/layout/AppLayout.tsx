import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { AIContextAgent } from "../ai/AIContextAgent";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0 border-r border-neutral-200 bg-white shadow-sm z-10">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-0 scroll-smooth">
        <main className="min-h-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 safe-bottom">
        <MobileNav />
      </div>
    </div>
  );
}
