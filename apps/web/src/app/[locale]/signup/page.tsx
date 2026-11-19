import { redirect } from "next/navigation";

/** Kayıt paket seçimiyle fiyatlandırma sayfasından başlar. */
export default function SignupPage() {
  redirect("/pricing");
}
