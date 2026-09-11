const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('artifacts/api-server/data/pos.db');

const query = `
  WITH daily_sales AS (
    SELECT 
      date(o.created_at) as shift_date,
      u.name as cashier_name,
      CASE WHEN o.payment_method = 'credit' THEN 'أجل' ELSE 'نقدي' END as sale_type,
      COUNT(o.id) as invoice_count,
      SUM(o.subtotal + o.tax) as total_sales, -- using total before discount
      SUM(o.discount) as total_discount,
      SUM(o.card_amount) as card_payments
    FROM orders o
    JOIN users u ON u.id = o.user_id
    GROUP BY date(o.created_at), u.name, CASE WHEN o.payment_method = 'credit' THEN 'أجل' ELSE 'نقدي' END
  )
  SELECT * FROM daily_sales;
`;
console.log(db.prepare(query).all());
