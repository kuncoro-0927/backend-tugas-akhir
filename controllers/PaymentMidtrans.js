const midtransClient = require("midtrans-client");
const { query, database } = require("../config/database.js");
const { createNotification } = require("../controllers/admin/Notification.js");

const path = require("path");
const generateInvoicePDF = require("../utils/InvoiceGenerator");
const {
  sendOrderConfirmationEmail,
  sendAdminNotificationEmail,
} = require("../services/emailOrderSuccess.js");

let snap = new midtransClient.Snap({
  isProduction: false, //sandbox
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

exports.processPayment = async (req, res) => {
  const {
    order_id,
    total_amount,
    customer,
    shipping_cost,
    selectedService,
    admin_fee,
    promo,
    promocode,
  } = req.body;

  const cartItems = customer?.cartItems;

  if (!Array.isArray(cartItems)) {
    return res.status(400).json({
      message:
        "cartItems is required and must be an array in customer.cartItems",
    });
  }

  try {
    for (const item of cartItems) {
      const productRows = await query(
        `SELECT id, is_limited,name, status FROM products WHERE id = ?`,
        [item.productId]
      );

      const product = productRows[0];

      if (!product) {
        return res.status(400).json({
          message: `Produk dengan ID ${item.productId} tidak ditemukan.`,
        });
      }

      if (product.status === "sold") {
        return res.status(400).json({
          message: `Produk '${item.productName}' sudah terjual.`,
        });
      }

      if (product.is_limited && item.quantity > product.stock) {
        return res.status(400).json({
          message: `Produk '${item.productName}' Pesanan Anda melebihi stok`,
        });
      }
      if (!product.is_limited && item.quantity > product.stock) {
        return res.status(400).json({
          msg: `Stok '${item.name}' hanya tersedia ${product.stock}, kamu mencoba membeli ${item.quantity}.`,
        });
      }
    }

    const itemDetails = [
      ...cartItems.map((item) => ({
        id: item.productId,
        name: item.productName,
        price: parseInt(item.price),
        quantity: item.quantity,
      })),
      {
        id: "ongkir",
        name: `Ongkir (${selectedService?.name})`,
        price: shipping_cost,
        quantity: 1,
      },
      {
        id: "admin_fee",
        name: "Biaya Admin",
        price: admin_fee,
        quantity: 1,
      },
    ];

    const discountCode = promocode?.code || promo?.code;
    const discountAmount = promocode?.discount || promo?.discount || 0;

    if (discountAmount > 0 && discountCode) {
      itemDetails.push({
        id: "promo",
        name: `Diskon ${discountCode}`,
        price: -discountAmount,
        quantity: 1,
      });
    }

    const grossAmount = itemDetails.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const paymentParams = {
      transaction_details: {
        order_id,
        gross_amount: grossAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: customer.firstName,
        email: customer.email,
        phone: customer.phone,
        billing_address: {
          first_name: customer.firstName,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          postal_code: customer.postalCode,
          country_code: "IDN",
        },
        shipping_address: {
          first_name: customer.firstName,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          city: customer.city,
          postal_code: customer.postalCode,
          country_code: "IDN",
        },
      },
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/success/${order_id}`,
      },
    };
    console.log("itemDetails:", itemDetails);
    console.log("grossAmount:", grossAmount);

    const transaction = await snap.createTransaction(paymentParams);

    const insertQuery = `
      INSERT INTO transactions (
        order_id, 
        payment_token, 
        transaction_status, 
        gross_amount, 
        payment_type, 
        status_message, 
        redirect_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        payment_token = VALUES(payment_token),
        transaction_status = VALUES(transaction_status),
        gross_amount = VALUES(gross_amount),
        payment_type = VALUES(payment_type),
        status_message = VALUES(status_message),
        redirect_url = VALUES(redirect_url),
        updated_at = CURRENT_TIMESTAMP()
    `;

    await query(insertQuery, [
      order_id,
      transaction.token,
      "pending",
      grossAmount,
      "credit_card",
      "Menunggu pembayaran",
      transaction.redirect_url,
    ]);

    const promoCode = promocode?.code || promo?.code || null;
    const discountValue = promocode?.discount || promo?.discount || 0;

    const updateOrderPromoQuery = `
      UPDATE orders 
      SET promo_code = ?, discount_amount = ?
      WHERE order_id = ?
    `;
    await query(updateOrderPromoQuery, [promoCode, discountValue, order_id]);

    res
      .status(200)
      .json({ redirectUrl: transaction.redirect_url, grossAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Gagal memproses pembayaran." });
  }
};

exports.verifyPayment = async (req, res) => {
  const { order_id } = req.params;

  try {
    const transactionStatus = await coreApi.transaction.status(order_id);

    return res.json({
      message: "Payment verification successful",
      status: transactionStatus,
    });
  } catch (error) {
    console.error(
      "Error verifying payment:",
      error?.message,
      error?.ApiResponse
    );
    if (error?.httpStatusCode === 404) {
      return res
        .status(404)
        .json({ error: "Transaction not found in Midtrans" });
    }
    return res.status(500).json({ error: "Failed to verify payment" });
  }
};

exports.handlePaymentCallback = async (req, res) => {
  const io = req.app.get("io");
  const {
    order_id,
    transaction_status,
    fraud_status,
    payment_type,
    transaction_time,
    settlement_time,
    expiry_time,
    status_message,
    transaction_id,
    gross_amount,
  } = req.body;

  if (!order_id || !transaction_status) {
    return res
      .status(400)
      .json({ msg: "Order ID atau status transaksi tidak ditemukan" });
  }

  let newStatus = "";

  if (transaction_status === "capture" && fraud_status === "accept") {
    newStatus = "success";
  } else if (transaction_status === "settlement") {
    newStatus = "success";
  } else if (transaction_status === "pending") {
    newStatus = "pending";
  } else if (["deny", "expire", "cancel"].includes(transaction_status)) {
    newStatus = "failed";
  }

  const paymentTypeToBank = {
    permata: "Permata",
    echannel: "Mandiri",
    qris: "QRIS",
    gopay: "Gopay",
    shopeepay: "ShopeePay",
  };

  let bank = null;
  let payment_method_display = null;

  if (payment_type === "bank_transfer") {
    bank = req.body.va_numbers?.[0]?.bank || null;
    payment_method_display = bank
      ? `Bank Transfer (${bank.toUpperCase()})`
      : "Bank Transfer";
  } else {
    bank = paymentTypeToBank[payment_type] || null;
    payment_method_display = bank || "Unknown";
  }

  const connection = await database.getConnection(); // Ambil koneksi manual untuk transaksi

  try {
    await connection.beginTransaction();

    // cek order_id ada di orders
    const [orderRows] = await connection.query(
      `SELECT order_id FROM orders WHERE order_id = ?`,
      [order_id]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      connection.release();
      console.error(
        `Order dengan order_id ${order_id} tidak ditemukan di tabel orders`
      );
      return res.status(400).json({ msg: "Order tidak ditemukan" });
    }

    // cek transaksi
    const [checkResult] = await connection.query(
      `SELECT COUNT(*) as count FROM transactions WHERE order_id = ?`,
      [order_id]
    );

    if (checkResult[0].count > 0) {
      await connection.query(
        `UPDATE transactions SET
          transaction_id = ?, transaction_status = ?, payment_type = ?,
          gross_amount = ?, transaction_time = ?, settlement_time = ?,
          expiry_time = ?, status_message = ?, bank = ?, payment_method_display = ?,
          updated_at = CURRENT_TIMESTAMP()
        WHERE order_id = ?`,
        [
          transaction_id,
          newStatus,
          payment_type || null,
          gross_amount,
          transaction_time || null,
          settlement_time || null,
          expiry_time || null,
          status_message || null,
          bank,
          payment_method_display,
          order_id,
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO transactions (
          order_id, transaction_id, transaction_status, payment_type,
          gross_amount, transaction_time, settlement_time, expiry_time,
          status_message, bank, payment_method_display, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
        [
          order_id,
          transaction_id,
          newStatus,
          payment_type || null,
          gross_amount,
          transaction_time || null,
          settlement_time || null,
          expiry_time || null,
          status_message || null,
          bank,
          payment_method_display,
        ]
      );
    }

    // Jika transaksi sukses, update order dan stok
    if (newStatus === "success") {
      await connection.query(
        `UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP() WHERE order_id = ?`,
        [order_id]
      );

      const orderItems = await connection.query(
        `SELECT oi.product_id, oi.quantity, p.is_limited
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order_id]
      );

      for (const item of orderItems[0]) {
        const result = await connection.query(
          `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
          [item.quantity, item.product_id, item.quantity]
        );

        if (result[0].affectedRows === 0) {
          console.warn(
            `Stok tidak dikurangi untuk produk ID ${item.product_id}`
          );
        }

        // Update status jadi sold jika limited dan stok habis
        const [[product]] = await connection.query(
          `SELECT is_limited, stock FROM products WHERE id = ?`,
          [item.product_id]
        );

        if (product.is_limited === 1 && product.stock === 0) {
          await connection.query(
            `UPDATE products SET status = 'sold', updated_at = CURRENT_TIMESTAMP() WHERE id = ?`,
            [item.product_id]
          );
        }
        if (product.is_limited === 0 && product.stock === 0) {
          await connection.query(
            `UPDATE products SET status = 'sold', updated_at = CURRENT_TIMESTAMP() WHERE id = ?`,
            [item.product_id]
          );
        }
      }

      // Hapus cart user
      const [[orderUser]] = await connection.query(
        `SELECT user_id FROM orders WHERE order_id = ?`,
        [order_id]
      );

      if (orderUser?.user_id) {
        await connection.query(`DELETE FROM carts WHERE user_id = ?`, [
          orderUser.user_id,
        ]);
      }

      try {
        await connection.query(
          `INSERT INTO notifications 
        (user_id, order_id, title, message, type, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            orderUser.user_id || 0,
            order_id,
            "Pesanan Baru Dibayar",
            `Pesanan dengan ID ${order_id} telah berhasil dibayar.`,
            "order",
          ]
        );
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi:", notifErr);
        // Jangan throw, biarkan transaksi tetap commit
      }

      io.to("admin").emit("newNotification", {
        title: "Pesanan Baru Dibayar",
        message: `Pesanan dengan ID ${order_id} telah berhasil dibayar.`,
        type: "order",
        order_id,
      });

      // Generate PDF invoice
      try {
        const pdfPath = await generateInvoicePDF(order_id);
        const fileName = path.basename(pdfPath);
        const invoiceUrl = `/invoices/${fileName}`;

        await connection.query(
          `UPDATE orders SET invoice_url = ?, updated_at = CURRENT_TIMESTAMP() WHERE order_id = ?`,
          [invoiceUrl, order_id]
        );

        // Ambil email dan nama user
        const [[userResult]] = await connection.query(
          `SELECT u.email, s.shipping_firstname
           FROM orders o
           JOIN users u ON o.user_id = u.id
           JOIN order_shipping_details s ON o.order_id = s.order_id
           WHERE o.order_id = ?`,
          [order_id]
        );

        if (userResult?.email) {
          const email = userResult.email;
          const name = userResult.shipping_firstname || "Pelanggan";
          try {
            await sendOrderConfirmationEmail(email, order_id, name, invoiceUrl);
          } catch (emailErr) {
            console.error("Gagal mengirim email:", emailErr);
          }
          try {
            await sendAdminNotificationEmail(
              order_id,
              name,
              gross_amount,
              invoiceUrl
            );
          } catch (adminEmailErr) {
            console.error("Gagal mengirim email ke admin:", adminEmailErr);
          }
        }
      } catch (pdfErr) {
        console.error("Gagal generate invoice:", pdfErr);
      }
    }

    await connection.commit();
    res.status(200).json({ msg: "Payment callback processed successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error processing payment callback:", error);
    res.status(500).json({
      msg: "Gagal memproses payment callback",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
