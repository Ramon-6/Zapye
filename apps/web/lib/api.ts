const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

// Token guardado no localStorage após o login.
function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("zapye_token");
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      // só envia content-type quando há corpo (POST sem body quebra o Fastify)
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...opts.headers,
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("zapye_token");
    if (!location.pathname.startsWith("/login")) location.href = "/login";
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await api<{ token: string; user: { name: string; email: string; role: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("zapye_token", data.token);
  if (data.user) {
    localStorage.setItem("zapye_user_name", data.user.name ?? "");
    localStorage.setItem("zapye_user_email", data.user.email ?? email);
  }
  return data;
}
