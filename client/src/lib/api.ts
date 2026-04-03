export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? '请求失败');
  }
  return data as T;
}

export async function apiFetchWithParams<T>(path: string, params: Record<string, number | string>, options: RequestInit = {}, token?: string): Promise<T> {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return apiFetch<T>(url.toString(), options, token);
}
