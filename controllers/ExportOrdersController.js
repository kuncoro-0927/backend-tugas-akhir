const { query } = require("../config/database");
const ExcelJS = require("exceljs");
const moment = require("moment");

const exportOrder = async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ message: "Tanggal tidak valid." });
  }

  const formattedStart = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  const formattedEnd = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");

  try {
    const rows = await query(
      `
      SELECT o.order_id, o.order_code, o.total_amount, o.status, o.created_at, o.order_source,
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

    if (orderList.length === 0) {
      return res.status(404).json({ message: "Tidak ada pesanan ditemukan." });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Orders");

    // Definisi kolom dan header
    sheet.columns = [
      { header: "Order ID", key: "order_id", width: 20 },
      { header: "Order Code", key: "order_code", width: 20 },
      { header: "Jenis Pesanan", key: "order_source", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Nama", key: "nama", width: 25 },
      { header: "Kota", key: "city", width: 20 },
      { header: "Provinsi", key: "province", width: 20 },
      { header: "Status", key: "status", width: 15 },
      {
        header: "Total (Rp)",
        key: "total_amount",
        width: 20,
        style: { numFmt: '"Rp"#,##0' },
      },
      { header: "Tanggal", key: "created_at", width: 20 },
    ];

    // Styling header
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFCCE5FF" }, // Biru muda
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Menambahkan data ke worksheet
    orderList.forEach((order) => {
      sheet.addRow({
        order_id: order.order_id,
        order_code: order.order_code,
        order_source: order.order_source,
        email: order.email,
        nama: `${order.shipping_firstname} ${order.shipping_lastname}`,
        city: order.city,
        province: order.province,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        created_at: moment(order.created_at).format("YYYY-MM-DD HH:mm"),
      });
    });

    // Tambahkan border untuk setiap sel
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Buat file bisa di-download
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
