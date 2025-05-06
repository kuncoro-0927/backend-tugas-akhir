const axios = require("axios");
const FormData = require("form-data");
const { query } = require("../config/database.js"); // Sesuaikan dengan path file database.js
const API_KEY = process.env.RAJAONGKIR_API_KEY; // API key dari environment

// Fungsi untuk memeriksa status pengiriman dan memperbarui status order
const trackOrders = async () => {
  try {
    // Ambil semua order yang statusnya "shipped" dan memiliki tracking_number
    const orders = await query(
      "SELECT order_code, tracking_number FROM orders WHERE status = 'shipped' AND tracking_number IS NOT NULL"
    );

    // Periksa status pengiriman untuk setiap order
    for (let order of orders) {
      const { order_code, tracking_number } = order;

      // Kirim request ke API RajaOngkir untuk melacak status pengiriman
      const form = new FormData();
      form.append("awb", tracking_number);
      form.append("courier", "jne");

      const response = await axios.post(
        "https://rajaongkir.komerce.id/api/v1/track/waybill",
        form,
        {
          headers: {
            ...form.getHeaders(),
            key: API_KEY,
          },
        }
      );

      // Cek apakah status pengiriman sudah "DELIVERED"
      if (response.data.data.delivery_status.status === "DELIVERED") {
        // Update status order menjadi "completed"
        await query(
          "UPDATE orders SET status = 'completed' WHERE order_code = ?",
          [order_code]
        );
        console.log(`Order ${order_code} updated to 'completed'`);
      }
    }
  } catch (error) {
    console.error("Error checking order status:", error.message);
  }
};

module.exports = trackOrders;
