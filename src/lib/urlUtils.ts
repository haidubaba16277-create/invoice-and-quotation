export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function getPublicQuotationUrl(tokenOrNumber: string): string {
  const baseUrl = getPublicBaseUrl();
  if (!tokenOrNumber) return baseUrl;
  const clean = encodeURIComponent(tokenOrNumber);
  // Query parameter on root URL ensures smooth loading without server 404s
  return `${baseUrl}/?q=${clean}`;
}
