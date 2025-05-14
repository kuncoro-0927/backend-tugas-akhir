const nodemailer = require("nodemailer");

const sendFeedback = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Semua field wajib diisi." });
  }

  try {
    // Transporter SMTP Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // gunakan App Password
      },
    });

    // Kirim email ke admin
    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_USER,
      subject: "Kritik / Masukan dari Pengunjung Website",
      html: `
        <p><strong>Nama:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Pesan:</strong><br/>${message}</p>
      `,
    });

    res.status(200).json({ message: "Pesan berhasil dikirim. Terima kasih!" });
  } catch (error) {
    console.error("Gagal mengirim email:", error);
    res.status(500).json({ error: "Terjadi kesalahan saat mengirim email." });
  }
};

module.exports = { sendFeedback };
