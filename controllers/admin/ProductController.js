const { query } = require("../../config/database");

const getAllProducts = async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.size,
        p.weight_gram,
        p.image_url,
        p.category_id,
        c.name AS category_name,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `;

    const products = await query(sql);

    return res.json(products);
  } catch (error) {
    console.error("Error getting products:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = { getAllProducts };
