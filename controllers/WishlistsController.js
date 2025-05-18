const { query } = require("../config/database.js");

exports.toggleWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { productId } = req.body;

    const [exist] = await query(
      "SELECT * FROM wishlists WHERE user_id = ? AND product_id = ?",
      [user_id, productId]
    );

    if (exist) {
      await query(
        "DELETE FROM wishlists WHERE user_id = ? AND product_id = ?",
        [user_id, productId]
      );
    } else {
      await query("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", [
        user_id,
        productId,
      ]);
    }

    // ✅ ambil seluruh wishlist, bukan hanya satu item
    const wishlist = await query("SELECT * FROM wishlists WHERE user_id = ?", [
      user_id,
    ]);

    return res.json({
      message: exist
        ? "Wishlist berhasil dihapus"
        : "Berhasil menambahkan ke wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Error toggling wishlist:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;

    // Menggunakan query yang benar, hasilnya akan berupa array
    const wishlist = await query(
      `SELECT products.* FROM wishlists 
         JOIN products ON wishlists.product_id = products.id 
         WHERE wishlists.user_id = ?`,
      [user_id]
    );

    res.json(wishlist); // Mengembalikan seluruh array, bukan hanya elemen pertama
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getWishlistUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const products = await query(
      `SELECT products.* FROM wishlists 
         JOIN products ON wishlists.product_id = products.id 
         WHERE wishlists.user_id = ?`,
      [userId]
    );

    res.json(products); // hasil akan berupa array produk
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
