import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ReduxProvider from "@/redux/ReduxProvider";
import { Brain2Provider } from "@/components/brain2/Brain2Provider";

export const metadata: Metadata = {
  title: "Brain2InContext — Brain2 Labs",
  description: "Bring AI history into one source-backed context workspace for projects, Current Truth, recall, live notebooks, evidence and durable memory.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased" data-brain2-ai-miner="true" data-brain2-version="9.0.7"><ReduxProvider><Brain2Provider>{children}<Toaster position="bottom-right"/></Brain2Provider></ReduxProvider></body></html>;
}
