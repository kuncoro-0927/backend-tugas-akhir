const { query } = require("../config/database");

// Menambahkan produk ke cart
const addToCart = async (req, res) => {
  const user_id = req.user.id;
  const { product_id, quantity, shipping_method } = req.body;

  try {
    const product = await query("SELECT * FROM products WHERE id = ?", [
      product_id,
    ]);
    if (product.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    // ✅ Cek apakah item sudah ada di cart dengan shipping method yang sama
    const existingCartItem = await query(
      "SELECT * FROM carts WHERE user_id = ? AND product_id = ? AND shipping_method = ?",
      [user_id, product_id, shipping_method]
    );

    if (existingCartItem.length > 0) {
      // ✅ Kalau sudah ada, tambahkan quantity
      await query(
        "UPDATE carts SET quantity = quantity + ? WHERE user_id = ? AND product_id = ? AND shipping_method = ?",
        [quantity, user_id, product_id, shipping_method]
      );
    } else {
      // ✅ Kalau belum ada, buat entry baru
      await query(
        "INSERT INTO carts (user_id, product_id, quantity, shipping_method) VALUES (?, ?, ?, ?)",
        [user_id, product_id, quantity, shipping_method]
      );
    }

    res.status(200).json({ msg: "Berhasil menambahkan ke keranjang" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal menambahkan ke keranjang", error: error.message });
  }
};

const getCartItems = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await query(
      `SELECT c.*, p.name AS name, p.description, p.price, p.size, p.image_url, cat.name AS category
FROM carts c
JOIN products p ON c.product_id = p.id
JOIN categories cat ON p.category_id = cat.id
WHERE c.user_id = ?
`,
      [user_id]
    );

    if (result.length === 0) {
      return res.status(200).json({ msg: "Cart kosong" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal mengambil produk dari cart", error: error.message });
  }
};

const updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  const user_id = req.user.id;
  const { id } = req.params; // ini ID dari cart item, bukan product

  try {
    const result = await query(
      "UPDATE carts SET quantity = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
      [quantity, id, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan di cart" });
    }

    return res
      .status(200)
      .json({ msg: "Jumlah produk di cart berhasil diperbarui" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal memperbarui cart", error: error.message });
  }
};

const deleteCartItem = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await query(
      "DELETE FROM carts WHERE user_id = ? AND id = ?",
      [user_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan di cart" });
    }

    return res.status(200).json({ msg: "Produk berhasil dihapus dari cart" });
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Gagal menghapus produk dari cart", error: error.message });
  }
};

const getCartByUserId = async (req, res) => {
  const user_id = req.user.id;
  console.log("User ID:", user_id);

  try {
    const result = await query(
      "SELECT COUNT(*) AS item_count FROM carts WHERE user_id = ?",
      [user_id]
    );

    if (result.length === 0) {
      return res.status(200).json({ item_count: 0 }); // Tidak ada produk di keranjang
    }

    return res.status(200).json({ item_count: result[0].item_count }); // Kembalikan jumlah produk di keranjang
  } catch (error) {
    res.status(500).json({
      msg: "Gagal mengambil jumlah item keranjang",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCartItems,
  updateCartItem,
  deleteCartItem,
  getCartByUserId,
};
