export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch("/api" + path, { ...options, cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: options.signal ?? AbortSignal.timeout(10000) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.detail ?? (response.status === 401 ? "İstifadəçi adı və ya şifrə yanlışdır." : "Sorğunu tamamlamaq mümkün olmadı."), response.status);
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}
