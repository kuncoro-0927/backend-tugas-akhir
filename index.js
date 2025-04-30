require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("./middleware/PassportGoogleOAuth.js");
const bodyParser = require("body-parser");
const { testConnection, database } = require("./config/database.js");
const router = require("./routes/route.js");
const path = require("path");
const cookieParser = require("cookie-parser");
const app = express();
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
app.use(cookieParser());
app.use(express.json());
const sessionStore = new MySQLStore({}, database);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true })); // Untuk parsing form-data
app.use(bodyParser.json());
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

app.use(router);
app.use(bodyParser.json());
app.use(passport.initialize());
app.use("/invoices", express.static(path.join(__dirname, "invoices")));

require("dotenv").config();
app.use(express.static("public"));
app.use("/public", express.static("public"));

app.listen(process.env.APP_PORT, async () => {
  await testConnection();
  console.log(`Running at http://localhost:${process.env.APP_PORT}`);
});
