"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ErrorBanner,
  Field,
  FormSkeleton,
  PageHeader,
  Panel,
  PanelHeader,
  RequireAuth,
  SoftBox,
  SuccessBanner,
  btnGhost,
  btnPrimary,
  inputClassName,
} from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { bustCache, useApiQuery } from "../../lib/use-api-query";

type InvitePolicy = { title: string; body: string };

type TenantProfile = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoText: string | null;
  primaryColor: string | null;
  foregroundColor: string | null;
  passPhone: string | null;
  passHours: string | null;
  passLocations: string | null;
  passWebsiteUrl: string | null;
  passDescription: string | null;
  passPhoneLabel: string | null;
  passHoursLabel: string | null;
  passLocationsLabel: string | null;
  passWebsiteLabel: string | null;
  passDescriptionLabel: string | null;
  collectCustomerName: boolean;
  collectCustomerBirthday: boolean;
  birthdayGiftEnabled: boolean;
  birthdayMessage: string | null;
  inviteHeadline: string | null;
  inviteSubtitle: string | null;
  inviteCtaHint: string | null;
  inviteBgColor: string | null;
  inviteCardColor: string | null;
  inviteStatusText: string | null;
  inviteAppleBtnLabel: string | null;
  inviteGoogleBtnLabel: string | null;
  inviteFormTitle: string | null;
  inviteLegalText: string | null;
  invitePolicies: InvitePolicy[] | null;
  rewardRule?: { stampsRequired: number; rewardLabel: string } | null;
};

const DEFAULT_LEGAL =
  "KVKK: Bu sayfa sadakat kartı ekleme davetidir. Girdiğiniz bilgiler yalnızca bu kafe sadakat programı içindir.\nDamga sonrası Wallet güncellemesi için kartı buradan eklemiş olmanız gerekir.";

function parsePolicies(raw: unknown): InvitePolicy[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({
      title: String((p as InvitePolicy)?.title ?? "").trim(),
      body: String((p as InvitePolicy)?.body ?? "").trim(),
    }))
    .filter((p) => p.title && p.body)
    .slice(0, 8);
}

export default function BusinessPage() {
  return (
    <RequireAuth roles={["STORE_OWNER"]}>
      <BusinessContent />
    </RequireAuth>
  );
}

