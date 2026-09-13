const fs = require('fs');

let bookings = fs.readFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', 'utf8');

// 1. Update the airlines query
bookings = bookings.replace(
  /queryKey: \["travel-airlines-list"\],\s*queryFn: \(\) => fetchWithAuth\("\/api\/travel\/airlines"\)/g,
  `queryKey: ["travel-airlines-list"],\n    queryFn: () => fetchWithAuth("/api/travel/sub-accounts/21100")`
);

// 2. Remove quickAirlineModal state and mutation
bookings = bookings.replace(/const \[quickAirlineModal, setQuickAirlineModal\] = useState\(false\);[\s\S]*?const addAirlineMutation = useMutation\(\{[\s\S]*?\}\);/g, '');

// 3. Update initial form state
bookings = bookings.replace(
  /const \[form, setForm\] = useState\(\{[\s\S]*?\}\);/g,
  `const [form, setForm] = useState({
    booking_number: "",
    service_type: "flight",
    customer_id: "",
    passenger_id: "",
    airline_supplier: "",
    supplier_id: "",
    flight_number: "",
    origin_city: "",
    destination_city: "",
    departure_date: "",
    return_date: "",
    ticket_number: "",
    pnr: "",
    status: "confirmed",
    issue_date: new Date().toISOString().slice(0, 10),
    cost_price: "0",
    supplier_currency: "SAR",
    supplier_statement: "قيمة تذكرة طيران",
    selling_price: "0",
    customer_currency: "SAR",
    customer_statement: "قيمة تذكرة طيران",
    agency_commission: "0",
    commission_currency: "SAR",
    payment_status: "paid",
    payment_method: "cash",
    notes: ""
  });`
);

// 4. Update resetForm and handleEdit to match the new form structure
bookings = bookings.replace(
  /const resetForm = \(\) => \{[\s\S]*?setForm\(\{[\s\S]*?\}\);\s*\};/g,
  `const resetForm = () => {
    setEditingBooking(null);
    setForm({
      booking_number: \`TKT-\${new Date().getFullYear()}-\${Math.floor(1000 + Math.random() * 9000)}\`,
      service_type: "flight",
      customer_id: "",
      passenger_id: "",
      airline_supplier: "",
      supplier_id: "",
      flight_number: "",
      origin_city: "",
      destination_city: "",
      departure_date: "",
      return_date: "",
      ticket_number: "",
      pnr: "",
      status: "confirmed",
      issue_date: new Date().toISOString().slice(0, 10),
      cost_price: "0",
      supplier_currency: "SAR",
      supplier_statement: "قيمة تذكرة طيران",
      selling_price: "0",
      customer_currency: "SAR",
      customer_statement: "قيمة تذكرة طيران",
      agency_commission: "0",
      commission_currency: "SAR",
      payment_status: "paid",
      payment_method: "cash",
      notes: ""
    });
  };`
);

bookings = bookings.replace(
  /const handleEdit = \(bk: any\) => \{[\s\S]*?setForm\(\{[\s\S]*?\}\);\s*setModalOpen\(true\);\s*\};/g,
  `const handleEdit = (bk: any) => {
    setEditingBooking(bk);
    setForm({
      booking_number: bk.booking_number || "",
      service_type: bk.service_type || "flight",
      customer_id: bk.customer_id ? String(bk.customer_id) : "",
      passenger_id: bk.passenger_id ? String(bk.passenger_id) : "",
      airline_supplier: bk.airline_supplier || "",
      supplier_id: bk.supplier_id ? String(bk.supplier_id) : "",
      flight_number: bk.flight_number || "",
      origin_city: bk.origin_city || "",
      destination_city: bk.destination_city || "",
      departure_date: bk.departure_date || "",
      return_date: bk.return_date || "",
      ticket_number: bk.ticket_number || "",
      pnr: bk.pnr || "",
      status: bk.status || "confirmed",
      issue_date: bk.issue_date || new Date().toISOString().slice(0, 10),
      cost_price: String(bk.cost_price || 0),
      supplier_currency: bk.supplier_currency || "SAR",
      supplier_statement: bk.supplier_statement || "قيمة تذكرة طيران",
      selling_price: String(bk.selling_price || 0),
      customer_currency: bk.customer_currency || "SAR",
      customer_statement: bk.customer_statement || "قيمة تذكرة طيران",
      agency_commission: String(bk.agency_commission || 0),
      commission_currency: bk.commission_currency || "SAR",
      payment_status: bk.payment_status || "paid",
      payment_method: bk.payment_method || "cash",
      notes: bk.notes || ""
    });
    setModalOpen(true);
  };`
);

fs.writeFileSync('artifacts/pos-system/src/pages/travel-bookings.tsx', bookings);
