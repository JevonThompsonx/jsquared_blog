import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "About — J²Adventures",
  description: "Two people with the travel bug and a lot of trail miles between them. Meet the J's behind J²Adventures.",
};

function PhotoPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--accent-soft)] to-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] ${className}`}>
      <svg className="h-8 w-8 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-xs font-medium opacity-50">{label}</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main id="main-content" className="min-h-screen pb-20 pt-20 sm:pt-24" style={{ background: "var(--background)" }}>
      <SiteHeader />

      {/* Hero banner */}
      <div className="relative w-full overflow-hidden">
        <PhotoPlaceholder label="Hero photo — trails, van, or landscape" className="mx-auto h-64 max-w-none w-full rounded-none sm:h-80 lg:h-96" />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent">
          <div className="container mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary-light)]">Est. somewhere between a trailhead and a campfire</p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">The story behind J²</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Intro — photo floated right */}
        <section className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-lg sm:p-8 lg:p-10">
            {/* Float photo */}
            <PhotoPlaceholder
              label="The two of us"
              className="mb-4 h-56 w-full sm:float-right sm:mb-0 sm:ml-8 sm:h-64 sm:w-64 lg:h-72 lg:w-72"
            />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Who we are</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Two people with a serious travel bug.</h2>
            <div className="prose-content mt-4 space-y-4 text-[var(--text-secondary)]">
              <p>
                J²Adventures is what happens when a self-taught tech guy and a Cal Poly-educated outdoor enthusiast decide that sitting still is overrated. We are Jevon and Jessica — two people who found each other, found the trails, and never really looked back.
              </p>
              <p>
                We started this blog because we kept telling the same stories at dinner tables and thought: someone else probably wants to hear this. Maybe you are planning a trip. Maybe you just want to live vicariously through someone else&apos;s bad decisions on a mountain. Either way, you are in the right place.
              </p>
              <p>
                We cover hikes, backpacking trips, van life dispatches, camping spots, and the occasional gear rabbit hole. No fluff, no algorithm-optimized lists — just the honest version of what happened and where we went.
              </p>
            </div>
            <div className="clear-both" />
          </div>
        </section>

        {/* Meet the J's */}
        <section className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Meet the J&apos;s</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">The people behind the posts</h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">

            {/* Jevon */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg">
              <PhotoPlaceholder label="Jevon — photo" className="h-56 w-full rounded-none rounded-t-2xl" />
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">The tech half</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Jevon</h3>
                <div className="prose-content mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
                  <p>
                    Systems administrator by trade, self-taught developer by curiosity. Grew up in Jamaica with a habit of taking things apart to see how they worked — phones, computers, eventually servers. That curiosity followed him to America and hasn&apos;t slowed down since.
                  </p>
                  <p>
                    On the trail he is the one with too many podcast recommendations downloaded offline and strong opinions about camp coffee. Off the trail he builds the systems that keep this blog running.
                  </p>
                </div>
              </div>
            </div>

            {/* Jessica */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg">
              <PhotoPlaceholder label="Jessica — photo" className="h-56 w-full rounded-none rounded-t-2xl" />
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">The outdoors half</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Jessica</h3>
                <div className="prose-content mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
                  <p>
                    Cal Poly graduate, certified granola girl, and the reason we own crampons. She built her own van — with her own hands, from scratch — which is either extremely impressive or a sign of a problem, depending on who you ask.
                  </p>
                  <p>
                    She has been hiking, backpacking, and generally preferring dirt roads to highways for longer than she&apos;d like to admit. If there is a trail, she has probably already looked up the elevation profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What we love — 3 columns */}
        <section className="mt-10">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-lg sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">What we cover</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">On the road and on the trail</h2>

            {/* Photo strip — 3 across */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <PhotoPlaceholder label="Hiking" className="aspect-square" />
              <PhotoPlaceholder label="Van / camping" className="aspect-square" />
              <PhotoPlaceholder label="Travel" className="aspect-square" />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { title: "Hiking & backpacking", body: "Day hikes, multi-day trips, the occasional Type 2 fun experience we probably should have trained harder for." },
                { title: "Van life & camping", body: "Dispatches from the road. The van has a name. We will get to that." },
                { title: "Travel & gear", body: "Where we went, what we brought, and honestly what we would leave behind next time." },
              ].map((item) => (
                <div key={item.title} className="rounded-xl bg-[var(--background)] p-4">
                  <h3 className="font-bold text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent-soft)] to-transparent p-8 shadow-lg sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Enough about us</p>
              <h2 className="mt-1.5 text-2xl font-bold text-[var(--text-primary)]">Read the adventures.</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">The blog is where the real stories are. Start with whatever looks interesting.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                className="btn-primary rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5"
                href="/"
              >
                Browse stories →
              </Link>
              <Link
                className="rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-6 py-2.5 text-sm font-bold text-[var(--text-primary)] shadow-sm transition-transform hover:-translate-y-0.5"
                href="/signup"
              >
                Join the conversation
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
