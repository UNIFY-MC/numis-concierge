// Bandeiras em SVG (portadas do HTML original). Emoji de bandeira não renderiza
// no Chrome em Windows, daí SVG. Cores nacionais são fixas — exceção legítima à
// regra de tokens (uma bandeira tem as cores que tem).
const FLAGS: Record<string, string> = {
  de: '<rect width="60" height="40" fill="#000"/><rect y="13.3" width="60" height="13.4" fill="#D00"/><rect y="26.7" width="60" height="13.3" fill="#FFCE00"/>',
  ad: '<rect width="60" height="40" fill="#10069F"/><rect x="20" width="20" height="40" fill="#FEDF00"/><rect x="40" width="20" height="40" fill="#D50032"/><circle cx="30" cy="20" r="5" fill="#C8102E"/>',
  at: '<rect width="60" height="40" fill="#ED2939"/><rect y="13.3" width="60" height="13.4" fill="#fff"/>',
  be: '<rect width="20" height="40" fill="#000"/><rect x="20" width="20" height="40" fill="#FAE042"/><rect x="40" width="20" height="40" fill="#ED2939"/>',
  bg: '<rect width="60" height="40" fill="#fff"/><rect y="13.3" width="60" height="13.4" fill="#00966E"/><rect y="26.7" width="60" height="13.3" fill="#D62612"/>',
  cy: '<rect width="60" height="40" fill="#fff"/><path d="M21 15 q9 -3 18 1 q-9 4 -18 -1z" fill="#D57800"/><path d="M25 25 q3 3 6 0 M35 25 q-3 3 -6 0" stroke="#4E5B31" stroke-width="1.2" fill="none"/>',
  hr: '<rect width="60" height="40" fill="#FF0000"/><rect y="13.3" width="60" height="13.4" fill="#fff"/><rect y="26.7" width="60" height="13.3" fill="#171796"/><rect x="26" y="11" width="8" height="8" fill="#FF0000" stroke="#fff" stroke-width="0.8"/>',
  sk: '<rect width="60" height="40" fill="#fff"/><rect y="13.3" width="60" height="13.4" fill="#0B4EA2"/><rect y="26.7" width="60" height="13.3" fill="#EE1C25"/>',
  si: '<rect width="60" height="40" fill="#fff"/><rect y="13.3" width="60" height="13.4" fill="#0B4EA2"/><rect y="26.7" width="60" height="13.3" fill="#ED1C24"/>',
  es: '<rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/>',
  ee: '<rect width="60" height="40" fill="#0072CE"/><rect y="13.3" width="60" height="13.4" fill="#000"/><rect y="26.7" width="60" height="13.3" fill="#fff"/>',
  fi: '<rect width="60" height="40" fill="#fff"/><rect y="16" width="60" height="8" fill="#003580"/><rect x="18" width="8" height="40" fill="#003580"/>',
  fr: '<rect width="20" height="40" fill="#0055A4"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#EF4135"/>',
  gr: '<rect width="60" height="40" fill="#0D5EAF"/><rect y="4.4" width="60" height="4.4" fill="#fff"/><rect y="13.3" width="60" height="4.4" fill="#fff"/><rect y="22.2" width="60" height="4.4" fill="#fff"/><rect y="31.1" width="60" height="4.4" fill="#fff"/><rect width="22" height="22.2" fill="#0D5EAF"/><rect x="9" width="4" height="22.2" fill="#fff"/><rect y="9" width="22" height="4.4" fill="#fff"/>',
  nl: '<rect width="60" height="40" fill="#AE1C28"/><rect y="13.3" width="60" height="13.4" fill="#fff"/><rect y="26.7" width="60" height="13.3" fill="#21468B"/>',
  ie: '<rect width="20" height="40" fill="#169B62"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#FF883E"/>',
  it: '<rect width="20" height="40" fill="#008C45"/><rect x="20" width="20" height="40" fill="#F4F5F0"/><rect x="40" width="20" height="40" fill="#CD212A"/>',
  lv: '<rect width="60" height="40" fill="#9E1B32"/><rect y="16" width="60" height="8" fill="#fff"/>',
  lt: '<rect width="60" height="40" fill="#FDB913"/><rect y="13.3" width="60" height="13.4" fill="#006A44"/><rect y="26.7" width="60" height="13.3" fill="#C1272D"/>',
  lu: '<rect width="60" height="40" fill="#ED2939"/><rect y="13.3" width="60" height="13.4" fill="#fff"/><rect y="26.7" width="60" height="13.3" fill="#00A1DE"/>',
  mt: '<rect width="60" height="40" fill="#fff"/><rect x="30" width="30" height="40" fill="#CF142B"/><rect x="4" y="3" width="10" height="10" fill="#fff" stroke="#C8A951" stroke-width="1"/>',
  pt: '<rect width="60" height="40" fill="#DA291C"/><rect width="24" height="40" fill="#046A38"/><circle cx="24" cy="20" r="5.5" fill="#FFE000" stroke="#fff" stroke-width="0.7"/>',
  sm: '<rect width="60" height="40" fill="#fff"/><rect y="20" width="60" height="20" fill="#5EB6E4"/>',
  va: '<rect width="60" height="40" fill="#FFE000"/><rect x="30" width="30" height="40" fill="#fff"/><circle cx="44" cy="20" r="4.5" fill="none" stroke="#9b9b9b" stroke-width="1.4"/><path d="M44 20 l6 6" stroke="#9b9b9b" stroke-width="1.6"/>',
}

interface FlagProps {
  code: string
  size?: number
}

export default function Flag({ code, size = 22 }: FlagProps) {
  const inner = FLAGS[code]
  const w = Math.round(size * 1.5)
  if (!inner) {
    return <span className="inline-block align-middle text-mp-ink-faint" aria-hidden>🪙</span>
  }
  return (
    <svg
      viewBox="0 0 60 40"
      width={w}
      height={size}
      className="inline-block align-middle rounded-[2px] shadow-sm ring-1 ring-black/10"
      role="img"
      aria-label={code}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  )
}
