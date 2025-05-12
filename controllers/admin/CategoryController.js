const { query } = require("../../config/database");

const getAllCategories = async (req, res) => {
  try {
    const result = await query("SELECT id, name FROM categories");
    res.status(200).json({ categories: result });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal mengambil kategori", error: error.message });
  }
};

module.exports = { getAllCategories };
