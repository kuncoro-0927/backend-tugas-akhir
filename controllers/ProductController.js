const { query } = require("../config/database");

// READ ALL
const getAllProducts = async (req, res) => {
  try {
    const result = await query(`
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
    `);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      msg: "Gagal mengambil produk",
      error: error.message,
    });
  }
};

// READ BY ID
const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT 
         p.*, 
         c.name AS category 
       FROM products p 
       JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    return res.status(200).json({ data: result[0] });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "Gagal mengambil detail produk", error: error.message });
  }
};

// UPDATE
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image_url, category, size, stock } =
    req.body;

  try {
    await query(
      `UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, category = ?, size = ?, stock = ?, updated_at = NOW()
         WHERE id = ?`,
      [name, description, price, image_url, category, size, stock, id]
    );

    return res.status(200).json({ msg: "Produk berhasil diperbarui" });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "Gagal memperbarui produk", error: error.message });
  }
};

// DELETE
const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await query("DELETE FROM products WHERE id = ?", [id]);

    return res.status(200).json({ msg: "Produk berhasil dihapus" });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "Gagal menghapus produk", error: error.message });
  }
};

const getFilteredProducts = async (req, res) => {
  const { category, size, min_price, max_price } = req.query;

  let sql = `SELECT * FROM products WHERE 1=1`;
  const params = [];

  let categoryId = null;

  try {
    // Cari ID kategori berdasarkan nama
    if (category) {
      const categoryResult = await query(
        `SELECT id FROM categories WHERE name = ?`,
        [category]
      );

      if (categoryResult.length === 0) {
        return res.status(200).json({ data: [] }); // kategori ga ditemukan
      }

      categoryId = categoryResult[0].id;
      sql += ` AND category_id = ?`;
      params.push(categoryId);
    }

    if (size) {
      sql += ` AND size = ?`;
      params.push(size);
    }

    if (min_price && max_price) {
      sql += ` AND price BETWEEN ? AND ?`;
      params.push(min_price, max_price);
    }

    const result = await query(sql, params);
    res.status(200).json({ data: result });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal mengambil data produk", error: error.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const result = await query("SELECT * FROM categories ORDER BY name ASC");
    res.status(200).json(result);
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal mengambil data kategori", error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getFilteredProducts,
  getAllCategories,
};
