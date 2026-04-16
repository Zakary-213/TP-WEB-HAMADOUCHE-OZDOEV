const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();

const connectDB = require("./connectDB/connectDB");
const path = require("path");
const PORT = process.env.PORT || 5000;

connectDB();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use('/api/auth', require('./authRoutes/authRoutes'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
