import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6 py-20 text-center">
      <div>
        <div className="refinery-eyebrow mb-3">Brain2 AI Miner</div>
        <h1 className="font-tight text-4xl font-black tracking-[-.04em] text-[var(--navy)]">Page not found</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--secondary-text)]">Return to your Brain2 intelligence workspace or import history into local memory.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-xl bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white">Open workspace</Link>
          <Link href="/memory" className="rounded-xl border px-4 py-2 text-sm font-bold">Import memory</Link>
        </div>
      </div>
    </main>
  );
}
