const { query } = require("../../config/database");
const getTotalSales = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Please provide both start and end dates.",
    });
  }

  try {
    const sql = `
        SELECT 
          COUNT(DISTINCT orders.order_id) AS total_orders,
          SUM(CASE WHEN transactions.transaction_status = 'success' THEN transactions.gross_amount ELSE 0 END) AS total_sales,
           SUM(CASE WHEN transactions.transaction_status = 'success' THEN 1 ELSE 0 END) AS total_success,
          SUM(CASE WHEN transactions.transaction_status = 'pending' THEN 1 ELSE 0 END) AS total_pending,
          SUM(CASE WHEN transactions.transaction_status = 'failed' THEN 1 ELSE 0 END) AS total_failed
        FROM orders
        JOIN transactions ON orders.order_id = transactions.order_id
      WHERE DATE(CONVERT_TZ(orders.created_at, '+00:00', '+07:00')) BETWEEN ? AND ?

      `;

    const [result] = await query(sql, [startDate, endDate]);

    if (result) {
      res.json({
        success: true,
        total_orders: result.total_orders || 0,
        total_sales: result.total_sales || 0,
        total_success: result.total_success || 0,
        total_pending: result.total_pending || 0,
        total_failed: result.total_failed || 0,
      });
    } else {
      res.json({
        success: true,
        total_orders: 0,
        total_sales: 0,
        total_success: 0,
        total_pending: 0,
        total_failed: 0,
      });
    }
  } catch (error) {
    console.error("Error fetching sales and order data:", error);
    res.status(500).json({ success: false, message: "Failed to fetch data." });
  }
};
const getTodaySalesData = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const sql = `
  SELECT COUNT(DISTINCT orders.order_id) AS total_orders,
         SUM(CASE WHEN transactions.transaction_status = 'success' THEN transactions.gross_amount ELSE 0 END) AS total_sales,
         SUM(CASE WHEN transactions.transaction_status = 'success' THEN 1 ELSE 0 END) AS total_success
  FROM orders
  JOIN transactions ON orders.order_id = transactions.order_id
  WHERE transactions.transaction_status = 'success'
    AND DATE(CONVERT_TZ(orders.created_at, '+00:00', '+07:00')) = ?
`;
    const [result] = await query(sql, [today]);

    if (result) {
      res.json({
        success: true,
        total_orders: result.total_orders,
        total_sales: result.total_sales,
        total_success: result.total_success,
      });
    } else {
      res.json({
        success: true,
        total_orders: 0,
        total_sales: 0,
        total_success: 0,
      });
    }
  } catch (error) {
    console.error("Error fetching today's sales and orders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch data." });
  }
};

const getTotalAmountSuccess = async (req, res) => {
  try {
    const totalAmountQuery = `
      SELECT SUM(gross_amount) AS total_amount
      FROM transactions
      WHERE transaction_status = 'success';
    `;

    const [result] = await query(totalAmountQuery);

    const totalAmount = result.total_amount
      ? parseFloat(result.total_amount)
      : 0;

    return res.json({ totalAmount });
  } catch (error) {
    console.error("Error getting total amount:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
module.exports = { getTotalSales, getTodaySalesData, getTotalAmountSuccess };
