export function AcentricBadge() {
  return (
    <div className="fixed bottom-3 right-3 z-[9999] inline-flex items-center rounded-md bg-[#18181b] px-2.5 py-1.5 text-[11px] font-medium shadow-md">
      <span className="text-[#a1a1aa]">Built by&nbsp;</span>

      <a
        href="https://acentric.in/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Acentric"
        className="text-white hover:underline"
      >
        Acentric
      </a>
    </div>
  );
}
