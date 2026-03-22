import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "About — J²Adventures",
  description: "Two people, a van named Blu, and a serious travel bug. Meet the J\u2019s behind J²Adventures.",
};

function PhotoPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[var(--accent-soft)] to-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)] ${className}`}>
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
    <main id="main-content" className="min-h-screen pb-20 pt-20 sm:pt-24" style={{ background: "var(--background)" }} tabIndex={-1}>
      <SiteHeader />

      {/* Hero banner */}
      <div className="relative w-full overflow-hidden" style={{ background: "var(--background)" }}>
        <div className="relative mx-auto h-64 w-full max-w-6xl sm:h-80 lg:h-[28rem]">
          <Image src="/images/us.webp" alt="Jevon and Jessica" fill className="object-cover lg:rounded-b-2xl" priority />
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent lg:rounded-b-2xl">
            <div className="container mx-auto max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/90">Est. somewhere between a trailhead and a campfire</p>
              <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">The story behind J²</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Intro — photo floated right */}
        <section className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-lg sm:p-8 lg:p-10">
            {/* Float photo */}
            <div className="relative mb-4 h-56 w-full overflow-hidden rounded-2xl sm:float-right sm:mb-0 sm:ml-8 sm:h-64 sm:w-64 lg:h-72 lg:w-72">
              <Image src="/images/us.webp" alt="Jevon and Jessica" fill className="object-cover" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Who we are</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Two people with a serious travel bug.</h2>
            <div className="prose-content mt-4 space-y-4 text-[var(--text-secondary)]">
              <p>
                J²Adventures is what happens when a self-taught tech guy and a casual outdoor enthusiast decide that sitting still is overrated. We are Jevon and Jessica — two people who found each other, found the trails, and never really looked back.
              </p>
              <p>
                We started this blog because we wanted to have a digital scrapbook of everywhere we went, everything we did, and someplace to dump all of our random thoughts we had along the way. This blog is mostly for us, but we thought, why not share it? If we love hearing stories like this, there are others out there who might want to hear <em>our</em> stories too. Maybe you are planning a trip. Maybe you just want to live vicariously through someone else&apos;s bad decisions on a mountain. Either way, you are in the right place.
              </p>
              <p>
                We cover hikes, backpacking trips, van life dispatches, camping spots, and the occasional gear rabbit hole. No fluff, no algorithm-optimized lists — just the honest version of what happened and where we went. We&apos;ll see you out there.
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
              <div className="relative h-56 w-full">
                <Image src="/images/me.webp" alt="Jevon" fill className="object-cover rounded-t-2xl" style={{ objectPosition: "center 20%" }} />
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">The tech half</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Jevon</h3>
                <div className="prose-content mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
                  <p>
                    Professional vibe coder of this website and always open to try anything once (on the trail...what were you thinking?). Growing up in Jamaica, he loved being outside, and you could always catch him trying to get to the highest point in sight, whether that was by climbing a tree or a mountain.
                  </p>
                  <p>
                    On the trail he is the one with two battery backups with a solar charger on hand, a fully downloaded audiobook and comic library &ldquo;so he has options,&rdquo; yet he still forgot his water bottle in the car. Off the trail he builds the systems that keep this blog running.
                  </p>
                </div>
              </div>
            </div>

            {/* Jessica */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg">
              <div className="relative h-56 w-full">
                <Image src="/images/tiddies.webp" alt="Jessica" fill className="object-cover rounded-t-2xl" />
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">The outdoors half</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Jessica</h3>
                <div className="prose-content mt-3 space-y-3 text-sm text-[var(--text-secondary)]">
                  <p>
                    Certified granola girl, and the reason we have campsite reservations almost every weekend. Growing up hiking, backpacking, and camping, she dreamed of a life that prioritized adventure rather than one that tried to make time for it. After college, she built out a van to help make those dreams a reality.
                  </p>
                  <p>
                    On the trail, she is the reason we have everything we need from fun facts about the local flora and fauna to the water Jevon left in the car. Off the trail, she&apos;s already planning our next trip.
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
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src="/images/hiking.webp" alt="Hiking" fill className="object-cover rotate-180" style={{ objectPosition: "130% center" }} />
              </div>
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src="/images/camping.webp" alt="Van / camping" fill className="object-cover" />
              </div>
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src="/images/travel.jpg" alt="Travel" fill className="object-cover" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { title: "Hiking & backpacking", body: "Day hikes, multi-day trips, the occasional Type 2 fun experience we probably should have trained harder for." },
                { title: "Van life & camping", body: "Dispatches from Blu (our van) and nights spent under the stars." },
                { title: "Travel", body: "Where we went, what we ate, and everything in between." },
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
