const { query } = require("../config/database");

const checkPromo = async (req, res) => {
  const { code, total } = req.body;
  const formatToIDR = (amount) => {
    return `IDR ${Number(amount).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const parsedTotal = parseInt(total);
  if (isNaN(parsedTotal)) {
    return res.status(400).json({ error: "Total order tidak valid" });
  }

  try {
    const [promo] = await query(
      `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1`,
      [code]
    );

    if (!promo) {
      return res.status(404).json({ error: "Kode promo tidak ditemukan" });
    }

    if (new Date(promo.expiry_date) < new Date()) {
      return res.status(400).json({ error: "Kode promo sudah kadaluarsa" });
    }
    if (promo.min_order && total < Number(promo.min_order)) {
      const formattedMinOrder = formatToIDR(promo.min_order);

      return res
        .status(400)
        .json({ error: `Minimal pesanan ${formattedMinOrder}` });
    }

    let discount = 0;
    if (promo.discount_type === "percentage") {
      discount = (promo.discount_value / 100) * total;
      if (promo.max_discount) discount = Math.min(discount, promo.max_discount);
    } else if (promo.discount_type === "fixed") {
      discount = promo.discount_value;
    }

    discount = Math.round(discount);

    return res.status(200).json({
      valid: true,
      code: promo.code,
      discount,
      total_after_discount: total - discount,
    });
  } catch (error) {
    console.error("Error checking promo:", error);
    res.status(500).json({ error: "Gagal mengecek kode promo" });
  }
};

module.exports = { checkPromo };
