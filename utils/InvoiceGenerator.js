const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const generateInvoiceHTML = require("./InvoiceTemplate");
const { query } = require("../config/database");

async function generateInvoicePDF(orderId) {
  const [orderData] = await query(
    `SELECT 
      o.*, u.name AS user_name, u.email AS user_email, 
      u.phone AS user_phone, u.postal_code AS user_postal_code, 
      u.city AS user_city, u.address AS user_address
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.order_id = ?`,
    [orderId]
  );

  if (!orderData) throw new Error("Pesanan tidak ditemukan");

  const orderItems = await query(
    `SELECT * FROM order_items WHERE order_id = ?`,
    [orderId]
  );

  const [shippingDetails] = await query(
    `SELECT * FROM order_shipping_details WHERE order_id = ?`,
    [orderId]
  );

  const [transaction] = await query(
    `SELECT * FROM transactions WHERE order_id = ?`,
    [orderId]
  );

  const order = {
    invoiceNumber: orderData.order_code,
    createdAt: orderData.created_at,
    shippingEmail: shippingDetails.email,
    customerName: `${shippingDetails.shipping_firstname} ${shippingDetails.shipping_lastname}`,
    shippingAddress: shippingDetails.shipping_address,
    shippingPhone: shippingDetails.shipping_phone,
    shippingProvince: shippingDetails.province,
    shippingCity: shippingDetails.city,
    shippingPostalCode: shippingDetails.postal_code,
    shippingCourier: shippingDetails.courier,
    shippingEtd: shippingDetails.etd,

    name: orderData.user_name,
    email: orderData.user_email,
    city: orderData.user_city,
    postalCode: orderData.user_postal_code,
    phone: orderData.user_phone,
    payment: transaction.payment_method_display,
    items: orderItems.map((item) => ({
      name: item.product_name,
      qty: item.quantity,
      price: item.price,
    })),
    subtotal: orderData.subtotal,
    shippingCost: shippingDetails.shipping_cost,
    promo: orderData.discount_amount,
    adminFee: orderData.admin_fee,
    total: orderData.total_amount,
  };

  const htmlContent = generateInvoiceHTML(order);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfPath = path.resolve(__dirname, `../invoices/invoice-${orderId}.pdf`);
  await page.pdf({ path: pdfPath, format: "A4" });

  await browser.close();
  return pdfPath;
}

module.exports = generateInvoicePDF;
