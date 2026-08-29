"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FormFileInput from "@/components/form/FormFileInput";

interface UploadScreenProps {
  onNavigate: (page: string) => void;
  onFileSet: (file: { file: File; name: string; size: string; sizeBytes: number; source: string }) => void;
}

const schema = z.object({
  archive: z.array(z.custom<File>()).min(1, "Choose a ZIP export to continue"),
});

type UploadForm = z.infer<typeof schema>;

const platforms = [
  { name: "ChatGPT", color: "#10a37f", steps: "Settings → Data Controls → Export Data → Download ZIP" },
  { name: "Claude", color: "#d97b4f", steps: "Settings → Privacy → Export your conversation data" },
  { name: "Gemini", color: "#4285f4", steps: "Google Account → Data & Privacy → Download your data" },
  { name: "Copilot", color: "#0078d4", steps: "Microsoft privacy dashboard → Export available conversation data" },
  { name: "Poe", color: "#8b5cf6", steps: "Settings → Privacy/Data → Export available history" },
];

const faqs = [
  { q: "What ZIP format is supported?", a: "Use the official ZIP archive exported from ChatGPT, Claude, or Google Takeout for Gemini." },
  { q: "Can I upload multiple exports?", a: "Yes. The full product flow can combine supported exports while preserving their original source identity." },
  { q: "How long does the free scan take?", a: "The preview is designed to surface useful counts and structure quickly, with timing depending on archive size." },
  { q: "Is my data safe?", a: "Files are handled for the requested processing flow and are not used to train shared models." },
];

function Stepper() {
  return (
    <div className="mx-auto mb-10 flex max-w-md items-center">
      {["Upload Export", "Free Scan", "See Results"].map((step, index) => (
        <div key={step} className="flex flex-1 items-center gap-2">
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-[var(--pink)] text-white" : "border bg-white text-muted-foreground"}`}>{index + 1}</span>
          <span className={`text-xs font-semibold ${index === 0 ? "text-[var(--pink)]" : "text-muted-foreground"}`}>{step}</span>
          {index < 2 && <span className="mx-1 h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}

export default function UploadScreen({ onNavigate, onFileSet }: UploadScreenProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const methods = useForm<UploadForm>({
    resolver: zodResolver(schema),
    defaultValues: { archive: [] },
  });

  const onSubmit = ({ archive }: UploadForm) => {
    const file = archive[0];
    const source = "Auto-detect";
    onFileSet({ file, name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, sizeBytes: file.size, source });
    onNavigate("scan-processing");
  };

  return (
    <div className="refinery-page">
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
        <Stepper />
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h1 className="font-tight text-[32px] font-extrabold tracking-[-0.03em] text-foreground">Upload your exported archive</h1>
            <p className="mb-7 mt-2 text-base text-[var(--secondary-text)]">We&apos;ll scan it for free—no payment required to see what&apos;s inside.</p>

            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} noValidate>
                <FormFileInput
                  name="archive"
                  label=""
                  type="archive"
                  localOnly
                  variant="refinery"
                  height="h-80"
                  description="Your files are private and encrypted during the processing flow."
                />
                <Button type="submit" size="auto" className="btn-blue mt-4 w-full rounded-xl py-4 text-sm font-bold">Start Scan →</Button>
              </form>
            </FormProvider>

            <Card className="mt-5 gap-0 py-0 shadow-none">
              <CardContent className="p-5">
                <p className="mb-3 font-tight text-sm font-extrabold">File Requirements</p>
                <div className="grid grid-cols-2 gap-3">
                  {[["Format", "ZIP archive"], ["Sources", "ChatGPT, Claude, Gemini"], ["Contents", "Conversation/activity JSON"], ["Metadata", "Supported if included"]].map(([label, value]) => (
                    <div key={label} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--pink)]" />
                      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <section className="mt-8">
              <h2 className="mb-4 font-tight text-base font-extrabold">How to export from each platform</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {platforms.map((platform) => (
                  <Card key={platform.name} className="gap-0 py-0 shadow-none transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: platform.color }} /><strong className="text-sm">{platform.name}</strong></div>
                      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{platform.steps}</p>
                      <Button type="button" variant="ghost" size="auto" className="text-xs font-bold text-[var(--blue)]">View Guide →</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-4 font-tight text-base font-extrabold">FAQ</h2>
              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <Card key={faq.q} className="gap-0 overflow-hidden py-0 shadow-none">
                    <Button type="button" variant="ghost" size="auto" className="w-full justify-between rounded-none px-5 py-4 text-left" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                      <span className="text-sm font-bold">{faq.q}</span><ChevronDown className={`size-4 text-muted-foreground transition ${openFaq === index ? "rotate-180" : ""}`} />
                    </Button>
                    {openFaq === index && <CardContent className="border-t px-5 py-4 text-sm leading-relaxed text-[var(--secondary-text)]">{faq.a}</CardContent>}
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <aside>
            <Card className="sticky top-24 gap-0 py-0 shadow-[0_6px_20px_rgba(19,25,47,.045)]">
              <CardContent className="p-6">
                <span className="mb-4 inline-flex rounded-full border border-[#f5c0df] bg-[var(--pink-soft)] px-3 py-1.5 text-xs font-bold text-[var(--pink)]">FREE SCAN</span>
                <h3 className="mb-4 font-tight text-base font-extrabold">What you get with a Free Scan</h3>
                <div className="space-y-3">
                  {["Total word & message counts", "Conversation count & date range", "Estimated project clusters", "Top topics preview", "Timeline overview", "Sample organization preview"].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-[var(--pink)]" /><span>{item}</span></div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-[var(--blue-soft)] p-4">
                  <div className="flex gap-3"><ShieldCheck className="size-5 text-[var(--blue)]" /><div><p className="text-sm font-bold">Private by design</p><p className="mt-1 text-xs text-[var(--secondary-text)]">No card required for the preview scan.</p></div></div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4 text-[var(--pink)]" />Your archive remains source-aware.</div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
