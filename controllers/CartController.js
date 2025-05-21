const { query } = require("../config/database");

// Menambahkan produk ke cart
const addToCart = async (req, res) => {
  const user_id = req.user.id;
  const { product_id, quantity, custom_width, custom_height, custom_notes } =
    req.body;
  const custom_image = req.file ? `/uploads/${req.file.filename}` : null;

  if (quantity <= 0) {
    return res.status(400).json({ msg: "Jumlah produk harus lebih dari 0" });
  }

  const is_custom = !!(
    custom_image ||
    custom_width ||
    custom_height ||
    (custom_notes && custom_notes.trim() !== "")
  );

  try {
    const product = await query("SELECT * FROM products WHERE id = ?", [
      product_id,
    ]);

    if (product.length === 0) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    let custom_price = null;

    if (is_custom) {
      const widthNum = Number(custom_width);
      const heightNum = Number(custom_height);

      if (
        widthNum > 0 &&
        heightNum > 0 &&
        product[0].width &&
        product[0].height &&
        product[0].price
      ) {
        const baseArea = product[0].width * product[0].height;
        const pricePerCm2 = product[0].price / baseArea;
        const customArea = widthNum * heightNum;
        const rawPrice = pricePerCm2 * customArea;
        custom_price = Math.round(rawPrice / 1000) * 1000;
      } else {
        custom_price = Number(product[0].price);
      }

      // Jika custom, cek duplikat berdasarkan data custom
      const existing = await query(
        `SELECT * FROM carts 
         WHERE user_id = ? AND product_id = ? AND custom_image = ? 
         AND custom_width = ? AND custom_height = ? AND custom_notes = ?`,
        [
          user_id,
          product_id,
          custom_image,
          custom_width,
          custom_height,
          custom_notes,
        ]
      );

      if (existing.length > 0) {
        const newQty = existing[0].quantity + quantity;
        await query(
          `UPDATE carts SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newQty, existing[0].id]
        );
        return res
          .status(200)
          .json({ msg: "Quantity produk diperbarui di keranjang" });
      }

      await query(
        `INSERT INTO carts 
        (user_id, product_id, quantity, custom_image, custom_width, custom_height, custom_notes, is_custom, custom_price) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          user_id,
          product_id,
          quantity,
          custom_image,
          custom_width,
          custom_height,
          custom_notes,
          custom_price,
        ]
      );
    } else {
      // Jika bukan custom, cek duplikat tanpa data custom
      const existing = await query(
        `SELECT * FROM carts WHERE user_id = ? AND product_id = ? AND is_custom = 0`,
        [user_id, product_id]
      );

      if (existing.length > 0) {
        const newQty = existing[0].quantity + quantity;
        await query(
          `UPDATE carts SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newQty, existing[0].id]
        );
        return res
          .status(200)
          .json({ msg: "Quantity produk diperbarui di keranjang" });
      }

      await query(
        `INSERT INTO carts 
        (user_id, product_id, quantity, is_custom) 
        VALUES (?, ?, ?, 0)`,
        [user_id, product_id, quantity]
      );
    }

    return res
      .status(200)
      .json({ msg: "Produk berhasil ditambahkan ke keranjang" });
  } catch (error) {
    console.error("Error addToCart:", error);
    res
      .status(500)
      .json({ msg: "Gagal menambahkan ke keranjang", error: error.message });
  }
};

const getCartItems = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await query(
      `SELECT 
        c.id,
        c.quantity, 
        c.custom_image,
        c.custom_width,
        c.custom_height,
        c.custom_notes,
           c.custom_price,
        c.is_custom,
        p.id AS product_id,
        p.name AS product_name, 
        p.weight_gram, 
        p.description, 
        p.price, 
        p.width, 
        p.height, 
        p.image_url AS product_image,
        cat.name AS category
      FROM carts c
      JOIN products p ON c.product_id = p.id
      JOIN categories cat ON p.category_id = cat.id
      WHERE c.user_id = ?`,
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
