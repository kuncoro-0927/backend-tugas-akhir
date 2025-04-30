const jwt = require("jsonwebtoken");

const verifyUserToken = (req, res, next) => {
  const token = req.cookies.user_token; // Token user disimpan di cookie

  if (!token) {
    return res.status(403).json({ message: "Token user tidak ditemukan" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token user tidak valid" });
    }

    // Pastikan role adalah user (misalnya role_id = 2 untuk user)
    if (decoded.role_id !== 2) {
      return res.status(403).json({ message: "Akses terbatas untuk user" });
    }

    req.user = decoded;
    next();
  });
};

const verifyAdminToken = (req, res, next) => {
  const token = req.cookies.admin_token; // Token admin disimpan di cookie

  if (!token) {
    return res.status(403).json({ message: "Token admin tidak ditemukan" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token admin tidak valid" });
    }

    // Pastikan role adalah admin (misalnya role_id = 1 untuk admin)
    if (decoded.role_id !== 1) {
      return res.status(403).json({ message: "Akses terbatas untuk admin" });
    }

    req.user = decoded;
    next();
  });
};

module.exports = { verifyUserToken, verifyAdminToken };
