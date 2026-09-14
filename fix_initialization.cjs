const fs = require('fs');
const file = 'artifacts/pos-system/src/pages/passengers.tsx';
let code = fs.readFileSync(file, 'utf-8');

const statsModalDataBlock = `
  const statsModalData = useMemo(() => {
    switch(statsModalType) {
      case "totalUmrah": return umrahPassengers;
      case "urgent": return umrahPassengers.filter(p => {
        const rem = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
        return rem !== null && rem <= 3 && rem >= 0;
      });
      case "warning": return umrahPassengers.filter(p => {
        const rem = p.remaining_days !== null && p.remaining_days !== undefined ? Number(p.remaining_days) : null;
        return rem !== null && rem > 3 && rem <= 10;
      });
      case "totalPassengers": return passengers;
      default: return [];
    }
  }, [statsModalType, umrahPassengers, passengers]);
`;

code = code.replace(statsModalDataBlock, '');

// Now we need to insert it after umrahPassengers definition.
// Find `const umrahPassengers = useMemo(() => { ... }, [passengers, filterStatus]);`
// We can insert it before `const stats = useMemo(() => {`

code = code.replace(
  '  const stats = useMemo(() => {',
  statsModalDataBlock.trim() + '\n\n  const stats = useMemo(() => {'
);

fs.writeFileSync(file, code);
