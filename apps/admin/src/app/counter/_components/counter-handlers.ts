import { FormEvent } from "react";
import { ApiError, api } from "../../../lib/api";
import type { Customer, PointPreview, StampResult } from "./types";

export function parseTryToKurus(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

type HandlerDeps = {
  selected: Customer | null;
  pointProgram: { id: string } | undefined;
  cashbackProgram: { id: string } | undefined;
  pointAmountTry: string;
  pointCategory: string | undefined;
  cashbackAmountTry: string;
  cashbackRedeemTry: string;
  cashbackBasketTry: string;
  phone: string;
  searchInput: string;
  pendingPhone: string | null;
  needsProgramPicker: boolean;
  walletPrograms: { programId: string }[];
  setError: (error: string | null) => void;
  setOk: (ok: string | null) => void;
  setBusy: (busy: boolean) => void;
  setPointBalance: (balance: number | null) => void;
  setPointAmountTry: (value: string) => void;
  setCashbackAmountTry: (value: string) => void;
  setCashbackRedeemTry: (value: string) => void;
  setCashbackBasketTry: (value: string) => void;
  setCashbackBalanceTry: (value: string | null) => void;
  setPhone: (value: string) => void;
  setPendingPhone: (value: string | null) => void;
  setInvitePickerOpen: (open: boolean) => void;
  setInvitePickerMode: (mode: "register" | "wallet") => void;
  selectCustomer: (c: Customer) => void;
  openInvite: (url: string | null | undefined) => void;
  refreshAll: () => Promise<void>;
};

export async function earnPoints(deps: HandlerDeps) {
  const {
    selected,
    pointProgram,
    pointAmountTry,
    pointCategory,
    setError,
    setOk,
    setBusy,
    setPointBalance,
    setPointAmountTry,
    refreshAll,
  } = deps;
  if (!selected || !pointProgram) return;
  const amountKurus = parseTryToKurus(pointAmountTry);
  if (amountKurus == null || amountKurus <= 0) {
    setError("Geçerli bir tutar girin (örn. 47,50)");
    return;
  }
  setError(null);
  setOk(null);
  setBusy(true);
  try {
    const preview = await api<PointPreview>(
      `/programs/${pointProgram.id}/points/customers/${selected.id}/preview`,
      {
        method: "POST",
        body: JSON.stringify({
          amountKurus,
          categoryId: pointCategory,
        }),
      },
    );
    const camp =
      preview.campaignMultiplier > 1
        ? ` (kampanya ${preview.campaignMultiplier}x)`
        : "";
    const msg = `${preview.amountTry} TL → ${preview.finalPoints} puan${camp}. Onaylıyor musunuz?`;
    if (!window.confirm(msg)) return;

    const result = await api<{ balance: number; earned: number }>(
      `/programs/${pointProgram.id}/points/customers/${selected.id}/earn`,
      {
        method: "POST",
        body: JSON.stringify({
          amountKurus,
          categoryId: pointCategory,
          confirmed: true,
        }),
      },
    );
    setPointBalance(result.balance);
    setPointAmountTry("");
    setOk(`+${result.earned} puan · bakiye ${result.balance}`);
    await refreshAll();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Puan eklenemedi");
  } finally {
    setBusy(false);
  }
}

export async function redeemPoints(
  deps: HandlerDeps,
  pointCost: number,
  rewardLabel: string,
) {
  const {
    selected,
    pointProgram,
    setError,
    setOk,
    setBusy,
    setPointBalance,
    refreshAll,
  } = deps;
  if (!selected || !pointProgram) return;
  if (!window.confirm(`${pointCost} puan → ${rewardLabel}?`)) return;
  setError(null);
  setOk(null);
  setBusy(true);
  try {
    const result = await api<{ balance: number; rewardLabel: string }>(
      `/programs/${pointProgram.id}/points/customers/${selected.id}/redeem`,
      {
        method: "POST",
        body: JSON.stringify({ pointCost, rewardLabel }),
      },
    );
    setPointBalance(result.balance);
    setOk(`Ödül kullanıldı: ${result.rewardLabel}`);
    await refreshAll();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Puan kullanılamadı");
  } finally {
    setBusy(false);
  }
}

export async function earnCashback(deps: HandlerDeps) {
  const {
    selected,
    cashbackProgram,
    cashbackAmountTry,
    setError,
    setOk,
    setBusy,
    setCashbackAmountTry,
    setCashbackBalanceTry,
    refreshAll,
  } = deps;
  if (!selected || !cashbackProgram) return;
  const amountKurus = parseTryToKurus(cashbackAmountTry);
  if (amountKurus == null || amountKurus <= 0) {
    setError("Geçerli bir tutar girin (örn. 500)");
    return;
  }
  setError(null);
  setOk(null);
  setBusy(true);
  try {
    const preview = await api<{
      amountTry: string;
      finalEarnKurus: number;
      earnPercent: number;
      campaignMultiplier: number;
    }>(
      `/programs/${cashbackProgram.id}/cashback/customers/${selected.id}/preview`,
      {
        method: "POST",
        body: JSON.stringify({ amountKurus }),
      },
    );
    const camp =
      preview.campaignMultiplier > 1
        ? ` (kampanya ${preview.campaignMultiplier}x)`
        : "";
    const earnedTry = (preview.finalEarnKurus / 100)
      .toFixed(2)
      .replace(".", ",");
    const msg = `${preview.amountTry} TL → +₺${earnedTry} cashback (%${preview.earnPercent})${camp}. Onaylıyor musunuz?`;
    if (!window.confirm(msg)) return;

    const result = await api<{
      balanceTry: string;
      earnedTry: string;
    }>(
      `/programs/${cashbackProgram.id}/cashback/customers/${selected.id}/earn`,
      {
        method: "POST",
        body: JSON.stringify({ amountKurus, confirmed: true }),
      },
    );
    setCashbackAmountTry("");
    setCashbackBalanceTry(result.balanceTry);
    setOk(`+₺${result.earnedTry} cashback · bakiye ₺${result.balanceTry}`);
    await refreshAll();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Cashback eklenemedi");
  } finally {
    setBusy(false);
  }
}

export async function redeemCashback(deps: HandlerDeps) {
  const {
    selected,
    cashbackProgram,
    cashbackRedeemTry,
    cashbackBasketTry,
    setError,
    setOk,
    setBusy,
    setCashbackRedeemTry,
    setCashbackBasketTry,
    setCashbackBalanceTry,
    refreshAll,
  } = deps;
  if (!selected || !cashbackProgram) return;
  const amountKurus = parseTryToKurus(cashbackRedeemTry);
  if (amountKurus == null || amountKurus <= 0) {
    setError("Kullanılacak tutarı girin");
    return;
  }
  const basketKurus = cashbackBasketTry.trim()
    ? parseTryToKurus(cashbackBasketTry)
    : undefined;
  if (!window.confirm(`₺${cashbackRedeemTry} bakiye kullanılsın mı?`)) return;
  setError(null);
  setOk(null);
  setBusy(true);
  try {
    const result = await api<{ balanceTry: string; redeemedTry: string }>(
      `/programs/${cashbackProgram.id}/cashback/customers/${selected.id}/redeem-credit`,
      {
        method: "POST",
        body: JSON.stringify({
          amountKurus,
          ...(basketKurus != null ? { basketKurus } : {}),
        }),
      },
    );
    setCashbackRedeemTry("");
    setCashbackBasketTry("");
    setCashbackBalanceTry(result.balanceTry);
    setOk(`₺${result.redeemedTry} kullanıldı · bakiye ₺${result.balanceTry}`);
    await refreshAll();
  } catch (err) {
    setError(
      err instanceof ApiError ? err.message : "Cashback kullanılamadı",
    );
  } finally {
    setBusy(false);
  }
}

export async function submitRegister(deps: HandlerDeps, programIds?: string[]) {
  const {
    pendingPhone,
    phone,
    searchInput,
    setError,
    setOk,
    setBusy,
    selectCustomer,
    openInvite,
    setPhone,
    setPendingPhone,
    refreshAll,
    setInvitePickerOpen,
  } = deps;
  const raw = (pendingPhone ?? phone).trim() || searchInput.trim();
  if (!raw) {
    setError("Kayıt için telefon girin");
    return;
  }
  setError(null);
  setOk(null);
  setBusy(true);
  try {
    const data = await api<StampResult>("/stamps/customers", {
      method: "POST",
      body: JSON.stringify({
        phone: raw.replace(/\D/g, ""),
        ...(programIds?.length ? { programIds } : {}),
      }),
    });
    selectCustomer(data.customer);
    setOk(
      data.walletInviteUrl
        ? "Kayıt + ilk damga tamam. Müşteri QR ile Wallet’a ekleyebilir."
        : "Kayıt + ilk damga tamam.",
    );
    openInvite(data.walletInviteUrl);
    setPhone("");
    setPendingPhone(null);
    await refreshAll();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Kayıt başarısız");
  } finally {
    setBusy(false);
    setInvitePickerOpen(false);
  }
}

export async function submitWalletInvite(
  deps: HandlerDeps,
  programIds?: string[],
) {
  const {
    selected,
    setError,
    setBusy,
    openInvite,
    setInvitePickerOpen,
  } = deps;
  if (!selected) return;
  setError(null);
  setBusy(true);
  try {
    const data = await api<{ walletInviteUrl: string }>(
      `/stamps/customers/${selected.id}/wallet-invite`,
      {
        method: "POST",
        body: JSON.stringify(programIds?.length ? { programIds } : {}),
      },
    );
    openInvite(data.walletInviteUrl);
  } catch (err) {
    setError(
      err instanceof ApiError ? err.message : "Davet linki oluşturulamadı",
    );
  } finally {
    setBusy(false);
    setInvitePickerOpen(false);
  }
}

export async function register(deps: HandlerDeps, e?: FormEvent) {
  e?.preventDefault();
  const {
    phone,
    searchInput,
    needsProgramPicker,
    walletPrograms,
    setError,
    setPendingPhone,
    setInvitePickerMode,
    setInvitePickerOpen,
  } = deps;
  const raw = phone.trim() || searchInput.trim();
  if (!raw) {
    setError("Kayıt için telefon girin");
    return;
  }
  if (needsProgramPicker) {
    setPendingPhone(raw);
    setInvitePickerMode("register");
    setInvitePickerOpen(true);
    return;
  }
  await submitRegister(
    deps,
    walletPrograms.length === 1 ? [walletPrograms[0]!.programId] : undefined,
  );
}

export async function addStamp(deps: HandlerDeps) {
  const {
    selected,
    setError,
    setOk,
    setBusy,
    selectCustomer,
    openInvite,
    refreshAll,
  } = deps;
  if (!selected) return;
  setError(null);
  setOk(null);
  setBusy(true);
  try {
    const data = await api<StampResult>(
      `/stamps/customers/${selected.id}/stamp`,
      {
        method: "POST",
        body: JSON.stringify({ source: "cashier" }),
      },
    );
    selectCustomer(data.customer);
    setOk(
      data.customer.rewardReady
        ? `Damga eklendi — ödül hazır: ${data.rewardLabel}`
        : `Damga eklendi (${data.customer.stampCount}/${data.stampsRequired})`,
    );
    openInvite(data.walletInviteUrl);
    await refreshAll();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Damga eklenemedi");
  } finally {
    setBusy(false);
  }
}

export async function showWalletQr(deps: HandlerDeps) {
  const {
    selected,
    needsProgramPicker,
    walletPrograms,
    setInvitePickerMode,
    setInvitePickerOpen,
  } = deps;
  if (!selected) return;
  if (needsProgramPicker) {
    setInvitePickerMode("wallet");
    setInvitePickerOpen(true);
    return;
  }
  await submitWalletInvite(
    deps,
    walletPrograms.length === 1 ? [walletPrograms[0]!.programId] : undefined,
  );
}

export async function redeem(deps: HandlerDeps) {
  const {
    selected,
    setError,
    setOk,
    setBusy,
    selectCustomer,
    refreshAll,
  } = deps;
  if (!selected) return;
  setError(null);
  setOk(null);
  setBusy(true);
  try {
    const data = await api<{ customer: Customer; redeemed: string }>(
      `/stamps/customers/${selected.id}/redeem`,
      { method: "POST" },
    );
    selectCustomer(data.customer);
    setOk(`Ödül kullanıldı: ${data.redeemed}`);
    await refreshAll();
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "Ödül kullanılamadı");
  } finally {
    setBusy(false);
  }
}
