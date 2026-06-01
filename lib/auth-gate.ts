// Gate de password simples (NÃO é auth real — ver dívida técnica no CLAUDE.md).
// Token de sessão = SHA-256 de APP_PASSWORD. Web Crypto funciona em edge + node.

export const SESSION_COOKIE = 'numis_session'

export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`numis::${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  const password = process.env.APP_PASSWORD
  if (!password || !cookieValue) return false
  const expected = await sessionToken(password)
  return cookieValue === expected
}
