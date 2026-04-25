const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.VITE_API_URL || "https://backend2-cyhd.onrender.com";

export const BACKEND_URL = API_URL;

export const buildApiUrl = (path: string) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/")) {
    return `${BACKEND_URL}${cleanPath}`;
  }
  return `${BACKEND_URL}/api${cleanPath}`;
};

export const getUserId = (user: any) => user?.id || user?._id || "";

type RequestJsonOptions = RequestInit & {
  timeoutMs?: number;
};

const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return rawBody;
    }
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const requestJson = async <T = any>(
  path: string,
  options: RequestJsonOptions = {}
): Promise<T> => {
  const { timeoutMs = 30000, headers, signal, ...rest } = options;
  const controller = signal ? null : new AbortController();
  const activeSignal = signal ?? controller?.signal;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(buildApiUrl(path), {
      ...rest,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      signal: activeSignal,
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      throw new ApiError(
        data?.message || data?.error || response.statusText || "Request failed",
        response.status,
        data
      );
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === "AbortError" || error?.message?.includes("timeout")) {
      throw new Error("Request timed out. Please try again.");
    }
    if (error?.message?.includes("Network request failed") || error?.message?.includes("Failed to fetch")) {
      throw new Error("Network error. Please check your connection and try again.");
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
