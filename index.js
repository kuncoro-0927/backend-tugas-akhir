require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("./middleware/PassportGoogleOAuth.js");
const bodyParser = require("body-parser");
const { testConnection, database } = require("./config/database.js");
const router = require("./routes/route.js");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const cron = require("node-cron");
const trackOrders = require("./cron/trackOrders.js");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

const orderClients = new Map();
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const sessionStore = new MySQLStore({}, database);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 jam
    },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(passport.initialize());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/invoices", express.static(path.join(__dirname, "invoices")));
app.use(express.static("public"));
app.use("/public", express.static("public"));

app.use(router);

cron.schedule("0 */6 * * *", () => {
  console.log("Running cron job to check order status...");
  trackOrders();
});

// cron.schedule("*/10 * * * * *", () => {
//   console.log("Running cron job every 10 seconds to check order status...");
//   trackOrders();
// });

server.listen(process.env.APP_PORT, async () => {
  await testConnection();
  console.log(`Running at http://localhost:${process.env.APP_PORT}`);
});

module.exports = { server, io }; // <--- tambahkan ini
