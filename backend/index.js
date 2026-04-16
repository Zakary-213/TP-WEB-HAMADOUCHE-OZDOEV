const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const app = express();

const connectDB = require("./connectDB/connectDB");
const path = require("path");
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = new Set([
  "https://tp-web-hamadouche-ozdoev.vercel.app",
  "https://tp-web-hamadouche-ozdoev-git-dev-zakarys-projects-853ed3d8.vercel.app",
  "https://tp-web-hamadouche-ozdoev-a0fxz66z4-zakarys-projects-853ed3d8.vercel.app",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5501"
]);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isExactMatch = ALLOWED_ORIGINS.has(origin);
    const isProjectPreview = /^https:\/\/tp-web-hamadouche-ozdoev-[a-z0-9-]+-zakarys-projects-853ed3d8\.vercel\.app$/i.test(origin);

    if (isExactMatch || isProjectPreview) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

connectDB();
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use('/api/auth', require('./authRoutes/authRoutes'));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