function BusinessContent() {
  const { data, error: loadError, loading, reload } = useApiQuery<TenantProfile>(
    "settings:me",
    "/tenants/me",
    { ttlMs: 60_000 },
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [locations, setLocations] = useState("");
  const [website, setWebsite] = useState("");
  const [about, setAbout] = useState("");
  const [collectName, setCollectName] = useState(false);
  const [collectBirthday, setCollectBirthday] = useState(false);
  const [birthdayGift, setBirthdayGift] = useState(false);
  const [birthdayMessage, setBirthdayMessage] = useState(
    "İyi ki doğdun {name}! Bugün hediye kahven bizden.",
  );
  const [inviteHeadline, setInviteHeadline] = useState("");
  const [inviteSubtitle, setInviteSubtitle] = useState("");
  const [inviteCtaHint, setInviteCtaHint] = useState("");
  const [inviteBgColor, setInviteBgColor] = useState("");
  const [inviteCardColor, setInviteCardColor] = useState("");
  const [inviteStatusText, setInviteStatusText] = useState("");
  const [inviteAppleBtn, setInviteAppleBtn] = useState("");
  const [inviteGoogleBtn, setInviteGoogleBtn] = useState("");
  const [inviteFormTitle, setInviteFormTitle] = useState("");
  const [inviteLegalText, setInviteLegalText] = useState("");
  const [policies, setPolicies] = useState<InvitePolicy[]>([]);
  const [policyDraft, setPolicyDraft] = useState<InvitePolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [section, setSection] = useState<"biz" | "invite" | "bday">("invite");

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setPhone(data.passPhone ?? "");
    setHours(data.passHours ?? "");
    setLocations(data.passLocations ?? "");
    setWebsite(data.passWebsiteUrl ?? "");
    setAbout(data.passDescription ?? "");
    setCollectName(data.collectCustomerName ?? false);
    setCollectBirthday(data.collectCustomerBirthday ?? false);
    setBirthdayGift(data.birthdayGiftEnabled ?? false);
    setBirthdayMessage(
      data.birthdayMessage ??
        "İyi ki doğdun {name}! Bugün hediye kahven bizden.",
    );
    setInviteHeadline(data.inviteHeadline ?? "");
    setInviteSubtitle(data.inviteSubtitle ?? "");
    setInviteCtaHint(data.inviteCtaHint ?? "");
    setInviteBgColor(data.inviteBgColor ?? "");
    setInviteCardColor(data.inviteCardColor ?? "");
    setInviteStatusText(data.inviteStatusText ?? "");
    setInviteAppleBtn(data.inviteAppleBtnLabel ?? "");
    setInviteGoogleBtn(data.inviteGoogleBtnLabel ?? "");
    setInviteFormTitle(data.inviteFormTitle ?? "");
    setInviteLegalText(data.inviteLegalText ?? "");
    setPolicies(parsePolicies(data.invitePolicies));
  }, [data]);

  const brandColor = data?.primaryColor || "#1B4332";
  const fg = data?.foregroundColor || "#FFFFFF";
  const pageBg = inviteBgColor.trim() || "#0f1412";
  const cardBg = inviteCardColor.trim() || brandColor;
  const stampsReq = data?.rewardRule?.stampsRequired ?? 10;
  const rewardLabel = data?.rewardRule?.rewardLabel || "Ödül";

  const display = useMemo(
    () => ({
      title: inviteHeadline.trim() || data?.logoText || name || "Kafe adı",
      sub:
        inviteSubtitle.trim() || `Dijital damga kartı · ${rewardLabel}`,
      status:
        inviteStatusText.trim() || "Damgalarını tamamla, ödülünü kap.",
      cta:
        inviteCtaHint.trim() ||
        "Kartını Wallet’a ekle — uygulama indirmene gerek yok.",
      apple: inviteAppleBtn.trim() || "Apple Wallet’a Ekle",
      google: inviteGoogleBtn.trim() || "Google Wallet’a Ekle",
      formTitle: inviteFormTitle.trim() || "Kartını eklemeden önce",
      legal: inviteLegalText.trim() || DEFAULT_LEGAL,
    }),
    [
      inviteHeadline,
      inviteSubtitle,
      inviteStatusText,
      inviteCtaHint,
      inviteAppleBtn,
      inviteGoogleBtn,
      inviteFormTitle,
      inviteLegalText,
      data?.logoText,
      name,
      rewardLabel,
    ],
  );

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api("/tenants/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          passPhone: phone.trim() || null,
          passHours: hours.trim() || null,
          passLocations: locations.trim() || null,
          passWebsiteUrl: website.trim() || null,
          passDescription: about.trim() || null,
          passPhoneLabel: data?.passPhoneLabel || "Telefon",
          passHoursLabel: data?.passHoursLabel || "Çalışma saatleri",
          passLocationsLabel: data?.passLocationsLabel || "Adres",
          passWebsiteLabel: data?.passWebsiteLabel || "Web",
          passDescriptionLabel: data?.passDescriptionLabel || "Hakkında",
          collectCustomerName: collectName,
          collectCustomerBirthday: collectBirthday,
          birthdayGiftEnabled: birthdayGift && collectBirthday,
          birthdayMessage: birthdayMessage.trim() || null,
          inviteHeadline: inviteHeadline.trim() || null,
          inviteSubtitle: inviteSubtitle.trim() || null,
          inviteCtaHint: inviteCtaHint.trim() || null,
          inviteBgColor: inviteBgColor.trim() || null,
          inviteCardColor: inviteCardColor.trim() || null,
          inviteStatusText: inviteStatusText.trim() || null,
          inviteAppleBtnLabel: inviteAppleBtn.trim() || null,
          inviteGoogleBtnLabel: inviteGoogleBtn.trim() || null,
          inviteFormTitle: inviteFormTitle.trim() || null,
          inviteLegalText: inviteLegalText.trim() || null,
          invitePolicies: policies,
        }),
      });
      setOk("Kaydedildi");
      bustCache("settings");
      bustCache("metrics");
      await reload(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function saveInviteFields() {
    await api("/tenants/me", {
      method: "PATCH",
      body: JSON.stringify({
        collectCustomerName: collectName,
        collectCustomerBirthday: collectBirthday,
        birthdayGiftEnabled: birthdayGift && collectBirthday,
        birthdayMessage: birthdayMessage.trim() || null,
        inviteHeadline: inviteHeadline.trim() || null,
        inviteSubtitle: inviteSubtitle.trim() || null,
        inviteCtaHint: inviteCtaHint.trim() || null,
        inviteBgColor: inviteBgColor.trim() || null,
        inviteCardColor: inviteCardColor.trim() || null,
        inviteStatusText: inviteStatusText.trim() || null,
        inviteAppleBtnLabel: inviteAppleBtn.trim() || null,
        inviteGoogleBtnLabel: inviteGoogleBtn.trim() || null,
        inviteFormTitle: inviteFormTitle.trim() || null,
        inviteLegalText: inviteLegalText.trim() || null,
        invitePolicies: policies,
      }),
    });
    bustCache("settings");
  }

  async function openRealPreview() {
    setPreviewBusy(true);
    setError(null);
    setPreviewUrl(null);

    // Popup engelini aşmak için sekme kullanıcı tıklamasında hemen açılmalı
    const tab = window.open("about:blank", "_blank");

    try {
      await saveInviteFields();
      const res = await api<{ url: string }>(
        "/tenants/me/invite-preview-link",
        { method: "POST" },
      );
      setPreviewUrl(res.url);
      setOk("Önizleme hazır");
      if (tab && !tab.closed) {
        tab.location.href = res.url;
      } else {
        setError(
          "Tarayıcı yeni sekmeyi engelledi — aşağıdaki linke tıkla.",
        );
      }
    } catch (err) {
      if (tab && !tab.closed) tab.close();
      setError(
        err instanceof ApiError
          ? err.message
          : "Önizleme açılamadı — kaydı kontrol edip tekrar dene",
      );
    } finally {
      setPreviewBusy(false);
    }
  }

  function addOrUpdatePolicy() {
    if (!policyDraft) return;
    const title = policyDraft.title.trim();
    const body = policyDraft.body.trim();
    if (!title || !body) return;
    const idx = policies.findIndex(
      (p) => p.title.toLowerCase() === title.toLowerCase(),
    );
    if (idx >= 0) {
      const next = [...policies];
      next[idx] = { title, body };
      setPolicies(next);
    } else if (policies.length < 8) {
      setPolicies([...policies, { title, body }]);
    }
    setPolicyDraft(null);
  }

  if (loading && !data) {
    return <FormSkeleton rows={5} />;
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        eyebrow="Sadakat"
        title="Davet sayfası"
        subtitle="Davet sayfasını canlı düzenle, politikalarını ekle, gerçek linkle kontrol et."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnGhost()}
              disabled={previewBusy || saving}
              onClick={() => void openRealPreview()}
            >
              {previewBusy ? "Açılıyor…" : "Gerçek önizlemeyi aç"}
            </button>
            <button
              type="button"
              className={btnPrimary()}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        }
      />
      <ErrorBanner message={error || loadError} />
      <SuccessBanner message={ok} />
      {previewUrl ? (
        <SoftBox>
          <p className="text-sm text-[var(--muted)]">
            Önizleme linki:{" "}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-medium text-[var(--accent)] underline"
            >
              {previewUrl}
            </a>
          </p>
        </SoftBox>
      ) : null}

      <SoftBox>
        <p className="text-sm text-[var(--muted)]">
          Slug:{" "}
          <span className="font-medium text-[var(--ink)]">/{data?.slug}</span>
          {" · "}
          Logo &amp; kart renkleri{" "}
          <a
            href="/settings?tab=brand"
            className="text-[var(--accent)] underline"
          >
            Ayarlar → Marka
          </a>
          . Davet kart rengi buradan override edilebilir.
        </p>
      </SoftBox>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["invite", "Davet sayfası"],
            ["biz", "İletişim"],
            ["bday", "Doğum günü"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              section === id
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--muted)] hover:bg-[var(--surface)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "invite" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <Panel>
              <PanelHeader
                title="Müşteriden alınacak bilgiler"
                description="Açık alanlar Wallet eklemeden önce sorulur."
              />
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={collectName}
                    onChange={(e) => setCollectName(e.target.checked)}
                  />
                  <span className="font-medium text-[var(--ink)]">İsim</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={collectBirthday}
                    onChange={(e) => {
                      setCollectBirthday(e.target.checked);
                      if (!e.target.checked) setBirthdayGift(false);
                    }}
                  />
                  <span className="font-medium text-[var(--ink)]">
                    Doğum günü (ay / gün)
                  </span>
                </label>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                title="Politikalar (KVKK, Gizlilik…)"
                description="Davet sayfasında açılır bölüm olarak görünür. En fazla 8."
              />
              <ul className="mb-4 space-y-2">
                {policies.map((p) => (
                  <li
                    key={p.title}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--ink)]">{p.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                        {p.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--accent)]"
                        onClick={() => setPolicyDraft(p)}
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--danger)]"
                        onClick={() =>
                          setPolicies(policies.filter((x) => x.title !== p.title))
                        }
                      >
                        Sil
                      </button>
                    </div>
                  </li>
                ))}
                {policies.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    Henüz politika yok. KVKK veya gizlilik metnini ekle.
                  </p>
                ) : null}
              </ul>
              {policyDraft ? (
                <div className="space-y-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 p-4">
                  <Field label="Başlık">
                    <input
                      className={inputClassName()}
                      value={policyDraft.title}
                      onChange={(e) =>
                        setPolicyDraft({ ...policyDraft, title: e.target.value })
                      }
                      maxLength={80}
                      placeholder="KVKK Aydınlatma Metni"
                    />
                  </Field>
                  <Field label="Metin">
                    <textarea
                      className={inputClassName() + " min-h-36"}
                      value={policyDraft.body}
                      onChange={(e) =>
                        setPolicyDraft({ ...policyDraft, body: e.target.value })
                      }
                      maxLength={12000}
                      placeholder="Politika metnini yazın…"
                    />
                  </Field>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnPrimary()}
                      onClick={addOrUpdatePolicy}
                    >
                      Politikayı kaydet
                    </button>
                    <button
                      type="button"
                      className={btnGhost()}
                      onClick={() => setPolicyDraft(null)}
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={btnGhost()}
                  disabled={policies.length >= 8}
                  onClick={() =>
                    setPolicyDraft({
                      title: "",
                      body: "",
                    })
                  }
                >
                  + Politika ekle
                </button>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Buton etiketleri & form"
                description="Boş bırakırsan varsayılan Türkçe metin kullanılır."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Apple butonu">
                  <input
                    className={inputClassName()}
                    value={inviteAppleBtn}
                    onChange={(e) => setInviteAppleBtn(e.target.value)}
                    maxLength={40}
                    placeholder="Apple Wallet’a Ekle"
                  />
                </Field>
                <Field label="Google butonu">
                  <input
                    className={inputClassName()}
                    value={inviteGoogleBtn}
                    onChange={(e) => setInviteGoogleBtn(e.target.value)}
                    maxLength={40}
                    placeholder="Google Wallet’a Ekle"
                  />
                </Field>
                <Field label="Form başlığı">
                  <input
                    className={inputClassName()}
                    value={inviteFormTitle}
                    onChange={(e) => setInviteFormTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Kartını eklemeden önce"
                  />
                </Field>
              </div>
            </Panel>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <Panel>
              <PanelHeader
                title="Canlı düzenle"
                description="Metinlere tıkla ve yaz. Renkleri üstten değiştir."
              />
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  Sayfa
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded border border-[var(--line)] bg-white p-0.5"
                    value={inviteBgColor.trim() || "#0f1412"}
                    onChange={(e) => setInviteBgColor(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  Kart
                  <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded border border-[var(--line)] bg-white p-0.5"
                    value={inviteCardColor.trim() || brandColor}
                    onChange={(e) => setInviteCardColor(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--accent)]"
                  onClick={() => {
                    setInviteBgColor("");
                    setInviteCardColor("");
                  }}
                >
                  Renkleri sıfırla
                </button>
              </div>

              <div
                className="overflow-hidden rounded-2xl p-4"
                style={{ background: pageBg }}
              >
                <div
                  className="rounded-[18px] p-5 shadow-lg"
                  style={{ background: cardBg, color: fg }}
                >
                  {data?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.logoUrl}
                      alt=""
                      className="mb-3 max-h-10 max-w-[140px] object-contain"
                    />
                  ) : null}
                  <EditableLine
                    className="text-lg font-semibold leading-tight tracking-tight outline-none ring-[var(--accent)] focus:ring-2"
                    value={inviteHeadline}
                    display={display.title}
                    onChange={setInviteHeadline}
                    placeholder="Başlık"
                  />
                  <EditableLine
                    className="mt-1 text-sm opacity-90 outline-none ring-[var(--accent)] focus:ring-2"
                    value={inviteSubtitle}
                    display={display.sub}
                    onChange={setInviteSubtitle}
                    placeholder="Alt yazı"
                  />
                  <p className="mt-4 text-2xl font-bold tabular-nums">
                    3 / {stampsReq}
                  </p>
                  <EditableLine
                    className="mt-1 text-sm opacity-90 outline-none ring-[var(--accent)] focus:ring-2"
                    value={inviteStatusText}
                    display={display.status}
                    onChange={setInviteStatusText}
                    placeholder="Durum metni"
                  />
                </div>

                {(collectName || collectBirthday) && (
                  <div className="mt-4 space-y-2 rounded-xl border border-white/15 bg-black/25 p-3">
                    <EditableLine
                      className="text-xs font-semibold text-white outline-none ring-amber-400 focus:ring-2"
                      value={inviteFormTitle}
                      display={display.formTitle}
                      onChange={setInviteFormTitle}
                      placeholder="Form başlığı"
                    />
                    <p className="text-[10px] text-white/50">
                      {[collectName && "İsim", collectBirthday && "Doğum günü"]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      alanı gösterilir
                    </p>
                  </div>
                )}

                <EditableLine
                  className="mt-3 text-xs leading-relaxed text-white/70 outline-none ring-amber-400 focus:ring-2"
                  value={inviteCtaHint}
                  display={display.cta}
                  onChange={setInviteCtaHint}
                  placeholder="CTA ipucu"
                />
                <div className="mt-2 space-y-2">
                  <div className="rounded-xl bg-black px-3 py-2.5 text-center text-xs font-semibold text-white">
                    <EditableLine
                      className="outline-none ring-amber-400 focus:ring-2"
                      value={inviteAppleBtn}
                      display={display.apple}
                      onChange={setInviteAppleBtn}
                      placeholder="Apple"
                    />
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2.5 text-center text-xs font-semibold text-black">
                    <EditableLine
                      className="outline-none ring-amber-400 focus:ring-2"
                      value={inviteGoogleBtn}
                      display={display.google}
                      onChange={setInviteGoogleBtn}
                      placeholder="Google"
                    />
                  </div>
                </div>

                <EditableArea
                  className="mt-4 text-[10px] leading-relaxed text-white/50 outline-none ring-amber-400 focus:ring-2"
                  value={inviteLegalText}
                  display={display.legal}
                  onChange={setInviteLegalText}
                  placeholder="KVKK / alt not"
                />

                {policies.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {policies.map((p) => (
                      <div
                        key={p.title}
                        className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] text-white/70"
                      >
                        {p.title}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <p className="mt-3 text-[11px] text-[var(--muted)]">
                Kaydettikten sonra “Gerçek önizlemeyi aç” ile müşterinin
                göreceği sayfayı yeni sekmede aç.
              </p>
            </Panel>
          </aside>
        </div>
      ) : null}

      {section === "biz" ? (
        <Panel>
          <PanelHeader title="İletişim & işletme bilgileri" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kafe adı">
              <input
                className={inputClassName()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </Field>
            <Field label="Telefon">
              <input
                className={inputClassName()}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Web sitesi">
              <input
                className={inputClassName()}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </Field>
            <Field label="Adres / şubeler">
              <textarea
                className={inputClassName() + " min-h-24"}
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
              />
            </Field>
            <Field label="Çalışma saatleri">
              <textarea
                className={inputClassName() + " min-h-20"}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </Field>
            <Field label="Hakkında">
              <textarea
                className={inputClassName() + " min-h-28"}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
            </Field>
          </div>
        </Panel>
      ) : null}

      {section === "bday" ? (
        <Panel>
          <PanelHeader
            title="Doğum günü sürprizi"
            description="Wallet push — SMS değil. Önce davet sekmesinden doğum günü toplamayı aç."
          />
          <div className="space-y-4">
            <label
              className={`flex items-start gap-3 ${collectBirthday ? "cursor-pointer" : "opacity-50"}`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={birthdayGift}
                disabled={!collectBirthday}
                onChange={(e) => setBirthdayGift(e.target.checked)}
              />
              <span className="font-medium text-[var(--ink)]">
                Otomatik doğum günü bildirimi (09:05 TR)
              </span>
            </label>
            {collectBirthday && birthdayGift ? (
              <Field label="Bildirim metni">
                <input
                  className={inputClassName()}
                  value={birthdayMessage}
                  onChange={(e) => setBirthdayMessage(e.target.value)}
                  maxLength={120}
                />
              </Field>
            ) : null}
            {!collectBirthday ? (
              <p className="text-sm text-[var(--muted)]">
                Doğum günü alanı kapalı. Davet sekmesinden aç.
              </p>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function EditableLine({
  value,
  display,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  display: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      className={`w-full border-0 bg-transparent p-0 ${className ?? ""}`}
      value={value || display}
      placeholder={placeholder}
      onFocus={() => {
        if (!value) onChange(display);
      }}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (value.trim() === display.trim() || !value.trim()) onChange("");
      }}
    />
  );
}

function EditableArea({
  value,
  display,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  display: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <textarea
      className={`w-full resize-y border-0 bg-transparent p-0 ${className ?? ""}`}
      rows={3}
      value={value || display}
      placeholder={placeholder}
      onFocus={() => {
        if (!value) onChange(display);
      }}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (value.trim() === display.trim() || !value.trim()) onChange("");
      }}
    />
  );
}
