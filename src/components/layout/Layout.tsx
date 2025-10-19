"use client";

import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MadeWithDyad } from "@/components/made-with-dyad";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State to control the Sheet

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] bg-background text-foreground">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="hidden border-r bg-sidebar md:block shadow-md">
          <Sidebar />
        </div>
      )}

      <div className="flex flex-col">
        {/* Mobile Header with Sheet Trigger */}
        {isMobile && (
          <header className="flex h-16 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 shadow-sm">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}> {/* Control Sheet state */}
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col w-64 sm:w-72">
                <Sidebar onClose={() => setIsSheetOpen(false)} /> {/* Pass onClose prop */}
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
              <span>Mais Que Papel</span>
            </Link>
          </header>
        )}

        {/* Main Content */}
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-8 lg:p-8">
          {children}
        </main>

        {/* Footer / MadeWithDyad */}
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Layout;