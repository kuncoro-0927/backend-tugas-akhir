const { query } = require("../../config/database");

// Ambil notifikasi untuk dropdown
const getNotifications = async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        n.*, 
        u.name, 
        u.firstname, 
        u.lastname 
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
      LIMIT 20
    `);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Gagal mengambil notifikasi:", error);
    res.status(500).json({ message: "Gagal mengambil notifikasi" });
  }
};

// Tambah notifikasi (untuk dipanggil dari controller lain)
const createNotification = async (
  req,
  user_id,
  order_id,
  title,
  message,
  type
) => {
  const io = req.app.get("io");
  try {
    const result = await query(
      `INSERT INTO notifications (user_id,order_id, title, message, type, created_at) VALUES (?, ?, ?, ?,?, NOW())`,
      [user_id, order_id, title, message, type]
    );

    const newNotif = {
      id: result.insertId,
      user_id,
      order_id,
      title,
      message,
      type,
      created_at: new Date(),
    };

    io.emit("newNotification", newNotif);
  } catch (error) {
    console.error("Gagal membuat notifikasi:", error);
  }
};

// Jika controller ini juga mengatur promo, gabungkan ekspornya:
module.exports = {
  getNotifications,
  createNotification,
};
