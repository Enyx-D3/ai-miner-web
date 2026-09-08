import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ReduxProvider from "@/redux/ReduxProvider";
import { Brain2Provider } from "@/components/brain2/Brain2Provider";
import Brain2McpBrowserBridge from "@/components/brain2/Brain2McpBrowserBridge";

export const metadata: Metadata = {
  title: "Brain2 AI Miner — Brain2 Labs",
  description: "Mine AI history into source-backed projects, current truth, live notebooks, wiki, ticks, patterns, experiments and durable memory.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased" data-brain2-ai-miner="true" data-brain2-version="9.0.7"><ReduxProvider><Brain2Provider><Brain2McpBrowserBridge />{children}<Toaster position="bottom-right"/></Brain2Provider></ReduxProvider></body></html>;
}
