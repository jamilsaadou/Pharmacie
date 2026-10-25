/** Compare the browser origin with the requested host, not Next's bind address. */
export function assertSameOrigin(headers: Headers, requestUrl: string) {
  const origin = headers.get('origin');
  if (!origin) return;
  try {
    const requested = new URL(requestUrl);
    const target = new URL(`${requested.protocol}//${headers.get('host') || requested.host}`);
    const source = new URL(origin);
    if (source.origin !== origin || source.origin !== target.origin) throw new Error();
  } catch {
    throw new Error('Origine de la requête invalide.');
  }
}
