/** Marca do TeamAgents — trio de hexágonos conectados (molécula de agentes).
 *  Usa currentColor, então herda a cor do contexto (ex.: branco sobre o
 *  quadrado de marca). Recriação vetorial do logo para nitidez em qualquer tamanho. */
export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={22}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* conexões entre os nós (a "molécula") */}
      <g strokeWidth={16}>
        <line x1="256" y1="176" x2="192" y2="300" />
        <line x1="256" y1="176" x2="320" y2="300" />
        <line x1="192" y1="300" x2="320" y2="300" />
      </g>
      {/* hexágonos */}
      <polygon points="314,176 285,226 227,226 198,176 227,126 285,126" />
      <polygon points="250,300 221,350 163,350 134,300 163,250 221,250" />
      <polygon points="378,300 349,350 291,350 262,300 291,250 349,250" />
      {/* nós centrais */}
      <g fill="currentColor" stroke="none">
        <circle cx="256" cy="176" r="13" />
        <circle cx="192" cy="300" r="13" />
        <circle cx="320" cy="300" r="13" />
      </g>
    </svg>
  );
}
