"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ensureGsapPlugins,
  gsap,
  prefersReducedMotion,
  useGSAP,
} from "@/lib/gsap-client";
import { fade } from "./shared";

ensureGsapPlugins();

const SCROLL_OFFSET = 112;
const PANEL_EASE = [0.16, 1, 0.3, 1] as const;
const DESKTOP_MQ = "(min-width: 1024px)";

export type AttioPlatformItem = {
  id: string;
  navLabel: string;
  headline: string;
  body: string;
  tags?: readonly string[];
  visual: ReactNode;
};

const panelShellVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction >= 0 ? 56 : -56,
    filter: "blur(10px)",
  }),
  center: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction >= 0 ? -40 : 40,
    filter: "blur(8px)",
  }),
};

const copyVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -32 : 32,
    clipPath: direction >= 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)",
  }),
  center: {
    opacity: 1,
    x: 0,
    clipPath: "inset(0 0 0 0)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 24 : -24,
    clipPath: direction >= 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)",
  }),
};

const visualVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    scale: 0.78,
    x: direction >= 0 ? 72 : -72,
    rotateY: direction >= 0 ? -14 : 14,
  }),
  center: {
    opacity: 1,
    scale: 1,
    x: 0,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    scale: 0.86,
    x: direction >= 0 ? -48 : 48,
    rotateY: direction >= 0 ? 10 : -10,
  }),
};

