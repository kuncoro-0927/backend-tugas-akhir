const { query } = require("../config/database.js");
const { v4: uuidv4 } = require("uuid"); // Menggunakan UUID untuk token (opsional)

const proceedToCheckout = async (req, res) => {
  const user_id = req.user.id;
  const { shipping_method } = req.body;
  const cartItems = req.body.items;
  console.log(shipping_method);
  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ msg: "Keranjang Anda kosong" });
  }

  try {
    // Hitung subtotal dari semua item
    const subtotal = cartItems.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    const admin_fee = shipping_method === "delivery" ? 2000 : 0;
    const shipping_fee = shipping_method === "delivery" ? 0 : 0;

    const totalAmount = subtotal + admin_fee + shipping_fee;
    const generateTicketCode = () => {
      const prefix = "FZA";
      const randomNumber = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
      return `FZA-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${randomNumber}`;
    };
    const orderId = uuidv4();
    const orderCode = generateTicketCode();
    await query(
      `INSERT INTO orders (order_id, order_code, user_id, shipping_method, subtotal, admin_fee, shipping_fee, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)`,
      [
        orderId,
        orderCode,
        user_id,
        shipping_method,
        subtotal,
        admin_fee,
        shipping_fee,
        totalAmount,
        "pending",
      ]
    );

    const orderItemsPromises = cartItems.map((item) => {
      return query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.name,
          item.price,
          item.quantity,
          item.price * item.quantity,
        ]
      );
    });

    await Promise.all(orderItemsPromises);

    // await query(`DELETE FROM carts WHERE user_id = ?`, [user_id]);

    res.status(200).json({
      msg: "Pesanan berhasil dibuat!",
      order_id: orderId,
      status: "pending",
      subtotal,
      admin_fee,
      shipping_fee,
      total_amount: totalAmount,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ msg: "Gagal melanjutkan pembayaran", error: error.message });
  }
};

const getOrderDetails = async (req, res) => {
  const { orderId } = req.params;

  try {
    // Ambil data pesanan berdasarkan orderId
    const [order] = await query(`SELECT * FROM orders WHERE order_id = ?`, [
      orderId,
    ]);

    if (!order) {
      return res.status(404).json({ msg: "Pesanan tidak ditemukan" });
    }

    // Ambil data item pesanan
    const orderItems = await query(
      `SELECT 
         oi.product_id, 
         oi.product_name, 
         oi.price, 
         p.weight_gram, 
           p.size, 
         oi.quantity, 
         oi.total, 
         p.image_url,
         c.name AS category
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    console.log(orderItems);
    // Kembalikan data pesanan dan item produk
    res.status(200).json({ order, items: orderItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Gagal mengambil detail pesanan" });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, shipping_fee, total_amount } = req.body;

  try {
    const sql = `
      UPDATE orders
      SET status = ?, 
          shipping_fee = ?, 
          total_amount = ?, 
          updated_at = CURRENT_TIMESTAMP()
      WHERE order_id = ?
    `;

    await query(sql, [status, shipping_fee, total_amount, orderId]);

    res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserOrdersWithDetails = async (req, res) => {
  const userId = req.user.id;

  try {
    const orders = await query(
      `SELECT * FROM orders WHERE user_id = ? AND status IN ('paid', 'shipped', 'completed') ORDER BY created_at DESC`,
      [userId]
    );

    const fullOrders = await Promise.all(
      orders.map(async (order) => {
        const items = await query(
          `SELECT 
            oi.*, 
            p.image_url, 
            p.category_id, 
            p.size, 
            p.price, 
            c.name AS category_name
          FROM 
            order_items oi
          JOIN 
            products p ON oi.product_id = p.id
          JOIN 
            categories c ON p.category_id = c.id
          WHERE 
            order_id = ?`,
          [order.order_id]
        );

        const [shipping] = await query(
          `SELECT * FROM order_shipping_details WHERE order_id = ?`,
          [order.order_id]
        );
        const [transaction] = await query(
          `SELECT * FROM transactions WHERE order_id = ?`,
          [order.order_id]
        );

        return {
          ...order,
          items,
          shipping,
          transaction,
        };
      })
    );

    res.status(200).json(fullOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Gagal mengambil pesanan" });
  }
};

module.exports = {
  proceedToCheckout,
  getOrderDetails,
  updateOrderStatus,
  getUserOrdersWithDetails,
};
