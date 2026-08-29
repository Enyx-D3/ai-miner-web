import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white/90 px-4 backdrop-blur-xl lg:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="font-tight text-sm font-extrabold">Brain2 AI Miner · Mission Control</span>
        </header>
        <main className="min-w-0 flex-1 bg-[linear-gradient(180deg,#fbfdff,#ffffff_38%)]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
