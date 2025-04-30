const { query } = require("../config/database.js");

exports.saveShippingDetails = async (req, res) => {
  const {
    order_id,
    firstName,
    lastName,
    phone,
    address,
    province,
    city,
    postal_code,
    shipping_method,
    courier,
    etd,
    shipping_cost,
  } = req.body;

  try {
    const sqlQuery = `
    INSERT INTO order_shipping_details (
    order_id,
      shipping_firstname,
      shipping_lastname,
      shipping_phone,
      shipping_address,
      province,
      city,
      postal_code,
      shipping_method,
      courier,
      etd,
      shipping_cost
    ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const values = [
      order_id,
      firstName,
      lastName,
      phone,
      address,
      province,
      city,
      postal_code,
      shipping_method,
      courier,
      etd,
      shipping_cost,
    ];

    // Menggunakan await untuk menunggu hasil query
    const result = await query(sqlQuery, values);
    res.status(200).json({ message: "Data pengiriman berhasil disimpan." });
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat menyimpan data pengiriman." });
  }
};
