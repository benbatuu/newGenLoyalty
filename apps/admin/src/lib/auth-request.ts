import { getApiUrl } from "./public-urls";

/** Kimlik doğrulama uç noktaları için JSON POST. Hata mesajını API'den okur. */
export async function authPost<T>(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      message?: string | string[];
    };
    if (!res.ok) {
      const message = Array.isArray(data.message)
        ? data.message.join(" · ")
        : data.message || "İşlem tamamlanamadı, lütfen tekrar deneyin.";
      return { ok: false, message };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin." };
  }
}

/** Geliştirme ortamında API kodu döndürür; production'da bu alan yoktur. */
export type OtpRequestResponse = { ok: true; devCode?: string };
export type OtpVerifyResponse = { verificationToken: string };
