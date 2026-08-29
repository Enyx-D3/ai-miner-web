"use client";

import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, LockKeyhole, Zap, Ban, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/form/FormInput";
import { Card, CardContent } from "@/components/ui/card";

interface CheckoutScreenProps { onNavigate: (page: string) => void; }

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  cardNumber: z.string().min(12, "Enter a valid card number"),
  expiry: z.string().min(4, "Enter an expiry date"),
  cvc: z.string().min(3, "Enter a valid CVC"),
  cardholder: z.string().min(2, "Enter the cardholder name"),
});

type CheckoutForm = z.infer<typeof schema>;

export default function CheckoutScreen({ onNavigate }: CheckoutScreenProps) {
  const methods = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", cardNumber: "", expiry: "", cvc: "", cardholder: "" },
  });

  return (
    <div className="min-h-screen bg-secondary px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="font-tight text-[32px] font-extrabold tracking-[-.03em]">Complete your purchase</h1>
          <p className="mt-2 text-sm text-[var(--secondary-text)]">One-time payment. Access starts immediately.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <Card className="gap-0 py-0 shadow-none">
            <CardContent className="p-8">
              <h2 className="mb-6 font-tight text-base font-extrabold">Payment Details</h2>
              <div className="mb-6 flex flex-wrap gap-2 border-b pb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--blue-soft)] px-3 py-1.5 text-xs font-bold text-[var(--blue)]"><LockKeyhole className="size-3.5" />Secure payment</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--pink-soft)] px-3 py-1.5 text-xs font-bold text-[var(--pink)]"><Zap className="size-3.5" />One-time only</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1.5 text-xs font-bold text-[var(--secondary-text)]"><Ban className="size-3.5" />No subscription</span>
              </div>

              <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(() => onNavigate("payment-success"))} noValidate className="space-y-4">
                  <FormInput name="email" label="Email" type="email" placeholder="you@example.com" />
                  <FormInput name="cardNumber" label="Card Number" placeholder="1234 5678 9012 3456" startIcon={{ icon: CreditCard }} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput name="expiry" label="Expiry" placeholder="MM / YY" />
                    <FormInput name="cvc" label="CVC" placeholder="123" />
                  </div>
                  <FormInput name="cardholder" label="Cardholder Name" placeholder="Full name" />
                  <Button type="submit" className="btn-pink mt-4 h-12 w-full rounded-xl text-base font-bold"><LockKeyhole />Pay $29 & Start Processing</Button>
                </form>
              </FormProvider>
              <p className="mt-4 text-center text-xs text-muted-foreground">By completing your purchase you agree to our Terms of Service. No recurring charges.</p>
            </CardContent>
          </Card>

          <aside>
            <Card className="sticky top-24 gap-0 py-0 shadow-none">
              <CardContent className="p-6">
                <h2 className="mb-4 font-tight text-base font-extrabold">Order Summary</h2>
                <div className="mb-5 rounded-xl border bg-secondary p-4">
                  <p className="font-tight text-sm font-extrabold">AI Chat-History Refinery</p>
                  <p className="mb-3 text-xs text-muted-foreground">One-Time Processing Access</p>
                  <div className="flex items-baseline gap-1"><span className="font-tight text-[32px] font-black tracking-[-.04em]">$29</span><span className="text-xs text-muted-foreground">USD</span></div>
                </div>
                <div className="mb-5 space-y-2 text-sm">
                  {["24-hour processing access", "Complimentary 12-hour extension if needed", "Complete archive processing", "HTML, Markdown & CSV exports", "Works offline after delivery"].map((item) => (
                    <div key={item} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[var(--pink)]" /><span className="font-medium">{item}</span></div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-4"><strong className="text-sm">Total</strong><span className="font-tight text-lg font-extrabold">$29.00</span></div>
                <p className="mt-3 text-xs text-muted-foreground">One payment. No hidden fees. No subscription.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
