const axios = require("axios");
const { query } = require("../config/database");
const BASE_URL = "https://rajaongkir.komerce.id/api/v1/";
const FormData = require("form-data");
const API_KEY = "unxrIR8G98d2e20af7dc8a10pF19psbR"; // CYiHS6520b4793cd0ef3bc9bTnd2hLar // EJv2CoKLf94a0f0c779ab1f25f5nHLar // unxrIR8G98d2e20af7dc8a10pF19psbR
const cron = require("node-cron");
// Ambil daftar provinsi
const getProvinces = async (req, res) => {
  try {
    const response = await axios.get("https://wilayah.id/api/provinces.json");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data provinsi" });
  }
};

// Ambil kota berdasarkan provinsi
const getCities = async (req, res) => {
  //   const search = req.query.search;
  const { search } = req.query;
  try {
    const response = await axios.get(
      `${BASE_URL}destination/domestic-destination`,
      {
        params: { search },
        headers: {
          key: API_KEY,
          accept: "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ error: "Failed to fetch cities" });
  }
};

const calculateCost = async (req, res) => {
  const { origin, destination, courier, weight } = req.body;

  try {
    // Membuat form-data
    const form = new FormData();
    form.append("origin", origin);
    form.append("destination", destination);
    form.append("courier", courier);
    form.append("weight", weight);

    // Kirim data form-data ke Komerce API
    const response = await axios.post(
      "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost",
      form,
      {
        headers: {
          ...form.getHeaders(),
          key: API_KEY, // Ganti dengan API Key yang benar
        },
      }
    );

    // Jika response.data berisi informasi yang valid, lakukan pemrosesan lebih lanjut
    res.json(response.data);
  } catch (error) {
    console.error(
      "Error calculating shipping cost:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to calculate shipping cost" });
  }
};

const trackWaybill = async (req, res) => {
  const { order_code } = req.body;

  if (!order_code) {
    return res.status(400).json({ error: "Order Code harus disertakan." });
  }

  try {
    // Ambil status dan nomor resi dari database
    const [order] = await query(
      "SELECT status, tracking_number FROM orders WHERE order_code = ?",
      [order_code]
    );

    // Jika order tidak ditemukan
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan." });
    }

    const { status, tracking_number } = order;

    // Jika status paid tapi belum ada resi
    if (status === "paid" && !tracking_number) {
      return res.json({
        tracking_data: null,
        order_status: status,
      });
    }

    // Jika tracking number ada, kirim ke API Komerce
    const courier = "jne";
    const form = new FormData();
    form.append("awb", tracking_number);
    form.append("courier", courier);

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

    // Berhasil, kirimkan hasil tracking
    res.json({
      tracking_data: response.data.data, // ambil hanya bagian data-nya
      order_status: status,
    });
  } catch (error) {
    console.error(
      "Error tracking waybill:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Gagal melacak resi." });
  }
};

module.exports = {
  getProvinces,
  getCities,
  calculateCost,
  trackWaybill,
};
