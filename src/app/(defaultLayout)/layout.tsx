import Navbar from "@/components/Navbar/page";
import Footer from "@/components/Footer/Footer";
import CustomCursor from "@/components/common/CustomCursor";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-white selection:bg-blue-500 selection:text-white">
      <CustomCursor />
      <Navbar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
