const midtransClient = require("midtrans-client");
const { query } = require("../config/database.js");

let snap = new midtransClient.Snap({
  isProduction: false, //sandbox
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

exports.processPayment = async (req, res) => {
  const { order_id, total_amount, customer } = req.body;

  try {
    const paymentParams = {
      transaction_details: {
        order_id,
        gross_amount: total_amount,
      },
      customer_details: {
        first_name: customer.firstName,
        email: customer.email,
        phone: customer.phone,
      },
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/success/${order_id}`,
      },
    };

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
      total_amount,
      "credit_card", // atau payment method lainnya
      "Menunggu pembayaran",
      transaction.redirect_url,
    ]);

    // res.status(200).json({ snapToken: transaction.token });
    res.status(200).json({ redirectUrl: transaction.redirect_url });
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
        bank = ?, -- pastikan kolom bank sudah ada di tabel transactions
        payment_method_display = ?, -- kolom untuk menyimpan display format
        updated_at = CURRENT_TIMESTAMP()
      WHERE order_id = ?
    `;

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

    // Update status juga di tabel orders jika status sukses
    // Update status juga di tabel orders jika status sukses
    if (newStatus === "success") {
      const updateOrderQuery = `
    UPDATE orders
    SET status = 'paid', updated_at = CURRENT_TIMESTAMP()
    WHERE order_id = ?
  `;
      await query(updateOrderQuery, [order_id]);

      // --- Cari user_id dari orders ---
      const getUserIdQuery = `SELECT user_id FROM orders WHERE order_id = ?`;
      const [orderResult] = await query(getUserIdQuery, [order_id]);

      if (orderResult && orderResult.user_id) {
        const userId = orderResult.user_id;

        // --- Hapus semua cart item untuk user ini ---
        const deleteCartItemsQuery = `
      DELETE FROM carts
      WHERE user_id = ?
    `;
        await query(deleteCartItemsQuery, [userId]);
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
