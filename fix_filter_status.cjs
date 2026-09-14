const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('const [filterStatus, setFilterStatus]')) {
    code = code.replace(
        'const [search, setSearch] = useState("");',
        'const [search, setSearch] = useState("");\n  const [filterStatus, setFilterStatus] = useState<"all" | "urgent" | "warning" | "overstayed" | "safe">("all");'
    );
}

fs.writeFileSync(file, code);
