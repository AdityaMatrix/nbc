import { Sparkles, ArrowUp } from "lucide-react";
import { useState } from "react";

export function AiInsightsBar({ onSubmit, isLoading, insight }) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim() && onSubmit) {
      onSubmit(value);
    }
  };

  return (
    <div className="px-1 pb-2 space-y-3">
      <div
        className="rounded-2xl shadow-2xl p-2 flex items-center gap-3"
        style={{ backgroundColor: "#1e293b", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}
      >
        <div
          className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
          style={{ backgroundColor: "var(--brand)" }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ask AI about your data — e.g. Which department exceeded budget?"
          className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <span className="hidden sm:block text-[10px] font-mono text-white/30 px-2">⌘K</span>
        <button
          onClick={handleSubmit}
          disabled={isLoading || !value.trim()}
          className="w-9 h-9 rounded-xl grid place-items-center shrink-0 hover:brightness-110 transition active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: "var(--brand)" }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
      {insight && (
        <div className="bg-white rounded-lg p-4 text-sm border border-slate-200 animate-fade-in">
          <p className="text-slate-700 whitespace-pre-wrap">{insight}</p>
        </div>
      )}
    </div>
  );
}
