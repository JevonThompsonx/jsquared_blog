import { SiteHeader } from "@/components/layout/site-header";

export default function PublicAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <SiteHeader />
      <main className="flex min-h-screen items-center justify-center px-4 pt-24 pb-12">
        {children}
      </main>
    </div>
  );
}
