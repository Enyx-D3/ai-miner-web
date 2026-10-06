import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ReduxProvider from "@/redux/ReduxProvider";
import { Brain2Provider } from "@/components/brain2/Brain2Provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "brain2:inContext — Brain2 Labs",
    template: "%s — brain2:inContext",
  },
  description: "Persistent AI project continuity: source-backed memory, Current Truth, evidence, recall, handoff, and portable Brain2 context.",
  openGraph: {
    title: "brain2:inContext",
    description: "Keep the context. Continue the work.",
    siteName: "brain2:inContext",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "brain2:inContext",
    description: "Persistent AI project continuity by Brain2 Labs.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased" data-brain2-ai-miner="true" data-brain2-version="9.0.7"><ReduxProvider><Brain2Provider>{children}<Toaster position="bottom-right"/></Brain2Provider></ReduxProvider></body></html>;
}
