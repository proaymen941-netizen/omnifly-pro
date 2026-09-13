const fs = require('fs');

let code = fs.readFileSync('artifacts/pos-system/src/pages/accounting.tsx', 'utf-8');

// The error shows duplicate declarations in accounting.tsx:
// 215|    const [stmtBranch, setStmtBranch] = useState<string>("1");
// 216|    const [stmtYear, setStmtYear] = useState<string>("2026");
// 217|    const [stmtCurrency, setStmtCurrency] = useState<string>("all");
// 218|    const [stmtCostCenter, setStmtCostCenter] = useState<string>("all");
// 219|    const [stmtBranch, setStmtBranch] = useState<string>("1");
// 220|    const [stmtYear, setStmtYear] = useState<string>("2026");

const badBlock = \`const [stmtCurrency, setStmtCurrency] = useState<string>("all");
  const [stmtCostCenter, setStmtCostCenter] = useState<string>("all");
  const [stmtBranch, setStmtBranch] = useState<string>("1");
  const [stmtYear, setStmtYear] = useState<string>("2026");\`;

// Replace the first occurrence with empty string (or just replace all occurrences of this exact block except the first one)
// Alternatively, replace the duplicate variable names using a regex.
code = code.replace(/const \\[[^\\]]*\\] = useState<string>\\("all"\\);\\s*const \\[[^\\]]*\\] = useState<string>\\("all"\\);\\s*const \\[[^\\]]*\\] = useState<string>\\("1"\\);\\s*const \\[[^\\]]*\\] = useState<string>\\("2026"\\);/g, (match, offset, original) => {
  if (original.indexOf(match) === offset) {
    return match; // Keep the first one
  }
  return ''; // Remove duplicates
});

// Since the error specifically shows:
// const [stmtBranch, setStmtBranch] = useState<string>("1");
// const [stmtYear, setStmtYear] = useState<string>("2026");
// const [stmtCurrency, setStmtCurrency] = useState<string>("all");
// const [stmtCostCenter, setStmtCostCenter] = useState<string>("all");
// const [stmtBranch, setStmtBranch] = useState<string>("1");
// const [stmtYear, setStmtYear] = useState<string>("2026");
code = code.replace(/const \\[stmtBranch, setStmtBranch\\] = useState<string>\\("1"\\);\\s*const \\[stmtYear, setStmtYear\\] = useState<string>\\("2026"\\);/g, (match, offset, original) => {
  if (original.indexOf(match) === offset) {
    return match; // Keep the first one
  }
  return ''; // Remove duplicates
});

code = code.replace(/const \\[stmtCurrency, setStmtCurrency\\] = useState<string>\\("all"\\);\\s*const \\[stmtCostCenter, setStmtCostCenter\\] = useState<string>\\("all"\\);/g, (match, offset, original) => {
  if (original.indexOf(match) === offset) {
    return match; // Keep the first one
  }
  return ''; // Remove duplicates
});


fs.writeFileSync('artifacts/pos-system/src/pages/accounting.tsx', code);
console.log('Fixed duplicates');
