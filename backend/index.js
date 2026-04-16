const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();
const port = 4000;
const connectDB = require("./connectDB/connectDB");
const path = require("path");

connectDB();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(express.static(path.join(__dirname, "frontend")));

app.use('/api/auth', require('./routes/authRoutes'));


app.get("/zakito", (req, res) => {
  res.send("Oue oue oue !!!!");
});

app.listen(port, () => {
  console.log("Server running on port " + port);
});