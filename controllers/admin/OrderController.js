const { query } = require("../../config/database");
const { v4: uuidv4 } = require("uuid"); // Menggunakan UUID untuk token (opsional)

const generateOrderCode = () => {
  const prefix = "FZA";
  const randomNumber = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `FZA-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${randomNumber}`;
};

const createOrder = async (req, res) => {
  const {
    user_id,
    subtotal,
    shipping_fee,
    promo_code,
    discount_amount,
    products, // List of products to be added to order_items
    shipping_details, // Shipping details to be added to order_shipping_details
  } = req.body;
  console.log(shipping_details);
  try {
    // Step 1: Insert into 'orders' table
    const order_id = uuidv4(); // You should implement your order ID generator
    const order_code = generateOrderCode(); // You should implement your order code generator
    const admin_fee = 2000;

    const cleanSubtotal = Number(subtotal) || 0;
    const cleanDiscount = Number(discount_amount) || 0;
    const cleanShipping = Number(shipping_fee) || 0;

    const final_total =
      cleanSubtotal - cleanDiscount + admin_fee + cleanShipping;

    const orderSql = `
      INSERT INTO orders (order_id, user_id, subtotal, admin_fee, shipping_fee, total_amount, promo_code, discount_amount, order_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(orderSql, [
      order_id,
      user_id,

      cleanSubtotal,
      admin_fee,
      cleanShipping,
      final_total,
      promo_code || null,
      discount_amount || null,
      order_code,
    ]);

    // Step 2: Insert into 'order_items' table
    const orderItemsSql = `
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity, total)
      VALUES ?
    `;
    const orderItemsValues = products.map((product) => [
      order_id,
      product.product_id,
      product.product_name,
      product.price,
      product.quantity,
      product.total,
    ]);
    await query(orderItemsSql, [orderItemsValues]);

    // Step 3: Insert into 'order_shipping_details' table
    const shippingDetailsSql = `
      INSERT INTO order_shipping_details (order_id, shipping_firstname, shipping_lastname, shipping_phone, shipping_address, province, city, postal_code, courier, etd, shipping_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(shippingDetailsSql, [
      order_id,
      shipping_details.shipping_firstname,
      shipping_details.shipping_lastname,
      shipping_details.shipping_phone,
      shipping_details.shipping_address,
      shipping_details.province,
      shipping_details.city,
      shipping_details.postal_code,
      shipping_details.courier,
      shipping_details.etd,
      shipping_details.shipping_cost,
    ]);

    // Return success response
    return res.status(201).json({
      order_id: order_id,
      admin_fee: admin_fee,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getRecentOrders = async (req, res) => {
  try {
    const sql = `
   SELECT 
  o.order_code,
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
  o.status,
    o.tracking_number,
  u.name AS user_name,
   u.firstname,
      u.lastname,
   u.email AS user_email,
  o.total_amount
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status IN ('pending', 'paid', 'shipped', 'completed')
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

const updateTrackingNumber = async (req, res) => {
  const { orderId, trackingNumber } = req.body;

  if (!orderId || !trackingNumber) {
    return res
      .status(400)
      .json({ error: "orderId dan trackingNumber wajib diisi" });
  }

  try {
    // Update tracking number dan status jadi 'shipped' jika status saat ini 'paid'
    const result = await query(
      `UPDATE orders 
       SET tracking_number = ?, status = CASE WHEN status = 'paid' THEN 'shipped' ELSE status END
       WHERE id = ?`,
      [trackingNumber, orderId]
    );

    res.json({ message: "Tracking number dan status berhasil diupdate" });
  } catch (error) {
    console.error("Gagal update tracking number:", error);
    res.status(500).json({ error: "Gagal update tracking number" });
  }
};

const updateOrder = async (req, res) => {
  const { id } = req.params; // Ambil order_id dari params
  const { status, tracking_number, promo_code, discount_amount } = req.body; // Ambil data yang diubah

  // Validasi status (misalnya hanya 'pending', 'paid', 'shipped' yang bisa diubah)
  const validStatuses = ["pending", "paid", "shipped", "completed"];
  if (status && !validStatuses.includes(status)) {
    return res
      .status(400)
      .json({ message: "Status yang dipilih tidak valid." });
  }

  try {
    const sql = `
  UPDATE orders
  SET 
    status = COALESCE(?, status),
    tracking_number = COALESCE(?, tracking_number),
    promo_code = COALESCE(NULLIF(?, ''), promo_code),  -- ganti '' menjadi NULL
    discount_amount = COALESCE(NULLIF(?, ''), discount_amount),
    updated_at = NOW()
  WHERE id = ?
`;

    const result = await query(sql, [
      status,
      tracking_number,
      promo_code,
      discount_amount,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Order tidak ditemukan atau tidak ada perubahan." });
    }

    return res.status(200).json({ message: "Order berhasil diperbarui." });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
      error: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const [order] = await query(
      `SELECT 
        orders.*, 
        users.email AS user_email
      FROM orders 
      JOIN users ON orders.user_id = users.id 
      WHERE orders.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ msg: "Order tidak ditemukan" });
    }

    // Tambahkan flag apakah order boleh diedit
    order.isEditable = order.status !== "completed";

    res.json(order);
  } catch (error) {
    res.status(500).json({
      msg: "Gagal mengambil detail order",
      error: error.message,
    });
  }
};

module.exports = {
  getRecentOrders,
  createOrder,
  getAllOrders,
  getAllOrderItems,
  getAllOrderShipping,
  getAllTransactionOrders,
  updateTrackingNumber,
  updateOrder,
  getOrderById,
};
