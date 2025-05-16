const fs = require("fs").promises;
const { query } = require("../../config/database");
const path = require("path");

const createProduct = async (req, res) => {
  const { name, description, price, category, size, weight } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await query(
      `INSERT INTO products (name, description, price, weight_gram, image_url, category_id, size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, description, price, weight, image_url, category, size]
    );

    res.status(201).json({ msg: "Produk berhasil ditambahkan", image_url });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal menambahkan produk", error: error.message });
  }
};
const getAllProducts = async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.description,
            p.status,
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

    const countSql = `SELECT COUNT(*) AS total FROM products`;

    const products = await query(sql);
    const countResult = await query(countSql);
    const totalProducts = countResult[0]?.total || 0;

    return res.json({
      total: totalProducts,
      data: products,
    });
  } catch (error) {
    console.error("Error getting products:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getTopProducts = async (req, res) => {
  try {
    const sql = `
      SELECT 
        products.id AS product_id,
        products.name AS product_name,
        categories.name AS category_name,
        products.image_url,
        COUNT(transactions.id) AS total_transactions,
        SUM(transactions.gross_amount) AS total_amount
      FROM 
        products
      JOIN 
        order_items ON products.id = order_items.product_id
      JOIN 
        transactions ON order_items.order_id = transactions.order_id
         JOIN 
          categories ON products.category_id = categories.id
      WHERE 
        transactions.transaction_status = 'success' 
      GROUP BY 
        products.id
      ORDER BY 
        total_transactions DESC
      LIMIT 3;
    `;
    const result = await query(sql);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching top product:", error);
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
};
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, size, weight } = req.body;

  try {
    // Ambil data produk lama
    const [product] = await query(
      "SELECT image_url FROM products WHERE id = ?",
      [id]
    );

    let image_url;

    if (req.file) {
      // Jika ada gambar baru, set image_url baru
      image_url = `/uploads/${req.file.filename}`;

      // Hapus gambar lama jika ada
      if (product.image_url) {
        const oldImagePath = path.join(
          __dirname,
          "../../public",
          product.image_url
        );

        // Pastikan file benar-benar ada sebelum dihapus
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else {
      // Tidak ada gambar baru, gunakan gambar lama
      image_url = product.image_url;
    }

    // Update produk
    const updateQuery = `
      UPDATE products
      SET name = ?, description = ?, price = ?, weight_gram = ?, image_url = ?, category_id = ?, size = ?, updated_at = NOW()
      WHERE id = ?
    `;

    const updateValues = [
      name,
      description,
      price,
      weight,
      image_url,
      category,
      size,
      id,
    ];

    await query(updateQuery, updateValues);

    res.status(200).json({ msg: "Produk berhasil diperbarui", image_url });
  } catch (error) {
    res.status(500).json({
      msg: "Gagal memperbarui produk",
      error: error.message,
    });
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  const { id } = req.params; // Mengambil ID produk dari URL

  try {
    // Ambil URL gambar produk sebelum dihapus
    const [product] = await query(
      "SELECT image_url FROM products WHERE id = ?",
      [id]
    );

    // Jika produk memiliki gambar, hapus gambar dari server
    if (product.image_url) {
      const imagePath = path.join(__dirname, "../../public", product.image_url);

      // Cek apakah file gambar ada sebelum dihapus
      try {
        await fs.access(imagePath); // Cek jika file ada
        await fs.unlink(imagePath); // Menghapus gambar dari server
      } catch (fileError) {
        console.warn(
          "File gambar tidak ditemukan, tidak dapat dihapus:",
          imagePath
        );
      }
    }

    // Hapus produk dari database
    await query("DELETE FROM products WHERE id = ?", [id]);

    res.status(200).json({ msg: "Produk berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus produk:", error);
    res
      .status(500)
      .json({ msg: "Gagal menghapus produk", error: error.message });
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const [product] = await query(
      "SELECT id, name, description, price, weight_gram, image_url, category_id, size FROM products WHERE id = ?",
      [id]
    );

    if (!product) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      msg: "Gagal mengambil detail produk",
      error: error.message,
    });
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil status sekarang
    const [product] = await query(`SELECT status FROM products WHERE id = ?`, [
      id,
    ]);

    if (!product) {
      return res.status(404).json({ message: "Product tidak ditemukan" });
    }

    const newStatus = product.status === "available" ? "sold" : "available";

    await query(`UPDATE products SET status = ? WHERE id = ?`, [newStatus, id]);

    return res.json({ message: "Status produk diperbarui", newStatus });
  } catch (error) {
    console.error("Error toggling produk status:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getTopProducts,
  toggleProductStatus,
};
