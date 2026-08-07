import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function AcentricBadge() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2">
      {/* Built by Acentric */}
      <a
        href="https://acentric.in/"
        target="_blank"
        rel="noopener noreferrer"
        className={`text-xs font-medium transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-20"
        }`}
      >
        Built by Acentric
      </a>

      {/* Eye toggle */}
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Reduce badge visibility" : "Show badge visibility"}
        title={visible ? "Reduce visibility" : "Show visibility"}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
