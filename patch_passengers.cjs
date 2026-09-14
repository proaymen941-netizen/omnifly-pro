const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

// 1. Add filterStatus state
if (!code.includes('const [filterStatus, setFilterStatus]')) {
    code = code.replace(
        'const [searchTerm, setSearchTerm] = useState("");',
        'const [searchTerm, setSearchTerm] = useState("");\n  const [filterStatus, setFilterStatus] = useState<"all" | "urgent" | "warning" | "overstayed" | "safe">("all");'
    );
}

// 2. Modify umrahPassengers to apply the filter
code = code.replace(
    '  const umrahPassengers = useMemo(() => {',
    `  const umrahPassengers = useMemo(() => {
    let list = passengers.filter(p => (p.visa_type || "").includes("عمر") || p.travel_date);
    if (filterStatus !== "all") {
      list = list.filter(p => {
        const remaining = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
        if (remaining === null) return false;
        if (filterStatus === "urgent") return remaining <= 3 && remaining >= 0;
        if (filterStatus === "warning") return remaining > 3 && remaining <= 10;
        if (filterStatus === "overstayed") return remaining < 0;
        if (filterStatus === "safe") return remaining > 10;
        return true;
      });
    }
    return list;
  }, [passengers, filterStatus]);
  
  const originalUmrahPassengers = useMemo(() => {`
);
if(code.includes('originalUmrahPassengers')) {
    // we just added it, fix the close bracket
    code = code.replace(
        `[passengers, filterStatus]);\n  \n  const originalUmrahPassengers = useMemo(() => {\n    return passengers.filter(p => (p.visa_type || "").includes("عمر") || p.travel_date);\n  }, [passengers]);`,
        `[passengers, filterStatus]);\n  \n  const originalUmrahPassengers = useMemo(() => {\n    return passengers.filter(p => (p.visa_type || "").includes("عمر") || p.travel_date);\n  }, [passengers]);`
    )
} else {
    // fallback if replacing failed
    code = code.replace(
        `[passengers]);`,
        `[passengers, filterStatus]);\n\n  const originalUmrahPassengers = useMemo(() => {\n    return passengers.filter(p => (p.visa_type || "").includes("عمر") || p.travel_date);\n  }, [passengers]);`
    );
}

// 3. Make cards clickable
code = code.replace(
    /<Card className="bg-white border-slate-200 shadow-sm">/g,
    `<Card className="bg-white border-slate-200 shadow-sm cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setFilterStatus('all')}>`
);
code = code.replace(
    /<Card className="bg-white border-slate-200 shadow-sm hover:border-red-300/g,
    `<Card className="bg-white border-slate-200 shadow-sm cursor-pointer hover:border-red-400 transition-colors" onClick={() => setFilterStatus('urgent')}`
);
code = code.replace(
    /<Card className="bg-white border-slate-200 shadow-sm hover:border-amber-300/g,
    `<Card className="bg-white border-slate-200 shadow-sm cursor-pointer hover:border-amber-400 transition-colors" onClick={() => setFilterStatus('warning')}`
);
code = code.replace(
    /<Card className="bg-white border-slate-200 shadow-sm hover:border-rose-300/g,
    `<Card className="bg-white border-slate-200 shadow-sm cursor-pointer hover:border-rose-400 transition-colors" onClick={() => setFilterStatus('overstayed')}`
);

// fix exact matches if above failed due to classname differences:
code = code.replace(
    `className="bg-white border-slate-200 shadow-sm">`,
    `className={\`bg-white border-slate-200 shadow-sm cursor-pointer hover:border-primary/40 transition-colors \${filterStatus === 'all' ? 'ring-2 ring-primary border-primary' : ''}\`} onClick={() => setFilterStatus('all')}>`
);
code = code.replace(
    `className="bg-white border-slate-200 shadow-sm hover:border-red-300 hover:shadow-md transition-all">`,
    `className={\`bg-white border-slate-200 shadow-sm hover:border-red-400 hover:shadow-md transition-all cursor-pointer \${filterStatus === 'urgent' ? 'ring-2 ring-red-500 border-red-500' : ''}\`} onClick={() => setFilterStatus('urgent')}>`
);
code = code.replace(
    `className="bg-white border-slate-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all">`,
    `className={\`bg-white border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer \${filterStatus === 'warning' ? 'ring-2 ring-amber-500 border-amber-500' : ''}\`} onClick={() => setFilterStatus('warning')}>`
);
code = code.replace(
    `className="bg-white border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-md transition-all relative overflow-hidden">`,
    `className={\`bg-white border-slate-200 shadow-sm hover:border-rose-400 hover:shadow-md transition-all cursor-pointer relative overflow-hidden \${filterStatus === 'overstayed' ? 'ring-2 ring-rose-500 border-rose-500' : ''}\`} onClick={() => setFilterStatus('overstayed')}>`
);

// Add clear filter button if filter is active
const clearFilterBtn = `{filterStatus !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setFilterStatus("all")} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs font-bold gap-1">
                  <X className="w-3.5 h-3.5" /> إلغاء التصفية
                </Button>
              )}`;
code = code.replace(
    '{/* Table actions */}',
    `${clearFilterBtn}\n              {/* Table actions */}`
);
if (!code.includes('<X ')) {
    code = code.replace("import {", "import { X,");
}

fs.writeFileSync(file, code);
