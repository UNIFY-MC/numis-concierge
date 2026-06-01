// Emoji de bandeira por código ISO de país (pais_codigo em catalog_coins)
const FLAGS: Record<string, string> = {
  de: '🇩🇪', ad: '🇦🇩', at: '🇦🇹', be: '🇧🇪', bg: '🇧🇬', cy: '🇨🇾',
  hr: '🇭🇷', sk: '🇸🇰', si: '🇸🇮', es: '🇪🇸', ee: '🇪🇪', fi: '🇫🇮',
  fr: '🇫🇷', gr: '🇬🇷', nl: '🇳🇱', ie: '🇮🇪', it: '🇮🇹', lv: '🇱🇻',
  lt: '🇱🇹', lu: '🇱🇺', mt: '🇲🇹', pt: '🇵🇹', sm: '🇸🇲', va: '🇻🇦',
}

export function flagOf(paisCodigo: string): string {
  return FLAGS[paisCodigo] ?? '🪙'
}
