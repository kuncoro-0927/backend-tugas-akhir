const { query } = require("../../config/database");
const getRecentOrders = async (req, res) => {
  try {
    const sql = `
   SELECT 
  o.order_code,
  o.shipping_method,
  o.status,
  u.name AS user_name,
  o.total_amount
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status IN ('paid', 'shipped', 'completed')
ORDER BY o.created_at DESC
LIMIT 3;


      `;

    const orders = await query(sql);

    return res.json(orders);
  } catch (error) {
    console.error("Error getting order details:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const sql = `
   SELECT 
     o.id,
  o.order_code,
  o.shipping_method,
  o.status,
  u.name AS user_name,
   u.firstname,
      u.lastname,
   u.email AS user_email,
  o.total_amount
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status IN ('paid', 'shipped', 'completed')
ORDER BY o.created_at DESC;


      `;

    const orders = await query(sql);

    return res.json(orders);
  } catch (error) {
    console.error("Error getting order details:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getAllOrderItems = async (req, res) => {
  try {
    const sql = `
      SELECT 
        oi.id,
        oi.order_id,
        o.order_code,
        oi.product_name,
        p.name,
        oi.quantity,
        oi.price,
        oi.total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN users u ON o.user_id = u.id
      JOIN products p ON oi.product_id = p.id
      
      ORDER BY oi.id DESC
    `;

    const orderItems = await query(sql);

    return res.json(orderItems);
  } catch (error) {
    console.error("Error getting order items:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAllOrderShipping = async (req, res) => {
  try {
    const sql = `
      SELECT 
        os.id,
        os.order_id,
        o.order_code,
         os.shipping_phone,
           os.city,
            os.etd,
               os.courier,
                 os.shipping_cost
       
      FROM order_shipping_details os
      JOIN orders o ON os.order_id = o.order_id
      JOIN users u ON o.user_id = u.id
    
      
      ORDER BY os.id DESC
    `;

    const orderItems = await query(sql);

    return res.json(orderItems);
  } catch (error) {
    console.error("Error getting order items:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAllTransactionOrders = async (req, res) => {
  try {
    const sql = `
      SELECT 
        t.id,
        t.order_id,
        o.order_code,
          t.transaction_id,
          t.transaction_status,
          t.gross_amount,
          t.payment_method_display
        
       
      FROM transactions t
      JOIN orders o ON t.order_id = o.order_id
      JOIN users u ON o.user_id = u.id
    
      
      ORDER BY t.id DESC
    `;

    const orderItems = await query(sql);

    return res.json(orderItems);
  } catch (error) {
    console.error("Error getting order items:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
module.exports = {
  getRecentOrders,
  getAllOrders,
  getAllOrderItems,
  getAllOrderShipping,
  getAllTransactionOrders,
};
