import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function AcentricBadge() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1">
      {/* Built by Acentric link */}
      <a
        href="https://www.acentric.in/"
        target="_blank"
        rel="noopener noreferrer"
        className={`rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-20"
        }`}
      >
        Built by Acentric
      </a>

      {/* Visibility toggle */}
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? "Make Acentric badge less visible" : "Show Acentric badge"}
        title={isVisible ? "Make less visible" : "Show badge"}
        className="flex h-7 w-7 items-center justify-center rounded-md border bg-background shadow-sm transition-colors hover:bg-muted"
      >
        {isVisible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
