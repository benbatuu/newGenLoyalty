import { redirect } from "next/navigation";
import { getAdminRegisterUrl } from "@/lib/public-urls";

/** Kayıt admin panelinde yapılır; admin kayıt adresi tanımlı değilse fiyatlandırmaya düşer. */
export default function SignupPage() {
  redirect(getAdminRegisterUrl() || "/pricing");
}
