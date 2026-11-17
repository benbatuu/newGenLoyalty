"use client";

import { InviteQrModal } from "../../../components/invite-qr-modal";
import {
  WalletInvitePickerModal,
  type WalletInviteProgram,
} from "../../../components/wallet-invite-picker-modal";
import { formatPhoneLabel } from "../../../lib/pii-display";
import type { Customer } from "./types";

type CounterModalsProps = {
  inviteUrl: string | null;
  onCloseInvite: () => void;
  selected: Customer | null;
  pendingPhone: string | null;
  invitePickerOpen: boolean;
  invitePickerMode: "register" | "wallet";
  walletPrograms: WalletInviteProgram[];
  phone: string;
  busy: boolean;
  onClosePicker: () => void;
  onConfirmPicker: (programIds: string[]) => void;
};

export function CounterModals({
  inviteUrl,
  onCloseInvite,
  selected,
  pendingPhone,
  invitePickerOpen,
  invitePickerMode,
  walletPrograms,
  phone,
  busy,
  onClosePicker,
  onConfirmPicker,
}: CounterModalsProps) {
  return (
    <>
      {inviteUrl ? (
        <InviteQrModal
          url={inviteUrl}
          phoneLabel={
            selected
              ? formatPhoneLabel(selected.displayName, selected.phone)
              : pendingPhone
                ? pendingPhone
                : undefined
          }
          onClose={onCloseInvite}
        />
      ) : null}

      {invitePickerOpen ? (
        <WalletInvitePickerModal
          programs={walletPrograms}
          phoneLabel={
            invitePickerMode === "wallet" && selected
              ? formatPhoneLabel(selected.displayName, selected.phone)
              : (pendingPhone ?? phone.trim()) || undefined
          }
          title={
            invitePickerMode === "register"
              ? "Kayıt — hangi kartlar eklensin?"
              : "Wallet daveti — hangi kartlar?"
          }
          confirmLabel={
            invitePickerMode === "register"
              ? "Kaydet ve davet gönder"
              : "QR oluştur"
          }
          busy={busy}
          onClose={onClosePicker}
          onConfirm={onConfirmPicker}
        />
      ) : null}
    </>
  );
}
