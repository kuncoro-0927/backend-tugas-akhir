const { query } = require("../../config/database");
const { database } = require("../../config/database");
const { v4: uuidv4 } = require("uuid"); // Menggunakan UUID untuk token (opsional)
const { sendShippedEmail } = require("../../services/emailService");
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

  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: Validasi produk limited
    for (const product of products) {
      const rows = await connection.query(
        "SELECT is_limited, status FROM products WHERE id = ?",
        [product.product_id]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: `Produk ID ${product.product_id} tidak ditemukan.`,
        });
      }

      const dbProduct = rows[0];

      if (dbProduct.is_limited) {
        if (dbProduct.status === "sold") {
          await connection.rollback();
          return res.status(400).json({
            message: `Produk '${product.product_name}' sudah terjual.`,
          });
        }
        if (product.quantity > product.stock) {
          await connection.rollback();
          return res.status(400).json({
            message: `Pesanan melebihi stok`,
          });
        }

        if (!product.is_limited && quantity > product.stock) {
          return res.status(400).json({
            msg: `Stok '${item.name}' hanya tersedia ${product.stock}, kamu mencoba membeli ${item.quantity}.`,
          });
        }
      }
    }

    // Step 2: Insert order
    const order_id = uuidv4();
    const order_code = generateOrderCode();
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
    await connection.query(orderSql, [
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

    // Step 3: Insert order_items
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
    await connection.query(orderItemsSql, [orderItemsValues]);

    // Step 4: Insert shipping details
    const shippingDetailsSql = `
      INSERT INTO order_shipping_details (order_id, shipping_firstname, shipping_lastname, shipping_phone, shipping_address, province, city, postal_code, courier, etd, shipping_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.query(shippingDetailsSql, [
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

    // Step 5: Update status produk limited jadi 'sold'
    // Step 5: Update status produk jadi 'sold' jika stok tersisa 1 dan berhasil dipesan
    for (const product of products) {
      // Kurangi stok dulu
      const [updateStockResult] = await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
        [product.quantity, product.product_id, product.quantity]
      );

      if (updateStockResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: `Gagal mengurangi stok untuk produk ID ${product.product_id}. Mungkin stok tidak cukup.`,
        });
      }

      // Cek apakah stok jadi 0
      const [[updatedProduct]] = await connection.query(
        "SELECT stock FROM products WHERE id = ?",
        [product.product_id]
      );

      if (updatedProduct.stock === 0) {
        await connection.query(
          "UPDATE products SET status = 'sold' WHERE id = ?",
          [product.product_id]
        );
      }
    }

    await connection.commit();

    return res.status(201).json({
      order_id: order_id,
      admin_fee: admin_fee,
      message: "Order created successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  } finally {
    connection.release();
  }
};

const getRecentOrders = async (req, res) => {
  try {
    const sql = `
   SELECT 
   o.id,
  o.order_code,
  o.status,
    o.created_at,
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
        o.total_amount,

        -- shipping details
        osd.shipping_firstname,
        osd.shipping_lastname,
        osd.shipping_phone,
        osd.shipping_address,
        osd.province,
        osd.city,
        osd.postal_code,
        osd.courier,
        osd.etd,
        osd.shipping_cost,

        -- item details digabung
        GROUP_CONCAT(
          JSON_OBJECT(
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'price', oi.price,
            'quantity', oi.quantity,
            'total', oi.total
          )
        ) AS items

      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_shipping_details osd ON o.order_id = osd.order_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id

      WHERE o.status IN ('pending', 'paid', 'shipped', 'completed')
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;

    const orders = await query(sql);

    // Ubah kolom `items` (dari string JSON) menjadi array
    const parsedOrders = orders.map((order) => ({
      ...order,
      items: order.items ? JSON.parse(`[${order.items}]`) : [],
    }));

    return res.json(parsedOrders);
  } catch (error) {
    console.error("Error getting full order data:", error);
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
    // Ambil data pesanan untuk cek status dan ambil email user
    const [order] = await query(
      `SELECT orders.status, orders.order_code, orders.invoice_url, users.email, users.name 
       FROM orders 
       JOIN users ON orders.user_id = users.id 
       WHERE orders.id = ?`,
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ error: "Pesanan tidak ditemukan" });
    }

    // Update tracking number dan status jadi 'shipped' jika status = 'paid'
    await query(
      `UPDATE orders 
       SET tracking_number = ?, status = CASE WHEN status = 'paid' THEN 'shipped' ELSE status END
       WHERE id = ?`,
      [trackingNumber, orderId]
    );

    // Jika status sebelumnya 'paid', kirim email notifikasi
    if (order.status === "paid") {
      await sendShippedEmail(
        order.email,
        order.order_code,
        order.name,
        order.invoice_url
      );
    }

    res.json({ message: "Tracking number dan status berhasil diupdate" });
  } catch (error) {
    console.error("Gagal update tracking number:", error);
    res.status(500).json({ error: "Gagal update tracking number" });
  }
};

