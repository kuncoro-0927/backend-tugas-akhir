// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const jwt = require("jsonwebtoken");
// const { query } = require("../config/database.js");
// const crypto = require("crypto");
// const bcrypt = require("bcrypt");

// const generateRandomPassword = () => {
//   return crypto.randomBytes(16).toString("hex");
// };

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
//     },
//     async (req, accessToken, refreshToken, profile, done) => {
//       try {
//         const user = await query("SELECT * FROM users WHERE email = ?", [
//           profile.emails[0].value,
//         ]);

//         if (user.length > 0) {
//           const token = jwt.sign(
//             {
//               id: user.id,
//               email: user.email,
//               role_id: user.role_id, // selalu role_id
//               name: user.name,
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//           );

//           return done(null, { ...user[0], token });
//         } else {
//           const randomPassword = generateRandomPassword();
//           const hashedPassword = await bcrypt.hash(randomPassword, 10);
//           const newUser = await query(
//             "INSERT INTO users (email, name, role_id, google_id, isverified, password) VALUES (?, ?, ?, ?,?,?)",
//             [
//               profile.emails[0].value,
//               profile.displayName,
//               "2",
//               profile.id,
//               true,
//               hashedPassword,
//             ]
//           );

//           const token = jwt.sign(
//             {
//               id: newUser.insertId,
//               email: profile.emails[0].value,
//               role: "2",
//             },
//             process.env.JWT_SECRET,
//             { expiresIn: "1h" }
//           );
//           return done(null, {
//             id: newUser.insertId,
//             email: profile.emails[0].value,
//             role: "user",
//             token,
//             refreshToken,
//           });
//         }
//       } catch (error) {
//         return done(error, false);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   done(null, user);
// });

// passport.deserializeUser((user, done) => {
//   done(null, user);
// });

// module.exports = passport;

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const { query } = require("../config/database.js");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const generateRandomPassword = () => {
  return crypto.randomBytes(16).toString("hex");
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const result = await query("SELECT * FROM users WHERE email = ?", [
          profile.emails[0].value,
        ]);

        let user;
        let tokenPayload;

        if (result.length > 0) {
          user = result[0];

          tokenPayload = {
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            name: user.name,
          };
        } else {
          const randomPassword = generateRandomPassword();
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          const insertResult = await query(
            "INSERT INTO users (email, name, role_id, google_id, isverified, password) VALUES (?, ?, ?, ?, ?, ?)",
            [
              profile.emails[0].value,
              profile.displayName,
              2, // role_id sebagai number
              profile.id,
              true,
              hashedPassword,
            ]
          );

          user = {
            id: insertResult.insertId,
            email: profile.emails[0].value,
            role_id: 2,
            name: profile.displayName,
          };

          tokenPayload = {
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            name: user.name,
          };
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        return done(null, { ...user, token });
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
