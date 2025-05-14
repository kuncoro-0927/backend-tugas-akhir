const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const generateInvoiceHTML = require("../utils/InvoiceTemplate");
const { query } = require("../config/database");

exports.generateInvoice = async (req, res) => {
  const { orderId } = req.params;

  try {
    // 1. Ambil data pesanan dari DB
    const [orderData] = await query(
      `SELECT 
           o.*, 
           u.name AS user_name, 
           u.email AS user_email, 
           u.phone AS user_phone, 
            u.postal_code AS user_postal_code, 
        u.city AS user_city, 
           u.address AS user_address
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.order_id = ?`,
      [orderId]
    );

    if (!orderData) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    console.log("Order Data:", orderData);

    // 2. Ambil semua item pesanan dari DB (pastikan mengembalikan lebih dari satu jika ada)
    const orderItems = await query(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    const orderDetailsResult = await query(
      `SELECT * FROM order_shipping_details WHERE order_id = ?`,
      [orderId]
    );
    const orderDetails = orderDetailsResult[0]; // Ambil object pertama

    const transactionDetailsResult = await query(
      `SELECT * FROM transactions WHERE order_id = ?`,
      [orderId]
    );

    const transactionDetails = transactionDetailsResult[0];

    console.log("Order Items:", orderItems); // Debug untuk melihat seluruh order items
    console.log("Order details:", orderDetails);
    console.log("Transaction details:", transactionDetails);
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(404).json({ message: "Item pesanan tidak ditemukan" });
    }

    // 3. Format data untuk invoice
    const order = {
      invoiceNumber: orderData.order_id,
      createdAt: orderData.created_at,
      shippingEmail: orderDetails.email,
      customerName: `${orderDetails.shipping_firstname} ${orderDetails.shipping_lastname}`,
      shippingAddress: orderDetails.shipping_address,
      shippingPhone: orderDetails.shipping_phone,
      shippingProvince: orderDetails.province,
      shippingCity: orderDetails.city,
      shippingPostalCode: orderDetails.postal_code,
      shippingCourier: orderDetails.courier,
      shippingEtd: orderDetails.etd,

      name: orderData.user_name,
      email: orderData.user_email,
      city: orderData.user_city,
      postalCode: orderData.user_postal_code,
      phone: orderData.user_phone,
      payment: transactionDetails.payment_method_display,
      items: orderItems.map((item) => ({
        name: item.product_name,
        qty: item.quantity,
        price: item.price,
      })),
      subtotal: orderData.subtotal,
      shippingCost: orderDetails.shipping_cost,
      promo: orderData.discount_amount,
      adminFee: orderData.admin_fee,
      total: orderData.total_amount,
    };

    // 4. Generate HTML dari template invoice
    const html = generateInvoiceHTML(order);

    // 5. Konversi HTML ke PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const fileName = `invoice-${orderId}.pdf`;
    const filePath = path.join(__dirname, "..", "invoices", fileName);
    await page.pdf({ path: filePath, format: "A4" });

    await browser.close();

    // 6. Simpan URL ke database
    const invoiceUrl = `/invoices/${fileName}`;
    await query(`UPDATE orders SET invoice_url = ? WHERE order_id = ?`, [
      invoiceUrl,
      orderId,
    ]);

    // 7. Mengirimkan URL invoice sebagai respons
    res.json({ success: true, invoiceUrl });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Gagal generate invoice", error: err.message });
  }
};
