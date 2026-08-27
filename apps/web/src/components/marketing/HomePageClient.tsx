"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AuroraField } from "@/components/marketing/AuroraField";
import { Marquee } from "@/components/marketing/Marquee";
import { SplitWords, TextReveal } from "@/components/marketing/TextReveal";
import { DemoButton } from "@/components/marketing/DemoModal";
import { Check } from "lucide-react";

const WalletScene = dynamic(
  () =>
    import("@/components/marketing/WalletScene").then((m) => m.WalletScene),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[var(--bg-deep)]" />,
  },
);

const fade = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-12% 0px" },
  transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const },
};

function CtaLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative z-10 inline-flex items-center gap-2.5">
      {children}
      <span className="btn-arrow" aria-hidden>
        →
      </span>
    </span>
  );
}

export function HomePageClient() {
  const t = useTranslations("home");
  const s = useTranslations("sections");
  const how = useTranslations("howPage");
  const features = useTranslations("featuresPage");
  const pricing = useTranslations("pricingPage");
  const sectors = useTranslations("sectorsPage");
  const useCases = useTranslations("useCasesPage");
  const faq = useTranslations("faq");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const proof = s.raw("proofItems") as {
    stat: string;
    label: string;
    hint: string;
  }[];
  const productPoints = s.raw("productPoints") as string[];
  const steps = how.raw("steps") as { n: string; title: string; body: string }[];
  const featureItems = features.raw("items") as { title: string; body: string }[];
  const plans = pricing.raw("plans") as {
    id: string;
    name: string;
    price: string;
    period: string;
    badge: string;
    note: string;
    includes: string[];
    cta: string;
  }[];
  const sectorItems = sectors.raw("items") as {
    title: string;
    body: string;
    image: string;
  }[];
  const usecaseItems = useCases.raw("items") as { title: string; body: string }[];
  const faqItems = faq.raw("items") as { q: string; a: string }[];

  const marqueeItems = [
    "Apple Wallet",
    "Google Wallet",
    "SMS invite",
    "No app install",
    "Stamp · Reward",
    "KVKK-ready",
    "Türkiye",
    "Café-first",
  ];

  return (
    <>
      <section
        ref={heroRef}
        className="relative min-h-[100svh] overflow-hidden bg-[var(--bg-deep)]"
      >
        <AuroraField />
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <Image
            src="/marketing/hero-aurora.png"
            alt={t("heroAlt")}
            fill
            priority
            className="object-cover opacity-50 mix-blend-screen animate-ken"
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/40 to-transparent" />

        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-16 pt-36 sm:px-8 sm:pb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge>Wallet loyalty · TR</Badge>
          </motion.div>

          <h1 className="mt-8 font-display text-[clamp(3.6rem,11vw,7.5rem)] font-light leading-[0.88] tracking-[-0.045em] text-white">
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
              >
                Dokun
              </motion.span>
            </span>
            <span className="mt-1 block overflow-hidden italic text-[var(--brass)]">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{
                  delay: 0.12,
                  duration: 1.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                &amp; Kazan
              </motion.span>
            </span>
          </h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.45, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 h-px w-28 origin-left bg-gradient-to-r from-[var(--brass)] to-transparent"
          />

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 1 }}
            className="mt-8 max-w-xl font-display text-[clamp(1.35rem,3vw,1.95rem)] font-normal italic leading-snug text-white/85"
          >
            {t("headline")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48, duration: 1 }}
            className="mt-5 max-w-md text-[1.02rem] font-light leading-relaxed text-[var(--muted-on-dark)]"
          >
            {t("sub")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <DemoButton size="lg" variant="light">
              <CtaLabel>{t("ctaPrimary")}</CtaLabel>
            </DemoButton>
            <Button asChild size="lg" variant="ghost-light">
              <Link href="/how">
                <CtaLabel>{t("ctaSecondary")}</CtaLabel>
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 1 }}
            className="mt-16 flex items-center gap-3"
          >
            <span className="h-8 w-px bg-gradient-to-b from-[var(--brass)] to-transparent" />
            <p className="section-label text-white/35">{t("scrollHint")}</p>
          </motion.div>
        </motion.div>
      </section>

      <Marquee items={marqueeItems} speed={32} />

      <section className="relative overflow-hidden py-24 sm:py-32">
        <AuroraField className="opacity-40" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <TextReveal className="section-label">Signal</TextReveal>
          <h2 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.8rem)] font-light tracking-[-0.035em]">
            <SplitWords text={s("proofTitle")} />
          </h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {proof.map((item, i) => (
              <motion.div
                key={item.label}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.08 }}
                className="glow-frame p-7 sm:p-8"
              >
                <p className="stat-number font-display text-[3rem] font-light leading-none sm:text-[3.4rem]">
                  {item.stat}
                </p>
                <p className="mt-6 font-display text-xl font-medium tracking-tight">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-light leading-relaxed text-[var(--muted)]">
                  {item.hint}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
          <motion.div {...fade}>
            <Badge>Product</Badge>
            <h2 className="mt-5 font-display text-[clamp(2.3rem,4.8vw,3.8rem)] font-light leading-[1.02] tracking-[-0.035em]">
              <SplitWords text={s("productTitle")} />
            </h2>
            <p className="mt-6 text-[1.08rem] font-light leading-[1.8] text-[var(--muted)]">
              {s("productBody")}
            </p>
            <ul className="mt-9 space-y-4">
              {productPoints.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[0.95rem]">
                  <Check
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--brass)]"
                    strokeWidth={1.5}
                  />
                  <span className="font-light leading-relaxed text-[var(--ink-soft)]">
                    {p}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-10" variant="secondary">
              <Link href="/features">
                <CtaLabel>{features("title")}</CtaLabel>
              </Link>
            </Button>
          </motion.div>
          <motion.div
            {...fade}
            className="glow-frame relative h-[400px] sm:h-[480px]"
          >
            <AuroraField className="opacity-60" />
            <WalletScene className="absolute inset-0 z-10" />
          </motion.div>
        </div>
      </section>

      <section className="relative border-y border-[var(--line)] bg-[var(--bg-elevated)] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <motion.div {...fade} className="max-w-2xl">
            <p className="section-label">Protocol</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,4.8vw,3.6rem)] font-light tracking-[-0.035em]">
              <SplitWords text={s("howTitle")} />
            </h2>
            <p className="mt-5 font-light leading-relaxed text-[var(--muted)]">
              {s("howIntro")}
            </p>
          </motion.div>
          <div className="mt-16 grid gap-5 md:grid-cols-2">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                {...fade}
                transition={{ ...fade.transition, delay: i * 0.06 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <p className="font-display text-[2.8rem] font-light text-[var(--brass)]">
                      {step.n}
                    </p>
                    <CardTitle className="mt-2">{step.title}</CardTitle>
                    <CardDescription>{step.body}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="mt-12">
            <Button asChild variant="outline">
              <Link href="/how">
                <CtaLabel>{how("title")}</CtaLabel>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <motion.div {...fade} className="max-w-2xl">
            <p className="section-label">Systems</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,4.8vw,3.6rem)] font-light tracking-[-0.035em]">
              <SplitWords text={s("featuresTitle")} />
            </h2>
            <p className="mt-5 font-light leading-relaxed text-[var(--muted)]">
              {s("featuresIntro")}
            </p>
          </motion.div>
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((item, i) => (
              <motion.div
                key={item.title}
                {...fade}
                transition={{ ...fade.transition, delay: (i % 3) * 0.05 }}
                className="group relative overflow-hidden border border-[var(--line)] bg-[var(--panel-solid)] p-8 transition duration-500 hover:border-[var(--brass)]/40 sm:p-9"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--brass)]/0 blur-3xl transition duration-700 group-hover:bg-[var(--brass)]/15" />
                <p className="section-label text-[var(--muted)]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-5 font-display text-[1.45rem] font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-[0.95rem] font-light leading-[1.7] text-[var(--muted)]">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--bg-elevated)] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <motion.div
            {...fade}
            className="flex flex-wrap items-end justify-between gap-6"
          >
            <div className="max-w-xl">
              <p className="section-label">Sectors</p>
              <h2 className="mt-4 font-display text-[clamp(2.2rem,4.8vw,3.6rem)] font-light tracking-[-0.035em]">
                <SplitWords text={s("sectorsTitle")} />
              </h2>
              <p className="mt-5 font-light leading-relaxed text-[var(--muted)]">
                {s("sectorsIntro")}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/sectors">
                <CtaLabel>{sectors("title")}</CtaLabel>
              </Link>
            </Button>
          </motion.div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {sectorItems.slice(0, 4).map((item) => (
              <motion.div key={item.title} {...fade}>
                <Card className="group overflow-hidden p-0">
                  <div className="relative h-60 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover opacity-80 transition duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] group-hover:opacity-100"
                      sizes="(max-width:768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elevated)] via-transparent to-transparent" />
                  </div>
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.body}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 sm:py-32">
        <AuroraField className="opacity-30" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <motion.div {...fade} className="max-w-2xl">
            <p className="section-label">Plans</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,4.8vw,3.6rem)] font-light tracking-[-0.035em]">
              <SplitWords text={s("plansTitle")} />
            </h2>
            <p className="mt-5 font-light leading-relaxed text-[var(--muted)]">
              {s("plansIntro")}
            </p>
          </motion.div>
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <motion.div key={plan.id} {...fade}>
                <Card
                  className={
                    plan.id === "cafe"
                      ? "h-full !border-[var(--brass)]/40 shadow-[0_0_60px_-30px_var(--glow)]"
                      : "h-full"
                  }
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{plan.name}</CardTitle>
                      <Badge variant={plan.id === "cafe" ? "brass" : "outline"}>
                        {plan.badge}
                      </Badge>
                    </div>
                    <p className="stat-number mt-6 font-display text-[3.6rem] font-light leading-none tracking-[-0.03em]">
                      {plan.price}
                      <span className="ml-3 align-middle font-sans text-sm font-light tracking-normal text-[var(--muted)]">
                        {plan.period}
                      </span>
                    </p>
                    <CardDescription>{plan.note}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.includes.map((line) => (
                        <li key={line} className="flex gap-3 text-sm font-light">
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brass)]"
                            strokeWidth={1.5}
                          />
                          {line}
                        </li>
                      ))}
                    </ul>
                    <DemoButton className="mt-10 w-full">
                      <CtaLabel>{plan.cta}</CtaLabel>
                    </DemoButton>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--bg-elevated)] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <motion.div {...fade} className="max-w-2xl">
            <p className="section-label">Narratives</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,4.8vw,3.6rem)] font-light tracking-[-0.035em]">
              <SplitWords text={s("usecaseTitle")} />
            </h2>
            <p className="mt-5 font-light leading-relaxed text-[var(--muted)]">
              {s("usecaseIntro")}
            </p>
          </motion.div>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {usecaseItems.map((item, i) => (
              <motion.div key={item.title} {...fade}>
                <Card className="h-full">
                  <CardHeader>
                    <p className="section-label">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <CardTitle className="mt-3">{item.title}</CardTitle>
                    <CardDescription>{item.body}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="mt-12">
            <Button asChild variant="outline">
              <Link href="/use-cases">
                <CtaLabel>{useCases("title")}</CtaLabel>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <p className="section-label">FAQ</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] font-light tracking-[-0.03em]">
            <SplitWords text={s("faqTitle")} />
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {faqItems.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="relative overflow-hidden py-32 sm:py-40">
        <AuroraField />
        <Image
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=2000&q=80"
          alt=""
          fill
          className="object-cover opacity-25 mix-blend-luminosity"
          sizes="100vw"
        />
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.2rem)] font-light tracking-[-0.035em] text-white">
            <SplitWords text={s("ctaBandTitle")} />
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-[1.08rem] font-light leading-relaxed text-[var(--muted-on-dark)]">
            {s("ctaBandBody")}
          </p>
          <DemoButton size="lg" variant="light" className="mt-12">
            <CtaLabel>{s("ctaBandButton")}</CtaLabel>
          </DemoButton>
        </div>
      </section>
    </>
  );
}
