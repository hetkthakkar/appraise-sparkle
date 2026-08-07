import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function AcentricBadge() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="fixed bottom-3 right-3 z-[9999] flex items-center overflow-hidden rounded-md bg-[#18181b] text-white shadow-lg">
      {/* Clickable Acentric link */}
      <a
        href="https://acentric.in/"
        target="_blank"
        rel="noopener noreferrer"
        className={`px-3 py-1.5 text-[11px] font-medium transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-20"
        }`}
      >
        Built by Acentric
      </a>

      {/* Eye toggle */}
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="flex h-7 w-7 items-center justify-center border-l border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={visible ? "Reduce visibility" : "Restore visibility"}
      >
        {visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
