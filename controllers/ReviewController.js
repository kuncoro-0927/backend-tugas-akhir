const { query } = require("../config/database");
const path = require("path");

const getOrderedProductsByUser = async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).json({ msg: "User ID tidak ditemukan" });
  }

  try {
    const result = await query(
      `
      SELECT DISTINCT p.*, c.name AS category_name, o.created_at AS ordered_at
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.user_id = ?
        AND o.status = 'completed'
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      msg: "Gagal mengambil produk yang telah dipesan",
      error: error.message,
    });
  }
};

const addReviewForProduct = async (req, res) => {
  const userId = req.user.id;
  const { product_id, rating, comment } = req.body;

  if (!userId || !product_id || !rating) {
    return res.status(400).json({ msg: "Data tidak lengkap" });
  }

  try {
    // Cek apakah user pernah memesan produk ini sebelumnya
    const hasOrdered = await query(
      `
      SELECT 1
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE o.user_id = ? AND oi.product_id = ?
      LIMIT 1
      `,
      [userId, product_id]
    );

    if (hasOrdered.length === 0) {
      return res.status(403).json({
        msg: "Anda hanya bisa memberi review untuk produk yang telah dipesan",
      });
    }

    // Masukkan review ke database
    await query(
      `
      INSERT INTO reviews (user_id, product_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [userId, product_id, rating, comment || ""]
    );

    return res.status(201).json({ msg: "Review berhasil ditambahkan" });
  } catch (error) {
    return res.status(500).json({
      msg: "Gagal menambahkan review",
      error: error.message,
    });
  }
};

const getUserReviews = async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).json({ msg: "User ID tidak ditemukan" });
  }

  try {
    const result = await query(
      `
SELECT 
  r.*, 
  p.name AS product_name, 
  p.image_url,
  p.width,
    p.height,
  p.price,
  c.name AS category_name,
  o.created_at AS ordered_at
FROM reviews r
JOIN products p ON r.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o ON o.order_id = oi.order_id
WHERE r.user_id = ? 
  AND o.user_id = ?
  AND o.status = 'completed'
GROUP BY r.id
ORDER BY r.created_at DESC

      `,
      [userId, userId]
    );

    return res.status(200).json({ reviews: result });
  } catch (error) {
    return res.status(500).json({
      msg: "Gagal mengambil ulasan pengguna",
      error: error.message,
    });
  }
};

const getReviewsByProductId = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `
      SELECT 
        r.*, 
        u.name AS user_name 
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      `,
      [id]
    );

    return res.status(200).json({ reviews: result });
  } catch (error) {
    return res.status(500).json({
      msg: "Gagal mengambil review untuk produk ini",
      error: error.message,
    });
  }
};

module.exports = {
  getOrderedProductsByUser,
  addReviewForProduct,
  getUserReviews,
  getReviewsByProductId,
};
