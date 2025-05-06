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

    const promo = await query(sql);

    return res.json(promo);
  } catch (error) {
    console.error("Error getting users:", error);
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

module.exports = { getAllPromo, togglePromoStatus };
