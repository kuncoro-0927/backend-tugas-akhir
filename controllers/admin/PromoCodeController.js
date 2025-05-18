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

module.exports = {
  getAllPromo,
  togglePromoStatus,
  getPromoById,
  addPromo,
  updatePromo,
};
