const axios = require("axios");

const BASE_URL = "https://rajaongkir.komerce.id/api/v1/";
const FormData = require("form-data");
const API_KEY = "EJv2CoKLf94a0f0c779ab1f25f5nHLar"; // ambil dari https://collaborator.komerce.id/profile?tab=api-key

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

    // Filter the cities that match the province ID

    console.log("Cities fetched successfully:", response.data);
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

    // Log response untuk memeriksa struktur datanya
    console.log("Response from Komerce API:", response.data);

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

// const calculateCost = async (req, res) => {
//   const { origin, destination, weight, courier } = req.body;

//   try {
//     const response = await axios.post(
//       "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost",
//       {
//         origin,
//         destination,
//         weight,
//         courier,
//       },
//       {
//         headers: {
//           key: API_KEY,
//           accept: "application/json",
//         },
//       }
//     );

//     const shippingCosts = response.data.data;
//     res.json({ shippingCosts });
//   } catch (error) {
//     console.error(
//       "Error calculating shipping cost:",
//       error.response?.data || error.message
//     );
//     res.status(500).json({ message: "Failed to calculate shipping cost" });
//   }
// };
module.exports = {
  getProvinces,
  getCities,
  calculateCost,
};