function SplitPanelContent({
  item,
  tagsLabel,
  panelFooter,
  reserveFooterSpace,
  direction,
  previewMode = "mockup",
}: {
  item: AttioPlatformItem;
  tagsLabel?: string;
  panelFooter?: ReactNode;
  reserveFooterSpace?: boolean;
  direction: number;
  previewMode?: "pass" | "mockup";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel || reducedMotion) return;

      const tagItems = panel.querySelectorAll<HTMLElement>("[data-panel-tag]");
      const footerButtons = panel.querySelectorAll<HTMLElement>(
        "[data-panel-footer] > *",
      );

      if (tagItems.length) {
        gsap.fromTo(
          tagItems,
          { opacity: 0, y: 18, scale: 0.88 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.45,
            stagger: 0.07,
            ease: "back.out(1.6)",
            delay: 0.42,
            overwrite: "auto",
          },
        );
      }

      if (footerButtons.length) {
        gsap.fromTo(
          footerButtons,
          { opacity: 0, y: 16, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            stagger: 0.08,
            ease: "back.out(1.4)",
            delay: 0.5,
            overwrite: "auto",
          },
        );
      }
    },
    { scope: panelRef, dependencies: [item.id], revertOnUpdate: true },
  );

  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.58, ease: PANEL_EASE };

  const childTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.62, ease: PANEL_EASE, delay: 0.06 };

  const visualTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.68, ease: PANEL_EASE, delay: 0.1 };

  return (
    <motion.div
      ref={panelRef}
      custom={direction}
      variants={reducedMotion ? undefined : panelShellVariants}
      initial={reducedMotion ? false : "enter"}
      animate="center"
      exit={reducedMotion ? undefined : "exit"}
      transition={transition}
      className={cn(
        "attio-platform-split-panel w-full",
        reserveFooterSpace && "attio-platform-split-panel--with-footer",
      )}
    >
      <div className="attio-platform-split-panel-main">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[7fr_3fr] lg:gap-10">
          <div className="min-w-0">
            <motion.p
              custom={direction}
              variants={reducedMotion ? undefined : copyVariants}
              initial={reducedMotion ? false : "enter"}
              animate="center"
              exit={reducedMotion ? undefined : "exit"}
              transition={childTransition}
              className="attio-platform-copy"
            >
              <strong>{item.headline}</strong> {item.body}
            </motion.p>

            {item.tags && item.tags.length > 0 && tagsLabel ? (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: 0.45, delay: 0.28, ease: PANEL_EASE }
                }
                className="mt-4"
              >
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/75">
                  {tagsLabel}
                </p>
                <ul className="attio-platform-tags">
                  {item.tags.map((tag) => (
                    <li key={tag} data-panel-tag className="attio-platform-tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </div>

          <motion.div
            custom={direction}
            variants={reducedMotion ? undefined : visualVariants}
            initial={reducedMotion ? false : "enter"}
            animate="center"
            exit={reducedMotion ? undefined : "exit"}
            transition={visualTransition}
            data-preview={previewMode}
            className="attio-platform-panel-visual flex justify-center lg:justify-end"
          >
            {item.visual}
          </motion.div>
        </div>
      </div>

      {panelFooter ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.45, delay: 0.38, ease: PANEL_EASE }
          }
          data-panel-footer
          className="attio-platform-panel-footer"
        >
          {panelFooter}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

export function AttioPlatformScroll({
  eyebrow,
  title,
  intro,
  items,
  navAriaLabel,
  tagsLabel,
  footer,
  panelFooter,
  className,
  variant = "stacked",
  hideHeader = false,
  previewMode = "mockup",
}: {
  eyebrow: string;
  title: string;
  intro: string;
  items: AttioPlatformItem[];
  navAriaLabel: string;
  tagsLabel?: string;
  footer?: ReactNode;
  panelFooter?: ReactNode;
  className?: string;
  variant?: "stacked" | "split-sticky";
  hideHeader?: boolean;
  /** Mobile preview sizing: wallet passes vs product mockups */
  previewMode?: "pass" | "mockup";
}) {
  const reactId = useId();
  const navHighlightLayoutId = `attio-nav-highlight${reactId.replace(/:/g, "")}`;
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const splitBodyRef = useRef<HTMLDivElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const prevActiveRef = useRef(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const sentinelRefs = useRef<(HTMLElement | null)[]>([]);
  const sentinelRatiosRef = useRef<Map<number, number>>(new Map());
  const isClickScrolling = useRef(false);
  const scrollEndTimer = useRef<number | null>(null);
  const isSplitSticky = variant === "split-sticky";

  const setActiveWithDirection = useCallback((next: number) => {
    const prev = prevActiveRef.current;
    if (prev === next) return;
    setDirection(next > prev ? 1 : -1);
    prevActiveRef.current = next;
    setActive(next);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useGSAP(
    () => {
      if (!isSplitSticky || prefersReducedMotion() || !isDesktop) return;

      const stage = stageRef.current;
      const header = headerRef.current;
      const splitBody = splitBodyRef.current;
      if (!stage || !splitBody) return;

      gsap.from(stage.querySelectorAll("[data-stage-intro]"), {
        opacity: 0,
        y: 40,
        clipPath: "inset(100% 0 0 0)",
        duration: 0.85,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: stage,
          start: "top 85%",
          once: true,
        },
      });

      const navItems = navListRef.current?.querySelectorAll("[data-nav-item]");
      if (navItems?.length) {
        gsap.from(navItems, {
          x: -20,
          duration: 0.5,
          stagger: 0.05,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: {
            trigger: stage,
            start: "top 80%",
            once: true,
          },
        });
      }

      if (header) {
        gsap.to(header, {
          y: -36,
          opacity: 0.45,
          ease: "none",
          scrollTrigger: {
            trigger: splitBody,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.85,
          },
        });
      }
    },
    { scope: sectionRef, dependencies: [isSplitSticky, items.length, isDesktop] },
  );

  const updateActiveFromScroll = useCallback(() => {
    if (isClickScrolling.current || isSplitSticky) return;

    const sections = sectionRefs.current.filter(
      (el): el is HTMLElement => el !== null,
    );
    if (!sections.length) return;

    const anchor = window.innerHeight * 0.42;
    let nextActive = 0;
    let closest = Number.POSITIVE_INFINITY;

    sections.forEach((section, i) => {
      const rect = section.getBoundingClientRect();
      const focus = rect.top + rect.height * 0.5;
      const distance = Math.abs(focus - anchor);
      if (distance < closest) {
        closest = distance;
        nextActive = i;
      }
    });

    setActive((prev) => {
      if (prev === nextActive) return prev;
      setDirection(nextActive > prev ? 1 : -1);
      prevActiveRef.current = nextActive;
      return nextActive;
    });
  }, [isSplitSticky]);

  const pickActiveFromSentinels = useCallback(() => {
    if (isClickScrolling.current) return;

    const ratios = sentinelRatiosRef.current;
    const sentinelCount = sentinelRefs.current.filter(Boolean).length;
    if (!sentinelCount) return;

    const lastIndex = sentinelCount - 1;
    const endRatio = ratios.get(-1) ?? 0;

    if (endRatio > 0.08) {
      setActiveWithDirection(lastIndex);
      return;
    }

    let bestIndex = 0;
    let bestRatio = 0;

    ratios.forEach((ratio, index) => {
      if (index < 0 || ratio <= bestRatio) return;
      bestRatio = ratio;
      bestIndex = index;
    });

    if (bestRatio > 0.08) {
      setActiveWithDirection(bestIndex);
    }
  }, [setActiveWithDirection]);

  useEffect(() => {
    if (!isSplitSticky) {
      updateActiveFromScroll();
      window.addEventListener("scroll", updateActiveFromScroll, { passive: true });
      window.addEventListener("resize", updateActiveFromScroll);

      return () => {
        window.removeEventListener("scroll", updateActiveFromScroll);
        window.removeEventListener("resize", updateActiveFromScroll);
      };
    }

    /* Sentinel scroll drives active index on all viewports */
    const sentinels = sentinelRefs.current.filter(
      (el): el is HTMLElement => el !== null,
    );
    const endSpacer = sentinels.at(-1)?.nextElementSibling ?? null;

    if (!sentinels.length) return;

    sentinelRatiosRef.current = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;

          if (el.classList.contains("attio-platform-scroll-end")) {
            sentinelRatiosRef.current.set(-1, entry.intersectionRatio);
            return;
          }

          const index = Number(el.dataset.index);
          if (!Number.isNaN(index)) {
            sentinelRatiosRef.current.set(index, entry.intersectionRatio);
          }
        });

        pickActiveFromSentinels();
      },
      {
        root: null,
        /* Slightly taller active band on mobile so progression feels earlier */
        rootMargin: isDesktop ? "-38% 0px -38% 0px" : "-28% 0px -42% 0px",
        threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
      },
    );

    sentinels.forEach((el) => observer.observe(el));
    if (endSpacer instanceof HTMLElement) {
      observer.observe(endSpacer);
    }

    pickActiveFromSentinels();

    return () => observer.disconnect();
  }, [
    isSplitSticky,
    isDesktop,
    items.length,
    pickActiveFromSentinels,
    updateActiveFromScroll,
  ]);

  useEffect(() => {
    return () => {
      if (scrollEndTimer.current) {
        window.clearTimeout(scrollEndTimer.current);
      }
    };
  }, []);

  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isDesktop || !isSplitSticky) return;
    const scroller = mobileNavRef.current;
    if (!scroller) return;
    const activePill = scroller.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    activePill?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active, isDesktop, isSplitSticky]);

  const scrollToSection = (index: number) => {
    const section = (isSplitSticky ? sentinelRefs : sectionRefs).current[index];
    if (!section) return;

    isClickScrolling.current = true;
    setActiveWithDirection(index);

    const offset = isDesktop ? SCROLL_OFFSET : 72;
    const top =
      section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });

    if (scrollEndTimer.current) {
      window.clearTimeout(scrollEndTimer.current);
    }
    scrollEndTimer.current = window.setTimeout(() => {
      isClickScrolling.current = false;
      if (isSplitSticky) {
        pickActiveFromSentinels();
      } else {
        updateActiveFromScroll();
      }
    }, 700);
  };

  const setSectionRef = (index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  };

  const setSentinelRef = (index: number) => (el: HTMLElement | null) => {
    sentinelRefs.current[index] = el;
  };

  const activeItem = items[active];
  const isLastItem = active === items.length - 1;
  const navCountStyle = {
    "--platform-nav-count": items.length,
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      className={cn("attio-platform-section", className)}
    >
      <div className="attio-platform-container mx-auto max-w-7xl px-5 sm:px-8">
        {isSplitSticky ? (
          <div
            ref={splitBodyRef}
            className="attio-platform-body attio-platform-body--split"
            style={navCountStyle}
          >
            <div ref={stageRef} className="attio-platform-sticky-stage">
              {!hideHeader ? (
                <header ref={headerRef} className="attio-platform-sticky-header">
                  <p data-stage-intro className="attio-platform-eyebrow">
                    {eyebrow}
                  </p>
                  <h2 data-stage-intro className="attio-platform-title">
                    {title}
                  </h2>
                  <p data-stage-intro className="attio-platform-intro">
                    {intro}
                  </p>
                </header>
              ) : (
                <header ref={headerRef} className="sr-only">
                  <h2>{title}</h2>
                </header>
              )}

              <div className="attio-platform-mobile-nav">
                <nav
                  ref={mobileNavRef}
                  className="attio-platform-mobile-nav-scroller"
                  aria-label={navAriaLabel}
                >
                  {items.map((item, i) => (
                    <button
                      key={`mobile-nav-${item.id}`}
                      type="button"
                      data-active={active === i}
                      className="attio-platform-mobile-nav-pill"
                      aria-current={active === i ? "true" : undefined}
                      onClick={() => scrollToSection(i)}
                    >
                      {item.navLabel}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="attio-platform-sticky-stage-body">
                <aside className="attio-platform-nav attio-platform-nav--in-stage">
                  <nav
                    className="attio-platform-nav-inner attio-platform-nav-inner--spread"
                    aria-label={navAriaLabel}
                  >
                    <ul ref={navListRef} className="attio-platform-nav-list">
                      {items.map((item, i) => (
                        <li key={item.id} className="attio-platform-nav-row">
                          {active === i ? (
                            <motion.span
                              layoutId={navHighlightLayoutId}
                              className="attio-platform-nav-highlight"
                              initial={false}
                              transition={{
                                type: "spring",
                                stiffness: 420,
                                damping: 34,
                              }}
                            />
                          ) : null}
                          <motion.button
                            type="button"
                            data-nav-item
                            data-active={active === i}
                            onClick={() => scrollToSection(i)}
                            className="attio-platform-nav-item"
                            aria-current={active === i ? "true" : undefined}
                            animate={{ x: active === i ? 4 : 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 380,
                              damping: 28,
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {item.navLabel}
                          </motion.button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </aside>

                <div className="attio-platform-split-viewport">
                  <AnimatePresence mode="wait" custom={direction}>
                    {activeItem ? (
                      <SplitPanelContent
                        key={activeItem.id}
                        item={activeItem}
                        direction={direction}
                        tagsLabel={tagsLabel}
                        previewMode={previewMode}
                        reserveFooterSpace={Boolean(panelFooter) && isDesktop}
                        panelFooter={
                          panelFooter && isLastItem && isDesktop
                            ? panelFooter
                            : undefined
                        }
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              {!isDesktop && isLastItem && panelFooter ? (
                <div className="attio-platform-mobile-footer">{panelFooter}</div>
              ) : null}
            </div>

            {items.map((item, i) => (
              <div
                key={`sentinel-${item.id}`}
                ref={setSentinelRef(i)}
                data-index={i}
                className="attio-platform-sentinel"
                aria-hidden
              />
            ))}
            <div className="attio-platform-scroll-end" aria-hidden />
          </div>
        ) : (
          <>
            {!hideHeader ? (
              <motion.header {...fade} className="attio-platform-header">
                <p className="attio-platform-eyebrow">{eyebrow}</p>
                <h2 className="attio-platform-title">{title}</h2>
                <p className="attio-platform-intro">{intro}</p>
              </motion.header>
            ) : null}

            <div className="attio-platform-body">
            <aside className="attio-platform-nav">
              <nav
                className="attio-platform-nav-inner"
                aria-label={navAriaLabel}
              >
                <ul className="space-y-4">
                  {items.map((item, i) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-active={active === i}
                        onClick={() => scrollToSection(i)}
                        className="attio-platform-nav-item"
                        aria-current={active === i ? "true" : undefined}
                      >
                        {item.navLabel}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <div className="attio-platform-content">
              {items.map((item, i) => {
                const isActive = active === i;
                return (
                  <article
                    key={item.id}
                    ref={setSectionRef(i)}
                    data-index={i}
                    className="attio-platform-panel"
                  >
                    <motion.div
                      animate={
                        isActive
                          ? { opacity: 1, y: 0 }
                          : { opacity: 0.42, y: 10 }
                      }
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <p className="attio-platform-copy">
                        <strong>{item.headline}</strong> {item.body}
                      </p>

                      {item.tags && item.tags.length > 0 && tagsLabel ? (
                        <div className="mt-4">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/75">
                            {tagsLabel}
                          </p>
                          <ul className="attio-platform-tags">
                            {item.tags.map((tag) => (
                              <li key={tag} className="attio-platform-tag">
                                {tag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <motion.div
                        className="attio-platform-mockup"
                        animate={
                          isActive
                            ? { opacity: 1, y: 0, scale: 1 }
                            : { opacity: 0.55, y: 12, scale: 0.985 }
                        }
                        transition={{
                          duration: 0.45,
                          ease: [0.16, 1, 0.3, 1],
                          delay: isActive ? 0.04 : 0,
                        }}
                      >
                        <div className="attio-platform-mockup-inner">
                          {item.visual}
                        </div>
                      </motion.div>
                    </motion.div>
                  </article>
                );
              })}
            </div>
            </div>
          </>
        )}

        {footer && !(isSplitSticky && panelFooter) ? (
          <div className="attio-platform-footer">{footer}</div>
        ) : null}
      </div>
    </section>
  );
}
