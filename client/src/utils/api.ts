const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const normalizeBaseUrl = (value: string | undefined): string => {
  if (!value) return "";
  return value.replace(/\/$/, "");
};

export const apiBaseUrl = normalizeBaseUrl(rawApiBaseUrl);

export const apiPath = (path: string): string => {
  if (!apiBaseUrl) return path;
  return `${apiBaseUrl}${path}`;
};
