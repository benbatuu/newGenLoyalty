import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/ContactForm";
import { ContactHero } from "@/components/marketing/contact/ContactHero";
import { ContactSteps } from "@/components/marketing/contact/ContactSteps";
import { ContactFormPanel } from "@/components/marketing/contact/ContactFormPanel";
import { ContactInfo } from "@/components/marketing/contact/ContactInfo";
import { Eyebrow } from "@/components/marketing/contact/ContactParts";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contactPage" });
  return buildPageMetadata({
    locale,
    title: t("title"),
    description: t("intro"),
    pathname: "/contact",
  });
}

const COPY = {
  tr: {
    eyebrow: "İletişim",
    next: "Sonraki adımlar",
    steps: [
      { n: "01", title: "Talebiniz bize ulaşır", body: "Formu gönderdiğinizde ekibimize doğrudan iletilir." },
      { n: "02", title: "Aynı gün dönüş", body: "Kafenizin tezgâh akışına göre kısa bir görüşme planlarız." },
      { n: "03", title: "Pilot kurulum", body: "Marka, kural ve ilk kasiyer hesabını birlikte kurarız." },
    ],
    formEyebrow: "Mesaj",
    formTitle: "Bize yazın",
    privacy: "Bilgileriniz yalnızca yanıt vermek için kullanılır. KVKK kapsamında işlenir.",
    facts: [
      { label: "Konum", value: "Türkiye · İstanbul (merkez)" },
      { label: "Diller", value: "TR / EN" },
      { label: "Odak", value: "Bağımsız kafe ve butik tezgâh" },
      { label: "Yanıt", value: "Genelde aynı gün" },
    ],
    officeEyebrow: "Ofis",
  },
  en: {
    eyebrow: "Contact",
    next: "What happens next",
    steps: [
      { n: "01", title: "Your message reaches us", body: "Submitted messages go straight to our team." },
      { n: "02", title: "Same-day reply", body: "We plan a short call around your counter flow." },
      { n: "03", title: "Pilot setup", body: "We set up your brand, rules and first cashier account together." },
    ],
    formEyebrow: "Message",
    formTitle: "Write to us",
    privacy: "We only use your details to reply. Processed under Turkish data protection law (KVKK).",
    facts: [
      { label: "Location", value: "Turkey · Istanbul (HQ)" },
      { label: "Languages", value: "TR / EN" },
      { label: "Focus", value: "Independent cafés and boutique counters" },
      { label: "Response", value: "Usually the same day" },
    ],
    officeEyebrow: "Office",
  },
  ru: {
    eyebrow: "Контакты",
    next: "Что дальше",
    steps: [
      { n: "01", title: "Заявка попадает к нам", body: "Отправленное сообщение сразу уходит в команду." },
      { n: "02", title: "Ответ в тот же день", body: "Планируем короткий звонок по процессу вашей кассы." },
      { n: "03", title: "Пилотный запуск", body: "Вместе настраиваем бренд, правила и первый аккаунт кассира." },
    ],
    formEyebrow: "Сообщение",
    formTitle: "Напишите нам",
    privacy: "Данные используются только для ответа. Обработка по закону о защите данных Турции (KVKK).",
    facts: [
      { label: "Локация", value: "Турция · Стамбул (штаб-квартира)" },
      { label: "Языки", value: "TR / EN" },
      { label: "Фокус", value: "Независимые кафе и бутики" },
      { label: "Ответ", value: "Обычно в тот же день" },
    ],
    officeEyebrow: "Офис",
  },
} as const;

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contactPage");
  const c = COPY[(locale === "tr" || locale === "ru" ? locale : "en") as "tr" | "en" | "ru"];

  return (
    <main className="page-enter">
      <ContactHero
        eyebrow={c.eyebrow}
        title={t("title")}
        intro={t("intro")}
        aside={null}
      />

      <section className="mx-auto grid max-w-7xl items-start gap-12 px-5 pb-24 sm:px-8 sm:pb-32 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="space-y-14">
          <ContactSteps eyebrow={c.next} steps={c.steps.map((s) => ({ ...s }))} />
          <ContactInfo
            eyebrow={c.officeEyebrow}
            title={t("asideTitle")}
            body={t("asideBody")}
            facts={c.facts.map((f) => ({ ...f }))}
          />
        </div>

        <ContactFormPanel>
          <Eyebrow>{c.formEyebrow}</Eyebrow>
          <h2 className="mt-5 font-display text-3xl tracking-[-0.03em] text-[#DFE5EB] sm:text-4xl">
            {c.formTitle}
          </h2>
          <div className="mt-8">
            <ContactForm compact showMessage />
          </div>
          <p className="mt-8 border-t border-white/[0.08] pt-6 text-xs leading-relaxed text-[#DFE5EB]/50">
            {c.privacy}
          </p>
        </ContactFormPanel>
      </section>
    </main>
  );
}
