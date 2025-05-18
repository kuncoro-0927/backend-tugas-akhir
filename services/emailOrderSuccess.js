const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ✅ Email untuk pelanggan
exports.sendOrderConfirmationEmail = async (
  email,
  orderCode,
  name,
  invoiceUrl
) => {
  const fullInvoiceUrl = `${process.env.BACKEND_URL}${invoiceUrl}`;

  const mailOptions = {
    from: `"Faza Frame Pacitan" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Pesanan ${orderCode} Berhasil Dibayar`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3>Halo ${name},</h3>
        <p>Terima kasih telah berbelanja di <strong>Faza Frame Pacitan</strong>.</p>
        <p>Pesanan kamu dengan kode <strong>${orderCode}</strong> telah berhasil dibayar dan sedang kami proses.</p>
        <p>Kami akan mengirimkan notifikasi ketika pesanan kamu dikirim.</p>

        <p>
          <a href="${fullInvoiceUrl}" 
             style="display: inline-block; padding: 10px 16px; background-color: #000000; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;"
             target="_blank">
            Unduh Invoice
          </a>
        </p>

        <br/>
        <p>Salam hangat,</p>
        <strong>Tim Faza Frame Pacitan</strong>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ✅ Email notifikasi ke admin
exports.sendAdminNotificationEmail = async (
  orderCode,
  customerName,
  total,
  invoiceUrl
) => {
  const fullInvoiceUrl = `${process.env.BACKEND_URL}${invoiceUrl}`;

  const mailOptions = {
    from: `"Faza Frame Pacitan" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🔔 Pesanan Baru Dibayar - ${orderCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3>Halo Admin 👋</h3>
        <p>Pesanan baru telah dibayar oleh <strong>${customerName}</strong>.</p>
        <ul>
          <li><strong>Kode Pesanan:</strong> ${orderCode}</li>
          <li><strong>Total Bayar:</strong> Rp ${Number(total).toLocaleString(
            "id-ID"
          )}</li>
        </ul>
        <p>
          <a href="${fullInvoiceUrl}" 
             style="display: inline-block; padding: 10px 16px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
            Lihat Invoice
          </a>
        </p>
        <p>Silakan segera proses pesanan ini ya 💪</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
