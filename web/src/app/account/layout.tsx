import { SiteHeader } from "@/components/layout/site-header";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28">
        {children}
      </main>
    </div>
  );
}
