const midtransClient = require("midtrans-client");
const { query } = require("../../config/database");
let snap = new midtransClient.Snap({
  isProduction: false, //sandbox
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

exports.createAdminPayment = async (req, res) => {
  try {
    const {
      order_id,
      formData,
      promoCode, // pastikan ini untuk diskon promo
      selectedService,

      admin_fee,
      shipping_cost,
      customer,
    } = req.body;
    console.log(req.body);
    // Validasi wajib ada
    if (!order_id) {
      return res.status(400).json({ message: "order_id tidak boleh kosong" });
    }

    // Format item details
    let item_details = [
      ...customer.cartItems.map((item) => {
        // Log untuk setiap item dalam keranjang
        console.log(
          `Item: ${item.productName}, Price: ${item.price}, Quantity: ${item.quantity}`
        );
        return {
          id: item.productId,
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
        };
      }),
      {
        id: "ongkir",
        name: `Ongkir (${selectedService?.name || "JNE"})`,
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

    // Periksa jika ada promo dan tambahkan item diskon ke item_details
    const discountCode = promoCode?.code || null;
    const discountAmount = promoCode?.discount || 0;

    if (discountAmount > 0 && discountCode) {
      item_details.push({
        id: "promo",
        name: `Diskon ${discountCode}`,
        price: -discountAmount, // Harga negatif untuk diskon
        quantity: 1,
      });
    }

    const grossAmount = item_details.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const parameter = {
      transaction_details: {
        order_id,
        gross_amount: grossAmount, // Pastikan gross_amount sesuai dengan total item yang dihitung
      },
      item_details,
      customer_details: {
        first_name: customer.firstName,
        email: customer.email,
        phone: customer.phone || "",
        shipping_address: {
          first_name: formData.firstname,
          last_name: formData.lastname || "",
          email: customer.email,
          phone: customer.phone || "",
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal,
          country_code: "IDN",
        },
        billing_address: {
          first_name: formData.firstname,
          last_name: formData.lastname || "",
          email: customer.email,
          phone: customer.phone || "",
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal,
          country_code: "IDN",
        },
      },
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${process.env.BACKEND_URL}/admin/data/orders`,
      },
    };

    // Buat transaksi ke Midtrans
    const transaction = await snap.createTransaction(parameter);

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
    const promo = promoCode?.code || promo?.code || null;
    const discountValue = promoCode?.discount || promo?.discount || 0;

    const updateOrderPromoQuery = `
      UPDATE orders 
      SET promo_code = ?, discount_amount = ?
      WHERE order_id = ?
    `;
    await query(updateOrderPromoQuery, [promo, discountValue, order_id]);

    // res.status(200).json({ snapToken: transaction.token });
    res
      .status(200)
      .json({ redirectUrl: transaction.redirect_url, grossAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Gagal memproses pembayaran." });
  }
};
