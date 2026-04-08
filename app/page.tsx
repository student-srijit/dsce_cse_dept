import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Globe2,
  Mic2,
  Orbit,
  Satellite,
  ShieldCheck,
} from "lucide-react";
import { Space_Grotesk, Fraunces } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });
const fraunces = Fraunces({ subsets: ["latin"] });

const signals = [
  {
    icon: Orbit,
    title: "Social Trust GNN",
    detail:
      "Village transaction graph + SHG links scored with message passing.",
  },
  {
    icon: Mic2,
    title: "Voice Psychometrics",
    detail: "Regional language interview mapped to OCEAN personality traits.",
  },
  {
    icon: Satellite,
    title: "Satellite Crop Health",
    detail:
      "NDVI-based crop vitality and fraud anomaly checks from remote sensing.",
  },
  {
    icon: Cpu,
    title: "Behavior Signal",
    detail:
      "UPI and recharge regularity patterns as informal repayment discipline.",
  },
];

const phases = [
  {
    phase: "Phase 1",
    title: "Data + Trust Graph",
    detail:
      "Model village entities, SHG links, and transaction metadata with reproducible mock generators.",
  },
  {
    phase: "Phase 2",
    title: "GNN + Signal Engines",
    detail:
      "Run social message passing, voice trait extraction, crop NDVI scoring, and behavior analytics in parallel.",
  },
  {
    phase: "Phase 3",
    title: "Fusion + Explainability",
    detail:
      "Fuse all signals into GramScore and return multilingual, human-readable loan reasons.",
  },
  {
    phase: "Phase 4",
    title: "87-Second Demo",
    detail:
      "Profile -> voice recording -> instant decision with repayment schedule and clear attribution cards.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#dcfce7_0%,#fef3c7_35%,#fff7ed_68%,#f0fdfa_100%)] text-zinc-900">
      <div className="pointer-events-none absolute -left-16 top-20 h-52 w-52 rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:pb-24 md:pt-14">
        <header className="mb-14 flex items-center justify-between rounded-2xl border border-zinc-900/10 bg-white/60 px-5 py-4 backdrop-blur">
          <p
            className={`${spaceGrotesk.className} text-xl font-bold tracking-tight`}
          >
            GramCredit
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/try"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Try Live Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-emerald-700/30 bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">
              AI Hackathon 2026
            </p>
            <h1
              className={`${fraunces.className} text-balance text-4xl leading-tight md:text-6xl`}
            >
              Emergency rural credit in under 2 minutes, powered by trust graphs
              and AI signals.
            </h1>
            <p className="max-w-xl text-pretty text-base text-zinc-700 md:text-lg">
              GramCredit converts invisible village trust into measurable
              creditworthiness using a social GNN, voice psychometrics,
              satellite crop intelligence, and behavior analytics.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/try"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Start The Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="text-sm text-zinc-700">
                Target decision time: 87 seconds
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-900/10 bg-white/70 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-700">
              Why It Matters
            </h2>
            <ul className="space-y-4 text-sm text-zinc-700">
              <li className="rounded-xl border border-red-200 bg-red-50 p-4">
                Rural borrowers often choose between KCC misuse and predatory
                moneylenders.
              </li>
              <li className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                GramCredit creates a fair score for people with zero CIBIL
                history.
              </li>
              <li className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                All decisions are explainable in local language, not black-box
                approvals.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:pb-24">
        <div className="mb-8 flex items-center gap-2 text-zinc-800">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="text-xl font-semibold">
            Four-Signal Credit Intelligence
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <article
                key={signal.title}
                className="rounded-2xl border border-zinc-900/10 bg-white/75 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="mb-3 inline-flex rounded-lg bg-zinc-900 p-2 text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-lg font-semibold">{signal.title}</h4>
                <p className="mt-2 text-sm text-zinc-700">{signal.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:pb-24">
        <div className="mb-8 flex items-center gap-2 text-zinc-800">
          <Globe2 className="h-5 w-5" />
          <h3 className="text-xl font-semibold">Hackathon Build Plan</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {phases.map((phase) => (
            <article
              key={phase.phase}
              className="rounded-2xl border border-zinc-900/10 bg-white/80 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {phase.phase}
              </p>
              <h4 className="mt-2 text-lg font-semibold">{phase.title}</h4>
              <p className="mt-2 text-sm text-zinc-700">{phase.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
