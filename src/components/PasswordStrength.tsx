import { useMemo } from "react";
import { Check, X } from "lucide-react";

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  checks: { label: string; pass: boolean }[];
}

export function evaluatePassword(pw: string): StrengthResult {
  const checks = [
    { label: "8+ characters", pass: pw.length >= 8 },
    { label: "Upper & lowercase", pass: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: "A number", pass: /\d/.test(pw) },
    { label: "A symbol", pass: /[^A-Za-z0-9]/.test(pw) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (pw.length === 0) score = 0;
  else if (passed <= 1) score = 1;
  else if (passed === 2) score = 2;
  else if (passed === 3) score = 3;
  else score = 4;
  const labels = ["Empty", "Weak", "Fair", "Strong", "Excellent"];
  const colors = ["bg-ink/10", "bg-destructive", "bg-pop-orange", "bg-pop-cyan", "bg-pop-pink"];
  return { score, label: labels[score], color: colors[score], checks };
}

export const isPasswordAcceptable = (pw: string) => evaluatePassword(pw).score >= 3;

export function PasswordStrength({ password, dark = false }: { password: string; dark?: boolean }) {
  const r = useMemo(() => evaluatePassword(password), [password]);
  const muted = dark ? "text-paper/70" : "text-muted-foreground";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full border ${dark ? "border-paper/20" : "border-ink/10"} ${
            i <= r.score ? r.color : (dark ? "bg-paper/10" : "bg-ink/10")
          }`}/>
        ))}
        <span className="text-[10px] font-bold uppercase ml-2 min-w-[60px] text-right">{r.label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-1 text-[11px]">
        {r.checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1 ${c.pass ? (dark ? "text-pop-yellow" : "text-emerald-700") : muted}`}>
            {c.pass ? <Check size={11}/> : <X size={11}/>} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
