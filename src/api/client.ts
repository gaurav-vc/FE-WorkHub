import { API_BASE } from "@/config";

interface ApiOptions extends RequestInit {
  data?: any;
  params?: Record<string, string>;
  responseType?: 'json' | 'blob' | 'text';
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Core API Client
 * Abstracting native fetch to automatically handle JSON, authentication tokens, 
 * automatic JWT refresh on 401, resilient network retry, and accurate error reporting.
 */
export const apiClient = async <T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token"); 
  
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.data !== undefined && options.body === undefined) {
    if (typeof FormData !== "undefined" && options.data instanceof FormData) {
      options.body = options.data;
      headers.delete("Content-Type");
    } else {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      options.body = typeof options.data === "string" ? options.data : JSON.stringify(options.data);
    }
  }

  let url = `${API_BASE}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    // Retry once on network disconnect or dropped connection
    if (!options._retry) {
      await new Promise((r) => setTimeout(r, 400));
      return apiClient<T>(endpoint, { ...options, _retry: true });
    }
    throw netErr;
  }

  // Handle 401 Unauthorized with automatic JWT refresh
  if (res.status === 401 && !options._retry && !endpoint.includes('/auth/login/') && !endpoint.includes('/auth/refresh/')) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken: string) => {
          headers.set("Authorization", `Bearer ${newToken}`);
          return apiClient<T>(endpoint, { ...options, _retry: true, headers });
        });
      }

      options._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccess = refreshData.access;
          if (newAccess) {
            localStorage.setItem("token", newAccess);
            if (refreshData.refresh) {
              localStorage.setItem("refresh_token", refreshData.refresh);
            }
            processQueue(null, newAccess);
            headers.set("Authorization", `Bearer ${newAccess}`);
            return apiClient<T>(endpoint, { ...options, _retry: true, headers });
          }
        }
        processQueue(new Error("Session expired"), null);
      } catch (err) {
        processQueue(err, null);
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (!res.ok) {
    let errorMsg = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json();
      if (typeof errData === 'string') {
        errorMsg = errData;
      } else if (errData.detail) {
        errorMsg = errData.detail;
      } else if (errData.error) {
        errorMsg = typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
      } else if (errData.message) {
        errorMsg = errData.message;
      } else if (typeof errData === 'object' && errData !== null) {
        const values = Object.values(errData);
        if (values.length > 0 && Array.isArray(values[0]) && (values[0] as any[]).length > 0) {
          errorMsg = String((values[0] as any[])[0]);
        } else {
          errorMsg = JSON.stringify(errData);
        }
      }
    } catch (e) {
      // Not JSON
    }
    const error: any = new Error(errorMsg);
    error.status = res.status;
    error.response = res;
    throw error;
  }

  if (res.status === 204) return null as unknown as T;
  
  if (options.responseType === 'blob') {
    return (await res.blob()) as unknown as T;
  }
  
  if (options.responseType === 'text') {
    return (await res.text()) as unknown as T;
  }
  
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    return null as unknown as T;
  }
};