// const updateAllOrder = async (req, res) => {
//   const { id } = req.params; // Ambil order_id dari params
//   const { status, tracking_number, promo_code, discount_amount } = req.body; // Ambil data yang diubah

//   // Validasi status (misalnya hanya 'pending', 'paid', 'shipped' yang bisa diubah)
//   const validStatuses = ["pending", "paid", "shipped", "completed"];
//   if (status && !validStatuses.includes(status)) {
//     return res
//       .status(400)
//       .json({ message: "Status yang dipilih tidak valid." });
//   }

//   try {
//     const sql = `
//   UPDATE orders
//   SET
//     status = COALESCE(?, status),
//     tracking_number = COALESCE(?, tracking_number),
//     promo_code = COALESCE(NULLIF(?, ''), promo_code),  -- ganti '' menjadi NULL
//     discount_amount = COALESCE(NULLIF(?, ''), discount_amount),
//     updated_at = NOW()
//   WHERE id = ?
// `;

//     const result = await query(sql, [
//       status,
//       tracking_number,
//       promo_code,
//       discount_amount,
//       id,
//     ]);

//     if (result.affectedRows === 0) {
//       return res
//         .status(404)
//         .json({ message: "Order tidak ditemukan atau tidak ada perubahan." });
//     }

//     return res.status(200).json({ message: "Order berhasil diperbarui." });
//   } catch (error) {
//     console.error("Error updating order:", error);
//     return res.status(500).json({
//       message: "Terjadi kesalahan pada server.",
//       error: error.message,
//     });
//   }
// };

const updateOrder = async (req, res) => {
  const { id } = req.params; // ID orders table
  const {
    status,
    tracking_number,
    promo_code,
    discount_amount,
    // Shipping detail
    shipping_firstname,
    shipping_lastname,
    shipping_phone,
    shipping_address,
    province,
    city,
    postal_code,
    courier,
    etd,
    shipping_cost,
    // Items (optional)
    items = [],
  } = req.body;

  const validStatuses = ["pending", "paid", "shipped", "completed"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Status tidak valid." });
  }

  const connection = await database.getConnection();
  await connection.beginTransaction();

  try {
    const [order] = await connection.query(
      `SELECT order_id FROM orders WHERE id = ?`,
      [id]
    );

    if (!order.length) {
      return res.status(404).json({ message: "Order tidak ditemukan." });
    }

    const orderId = order[0].order_id;

    await connection.query(
      `
      UPDATE orders SET
        status = COALESCE(?, status),
        tracking_number = COALESCE(?, tracking_number),
        promo_code = COALESCE(NULLIF(?, ''), promo_code),
        discount_amount = COALESCE(NULLIF(?, ''), discount_amount),
        updated_at = NOW()
      WHERE id = ?`,
      [status, tracking_number, promo_code, discount_amount, id]
    );

    await connection.query(
      `
      UPDATE order_shipping_details SET
        shipping_firstname = COALESCE(?, shipping_firstname),
        shipping_lastname = COALESCE(?, shipping_lastname),
        shipping_phone = COALESCE(?, shipping_phone),
        shipping_address = COALESCE(?, shipping_address),
        province = COALESCE(?, province),
        city = COALESCE(?, city),
        postal_code = COALESCE(?, postal_code),
        courier = COALESCE(?, courier),
        etd = COALESCE(?, etd),
        shipping_cost = COALESCE(?, shipping_cost)
      WHERE order_id = ?`,
      [
        shipping_firstname,
        shipping_lastname,
        shipping_phone,
        shipping_address,
        province,
        city,
        postal_code,
        courier,
        etd,
        shipping_cost,
        orderId,
      ]
    );

    if (items.length > 0) {
      await connection.query(`DELETE FROM order_items WHERE order_id = ?`, [
        orderId,
      ]);

      for (const item of items) {
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.product_id,
            item.product_name,
            item.price,
            item.quantity,
            item.total,
          ]
        );
      }
    }

    await connection.commit();
    connection.release();

    return res
      .status(200)
      .json({ message: "Order dan detail berhasil diperbarui." });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("❗ Error updating full order:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat update order.",
      error: error.message,
    });
  }
};

