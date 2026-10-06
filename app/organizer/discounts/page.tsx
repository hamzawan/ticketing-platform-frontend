"use client";

import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/badge";

type DiscountCode = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  uses: number;
  max: number;
  expires: string;
  status: "active" | "expired";
  event: string;
};

// Mock data matching Figma until a discounts API exists.
const INITIAL_CODES: DiscountCode[] = [
  { code: "BOUNCE20", type: "percent", value: 20, uses: 47, max: 100, expires: "Jul 31, 2026", status: "active", event: "Summer Bounce Bash" },
  { code: "VIP50OFF", type: "fixed", value: 50, uses: 12, max: 20, expires: "Jul 15, 2026", status: "active", event: "Summer Bounce Bash" },
  { code: "SUMMER10", type: "percent", value: 10, uses: 100, max: 100, expires: "Jun 30, 2026", status: "expired", event: "Summer Bounce Bash" },
  { code: "FAMILY15", type: "percent", value: 15, uses: 8, max: 50, expires: "Aug 15, 2026", status: "active", event: "Kids Bounce Bonanza" },
];

const INPUT_CLASS =
  "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary placeholder:text-muted-foreground";

export default function DiscountsPage() {
  const [show, setShow] = useState(false);
  const [codes, setCodes] = useState(INITIAL_CODES);
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountCode["type"]>("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");

  function closeForm() {
    setShow(false);
    setCode("");
    setType("percent");
    setValue("");
    setMaxUses("");
  }

  function handleCreate() {
    const numValue = Number(value);
    const numMax = Number(maxUses);
    if (!code.trim() || !(numValue > 0) || !(numMax > 0)) return;
    setCodes((prev) => [
      { code: code.trim().toUpperCase(), type, value: numValue, uses: 0, max: numMax, expires: "—", status: "active", event: "All Events" },
      ...prev,
    ]);
    closeForm();
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Discounts & Coupons"
        subtitle="Create and manage discount codes for your events."
        action={
          <button
            onClick={() => setShow(true)}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> New Code
          </button>
        }
      />
      {show && (
        <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm font-(family-name:--font-display)">Create Discount Code</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. BOUNCE20"
                className={`${INPUT_CLASS} font-mono uppercase placeholder:normal-case`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Discount Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DiscountCode["type"])}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Value</label>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="e.g. 20" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Max Uses</label>
              <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" placeholder="e.g. 100" className={INPUT_CLASS} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={closeForm} className="flex-1 border border-border py-2.5 rounded-xl text-sm hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Create Code
            </button>
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {["Code", "Discount", "Event", "Uses", "Expires", "Status", ""].map((h, i) => (
                  <th key={i} className="text-left text-xs text-muted-foreground font-medium p-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((d) => (
                <tr key={d.code} className="hover:bg-secondary/40">
                  <td className="p-4 font-mono text-sm font-bold">{d.code}</td>
                  <td className="p-4 text-xs font-semibold text-accent whitespace-nowrap">
                    {d.type === "percent" ? `${d.value}% off` : `$${d.value} off`}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{d.event}</td>
                  <td className="p-4 text-xs min-w-28">
                    <span className="font-medium">{d.uses}</span>
                    <span className="text-muted-foreground"> / {d.max}</span>
                    <ProgressBar value={d.uses} max={d.max} color="#F97316" />
                  </td>
                  <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{d.expires}</td>
                  <td className="p-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        aria-label={`Copy ${d.code}`}
                        onClick={() => navigator.clipboard?.writeText(d.code)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        aria-label={`Delete ${d.code}`}
                        onClick={() => setCodes((prev) => prev.filter((c) => c.code !== d.code))}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
