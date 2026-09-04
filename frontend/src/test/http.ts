/** The fetch mocks receive `RequestInfo | URL`; stringifying that directly can
 *  produce "[object Object]", so tests read the URL through this. */
export function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;

  return input.url;
}

export function requestMethod(init?: RequestInit): string {
  return init?.method ?? 'GET';
}
