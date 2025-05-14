const { query } = require("../../config/database");

// Ambil semua kategori
const getAllCategories = async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, created_at, updated_at FROM categories"
    );
    res.status(200).json({ categories: result });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal mengambil kategori", error: error.message });
  }
};

// Buat kategori baru
const createCategory = async (req, res) => {
  const { name } = req.body;

  try {
    await query(
      `INSERT INTO categories (name, created_at, updated_at)
       VALUES (?, NOW(), NOW())`,
      [name]
    );

    res.status(201).json({ msg: "Kategori berhasil ditambahkan" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal menambahkan kategori", error: error.message });
  }
};

// Update kategori berdasarkan ID
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const result = await query(
      `UPDATE categories SET name = ?, updated_at = NOW() WHERE id = ?`,
      [name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }

    res.status(200).json({ msg: "Kategori berhasil diperbarui" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal memperbarui kategori", error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const [category] = await query(
      "SELECT id, name FROM categories WHERE id = ?",
      [id]
    );

    if (!category) {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({
      msg: "Gagal mengambil detail kategori",
      error: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    // Cek apakah masih ada produk yang pakai kategori ini
    const check = await query(
      `SELECT COUNT(*) AS total FROM products WHERE category_id = ?`,
      [id]
    );

    if (check[0].total > 0) {
      return res.status(400).json({
        msg: `Kategori tidak bisa dihapus karena masih digunakan oleh ${check[0].total} produk.`,
      });
    }

    // Jika tidak ada produk yang pakai, lanjut hapus
    const result = await query(`DELETE FROM categories WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }

    res.status(200).json({ msg: "Kategori berhasil dihapus" });
  } catch (error) {
    res.status(500).json({
      msg: "Gagal menghapus kategori",
      error: error.message,
    });
  }
};

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  getCategoryById,
  deleteCategory,
};
