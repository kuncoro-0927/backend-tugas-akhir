const { query } = require("../../config/database");
const getAllPromo = async (req, res) => {
  try {
    const sql = `
      SELECT 
        promo.id,
        promo.code,
        promo.discount_type,
        promo.discount_value,
        promo.max_discount,
        promo.min_order,
        promo.expiry_date,
        promo.is_active
      FROM promo_codes promo
      ORDER BY promo.id DESC
    `;

    const promos = await query(sql);

    // Format expiry_date ke ISO UTC midnight agar tanggal tepat
    const formattedPromos = promos.map((promo) => {
      if (promo.expiry_date) {
        const d = new Date(promo.expiry_date);
        const utcMidnight = new Date(
          Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
        );
        promo.expiry_date = utcMidnight.toISOString();
      }
      return promo;
    });

    return res.json(formattedPromos);
  } catch (error) {
    console.error("Error getting promos:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const togglePromoStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil status sekarang
    const [promo] = await query(
      `SELECT is_active FROM promo_codes WHERE id = ?`,
      [id]
    );

    if (!promo) {
      return res.status(404).json({ message: "Promo tidak ditemukan" });
    }

    const newStatus = promo.is_active === 1 ? 0 : 1;

    await query(`UPDATE promo_codes SET is_active = ? WHERE id = ?`, [
      newStatus,
      id,
    ]);

    return res.json({ message: "Status promo diperbarui", newStatus });
  } catch (error) {
    console.error("Error toggling promo status:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// GET PROMO BY ID
const getPromoById = async (req, res) => {
  try {
    const { id } = req.params;

    const [promo] = await query(`SELECT * FROM promo_codes WHERE id = ?`, [id]);

    if (!promo) {
      return res.status(404).json({ message: "Promo tidak ditemukan" });
    }

    if (promo.expiry_date) {
      const d = new Date(promo.expiry_date);
      const utcMidnight = new Date(
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
      );
      promo.expiry_date = utcMidnight.toISOString();
    }

    return res.json(promo);
  } catch (error) {
    console.error("Error getting promo by ID:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// ADD PROMO
const addPromo = async (req, res) => {
  try {
    const {
      code,
      discount_type,
      discount_value,
      max_discount,
      min_order = 0,
      expiry_date,
      is_active = 1,
    } = req.body;

    await query(
      `INSERT INTO promo_codes 
      (code, discount_type, discount_value, max_discount, min_order, expiry_date, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        discount_type,
        discount_value,
        max_discount,
        min_order,
        expiry_date,
        is_active,
      ]
    );

    return res.status(201).json({ message: "Promo berhasil ditambahkan" });
  } catch (error) {
    console.error("Error adding promo:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// UPDATE PROMO
const updatePromo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_type,
      discount_value,
      max_discount,
      min_order = 0,
      expiry_date,
      is_active = 1,
    } = req.body;

    const [existing] = await query(`SELECT * FROM promo_codes WHERE id = ?`, [
      id,
    ]);

    if (!existing) {
      return res.status(404).json({ message: "Promo tidak ditemukan" });
    }

    await query(
      `UPDATE promo_codes 
      SET code = ?, discount_type = ?, discount_value = ?, max_discount = ?, 
          min_order = ?, expiry_date = ?, is_active = ?
      WHERE id = ?`,
      [
        code,
        discount_type,
        discount_value,
        max_discount,
        min_order,
        expiry_date,
        is_active,
        id,
      ]
    );

    return res.json({ message: "Promo berhasil diperbarui" });
  } catch (error) {
    console.error("Error updating promo:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const deletePromo = async (req, res) => {
  try {
    const { id } = req.params;

    const [promo] = await query(`SELECT * FROM promo_codes WHERE id = ?`, [id]);

    if (!promo) {
      return res.status(404).json({ message: "Promo tidak ditemukan" });
    }

    await query(`DELETE FROM promo_codes WHERE id = ?`, [id]);

    return res.json({ message: "Promo berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting promo:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await query(`
      SELECT 
        r.id, 
        r.user_id, 
        u.name AS user_name, 
        u.email, 
        p.image_url, 
        r.product_id, 
        p.name AS product_name,
        r.rating, 
        r.comment, 
        r.created_at
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE r.is_deleted = FALSE
      ORDER BY r.created_at DESC
    `);

    return res.json({ data: reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const [review] = await query(
      `
      SELECT r.id, r.user_id, u.name AS user_name, u.email, r.product_id, p.image_url, p.name AS product_name,
             r.rating, r.comment, r.created_at
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE r.id = ?
    `,
      [id]
    );

    if (!review) {
      return res.status(404).json({ message: "Review tidak ditemukan" });
    }

    return res.json({ data: review });
  } catch (error) {
    console.error("Error fetching review by ID:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await query(`SELECT * FROM reviews WHERE id = ?`, [id]);

    if (!existing) {
      return res.status(404).json({ message: "Review tidak ditemukan" });
    }

    await query(
      `
      UPDATE reviews 
      SET is_deleted = TRUE, deleted_by_admin = TRUE 
      WHERE id = ?
    `,
      [id]
    );

    return res.json({ message: "Review berhasil ditandai sebagai dihapus" });
  } catch (error) {
    console.error("Error soft deleting review:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  getAllPromo,
  togglePromoStatus,
  getPromoById,
  addPromo,
  updatePromo,
  deletePromo,
  getAllReviews,
  getReviewById,
  deleteReview,
};