const getOrderById = async (req, res) => {
  const { id } = req.params; // id = integer orders.id

  try {
    // Ambil data utama order + user + shipping detail berdasarkan orders.id (integer)
    const [order] = await query(
      `SELECT 
        o.*, 
        u.name AS name,
        u.firstname AS user_firstname,
        u.lastname AS user_lastname,
        u.email AS user_email,
        u.phone AS user_phone,
        u.address AS user_address,
        s.shipping_firstname,
        s.shipping_lastname,
        s.email AS shipping_email,
        s.shipping_phone,
        s.shipping_address,
        s.province,
        s.city,
        s.postal_code,
        s.courier,
        s.etd,
        s.shipping_cost
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_shipping_details s ON o.order_id = s.order_id
      WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ msg: "Order tidak ditemukan" });
    }

    // Ambil semua item dari order_items berdasarkan order_id UUID string dari order.order_id
    const items = await query(
      `SELECT 
    oi.*, 
    p.name AS product_name,
    p.image_url AS product_image,
    c.id AS category_id,
    c.name AS category_name
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE oi.order_id = ?`,
      [order.order_id]
    );

    // Tambahkan flag apakah order boleh diedit
    order.isEditable = order.status !== "completed";

    // Gabungkan items ke dalam object utama
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error("Gagal ambil order:", error);
    res.status(500).json({
      msg: "Gagal mengambil detail order",
      error: error.message,
    });
  }
};

const deleteOrderById = async (req, res) => {
  const { id } = req.params; // ID dari tabel orders (integer)

  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();

    // Ambil order_id UUID untuk hapus anak-anaknya
    const [rows] = await connection.query(
      "SELECT order_id FROM orders WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ msg: "Order tidak ditemukan" });
    }

    const orderId = rows[0].order_id;

    // Hapus relasi anak-anak dulu
    await connection.query("DELETE FROM order_items WHERE order_id = ?", [
      orderId,
    ]);
    await connection.query(
      "DELETE FROM order_shipping_details WHERE order_id = ?",
      [orderId]
    );
    await connection.query("DELETE FROM transactions WHERE order_id = ?", [
      orderId,
    ]); // Jika ada
    // Tambahkan jika ada tabel lain yang terkait

    // Baru hapus orders
    await connection.query("DELETE FROM orders WHERE id = ?", [id]);

    await connection.commit();
    res.json({ msg: "Order berhasil dihapus" });
  } catch (error) {
    await connection.rollback();
    console.error("Gagal menghapus order:", error);
    res
      .status(500)
      .json({ msg: "Gagal menghapus order", error: error.message });
  } finally {
    connection.release();
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
  deleteOrderById,
};
