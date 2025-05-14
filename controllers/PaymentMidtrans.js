const midtransClient = require("midtrans-client");
const { query } = require("../config/database.js");
const path = require("path");
const generateInvoicePDF = require("../utils/InvoiceGenerator");
const {
  sendOrderConfirmationEmail,
} = require("../services/emailOrderSuccess.js");

let snap = new midtransClient.Snap({
  isProduction: false, //sandbox
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
  console.log("REQ BODY:", req.body);
  const cartItems = customer?.cartItems;

  if (!Array.isArray(cartItems)) {
    return res.status(400).json({
      message:
        "cartItems is required and must be an array in customer.cartItems",
    });
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

  console.log("itemDetails:", itemDetails);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseInt(item.price) * item.quantity,
    0
  );
  const shipping = parseInt(req.body.shipping_cost || 0);
  const admin = parseInt(req.body.admin_fee || 0);

  const grossAmount = itemDetails.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  try {
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
    console.log("params", paymentParams);
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
      "credit_card", // atau payment method lainnya
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

    // res.status(200).json({ snapToken: transaction.token });
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
    const transactionStatus = await snap.transaction.status(order_id);
    return res.json({
      message: "Payment verification successful",
      status: transactionStatus,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ error: "Failed to verify payment" });
  }
};

function getFormattedPaymentMethod(payment_type, bank) {
  const map = {
    bank_transfer: bank
      ? `Bank Transfer (${bank.toUpperCase()})`
      : "Bank Transfer",
    permata: "Bank Permata",
    echannel: "Bank Mandiri",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    qris: "QRIS",
    credit_card: "Credit Card",
  };

  return map[payment_type] || "Unknown";
}

exports.handlePaymentCallback = async (req, res) => {
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

  console.log("Midtrans callback payload:", req.body);
  console.log("Status transaksi:", transaction_status);
  console.log("Fraud status:", fraud_status);

  try {
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

    // Mapping payment_type ke nama bank
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

    // Cek apakah transaksi sudah ada
    const checkQuery = `SELECT COUNT(*) as count FROM transactions WHERE order_id = ?`;
    const [checkResult] = await query(checkQuery, [order_id]);

    if (checkResult.count > 0) {
      // Jika sudah ada, lakukan UPDATE
      const updateTransactionQuery = `
        UPDATE transactions SET
          transaction_id = ?,
          transaction_status = ?,
          payment_type = ?,
          gross_amount = ?,
          transaction_time = ?,
          settlement_time = ?,
          expiry_time = ?,
          status_message = ?,
          bank = ?,
          payment_method_display = ?,
          updated_at = CURRENT_TIMESTAMP()
        WHERE order_id = ?`;

      await query(updateTransactionQuery, [
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
      ]);
    } else {
      // Jika belum ada, lakukan INSERT
      const insertTransactionQuery = `
        INSERT INTO transactions (
          order_id, transaction_id, transaction_status, payment_type,
          gross_amount, transaction_time, settlement_time, expiry_time,
          status_message, bank, payment_method_display, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`;

      await query(insertTransactionQuery, [
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
      ]);
    }

    // Update status order dan kosongkan keranjang jika sukses
    if (newStatus === "success") {
      const updateOrderQuery = `
        UPDATE orders
        SET status = 'paid', updated_at = CURRENT_TIMESTAMP()
        WHERE order_id = ?`;
      await query(updateOrderQuery, [order_id]);

      // Cari user_id dari orders
      const getUserIdQuery = `SELECT user_id FROM orders WHERE order_id = ?`;
      const [orderResult] = await query(getUserIdQuery, [order_id]);

      if (orderResult && orderResult.user_id) {
        const userId = orderResult.user_id;

        // Hapus semua cart item
        const deleteCartItemsQuery = `
          DELETE FROM carts
          WHERE user_id = ?`;
        await query(deleteCartItemsQuery, [userId]);
      }

      // Generate PDF Invoice dan simpan URL-nya ke kolom invoice_url
      try {
        const pdfPath = await generateInvoicePDF(order_id);
        console.log("Invoice generated:", pdfPath);

        const fileName = path.basename(pdfPath);
        const invoiceUrl = `/invoices/${fileName}`;

        const updateInvoiceQuery = `
          UPDATE orders SET invoice_url = ?, updated_at = CURRENT_TIMESTAMP()
          WHERE order_id = ?`;

        await query(updateInvoiceQuery, [invoiceUrl, order_id]);

        console.log("Invoice URL saved:", invoiceUrl);

        // Ambil detail email dan nama user untuk dikirimkan email
        const getEmailQuery = `
          SELECT u.email, s.shipping_firstname
          FROM orders o
          JOIN users u ON o.user_id = u.id
          JOIN order_shipping_details s ON o.order_id = s.order_id
          WHERE o.order_id = ?`;
        const [emailResult] = await query(getEmailQuery, [order_id]);

        if (emailResult && emailResult.email) {
          const email = emailResult.email;
          const name = emailResult.shipping_firstname || "Pelanggan";

          // Kirim email konfirmasi
          try {
            try {
              await sendOrderConfirmationEmail(
                email,
                order_id,
                name,
                invoiceUrl
              );
              console.log("Email konfirmasi berhasil dikirim ke:", email);
            } catch (emailError) {
              console.error("Gagal mengirim email konfirmasi:", emailError);
            }
            console.log("Email konfirmasi berhasil dikirim ke:", email);
          } catch (emailError) {
            console.error("Gagal mengirim email konfirmasi:", emailError);
          }
        }
      } catch (pdfError) {
        console.error("Gagal generate invoice:", pdfError);
      }
    }

    res.status(200).json({ msg: "Payment callback processed successfully" });
  } catch (error) {
    console.error("Error processing payment callback:", error);
    return res.status(500).json({
      msg: "Gagal memproses payment callback",
      error: error.message,
    });
  }
};
