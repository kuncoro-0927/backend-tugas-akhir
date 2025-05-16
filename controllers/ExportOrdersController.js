const { query } = require("../config/database");
const ExcelJS = require("exceljs");
const moment = require("moment");

const exportOrder = async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ message: "Tanggal tidak valid." });
  }

  // Pastikan format tanggal yang digunakan sesuai dengan format yang diterima MySQL
  const formattedStart = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  const formattedEnd = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");

  try {
    const rows = await query(
      `
      SELECT o.order_id, o.order_code, o.total_amount, o.status, o.created_at,
             u.email, s.shipping_firstname, s.shipping_lastname, s.city, s.province
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_shipping_details s ON o.order_id = s.order_id
      WHERE DATE(o.created_at) BETWEEN ? AND ?
      ORDER BY o.created_at DESC
    `,
      [formattedStart, formattedEnd]
    );

    const orderList = Array.isArray(rows) ? rows : [rows];

    // Jika tidak ada data order
    if (orderList.length === 0) {
      return res.status(404).json({ message: "Tidak ada pesanan ditemukan." });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders");

    sheet.columns = [
      { header: "Order ID", key: "order_id", width: 25 },
      { header: "Order Code", key: "order_code", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Nama", key: "nama", width: 25 },
      { header: "Kota", key: "city", width: 20 },
      { header: "Provinsi", key: "province", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Total (Rp)", key: "total_amount", width: 15 },
      { header: "Tanggal", key: "created_at", width: 20 },
    ];

    // Menambahkan data ke worksheet
    orderList.forEach((order) => {
      sheet.addRow({
        order_id: order.order_id,
        order_code: order.order_code,
        email: order.email,
        nama: `${order.shipping_firstname} ${order.shipping_lastname}`,
        city: order.city,
        province: order.province,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        created_at: moment(order.created_at).format("YYYY-MM-DD HH:mm"),
      });
    });

    // Menyediakan file Excel untuk diunduh
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=orders.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Gagal generate Excel:", err);
    res.status(500).json({ message: "Gagal generate file Excel." });
  }
};

module.exports = { exportOrder };
