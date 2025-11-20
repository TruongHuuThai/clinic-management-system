const express = require("express");
const app = express();
const path = require("path");
const pool = require("./config/db");
const multer = require("multer");
const upload = multer();

const dashboardRoute = require("./route/dashboard");
const appointmentsRoute = require("./route/appointments");
const patientsRoute = require("./route/patients");
const phieukhambenhRoute = require("./route/phieukhambenh");
const chandoanRoute = require("./route/chandoan");
const thuocRoute = require("./route/thuoc");
const chitietdonthuocRoute = require("./route/chitietdonthuoc");
const benhRoute = require("./route/benh");
const donthuocRoute = require("./route/donthuoc");
const phieuchidinhRoute = require("./route/phieuchidinh");

const thanhtoanRoute = require("./route/thanhtoan");

const chitietchidinh = require("./route/chitietchidinh");
const ketquacanlamsan = require("./route/ketquacanlamsan");
const dichvucanlamsan = require("./route/dichvucanlamsan");
const cogiadichvu = require("./route/cogiadichvu");
const cogiathuoc = require("./route/cogiathuoc");
const thoigian = require("./route/thoigian");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", dashboardRoute);
app.use("/api", appointmentsRoute);
app.use("/api/patients", patientsRoute);
app.use("/api/phieukhambenh", phieukhambenhRoute);
app.use("/api/chandoan", chandoanRoute);
app.use("/api/thuoc", thuocRoute);
app.use("/api/benh", benhRoute);
app.use("/api/donthuoc", donthuocRoute);
app.use("/api/chitietdonthuoc", chitietdonthuocRoute);
app.use("/api/phieuchidinh", phieuchidinhRoute);
app.use("/api/chitietchidinh", chitietchidinh);
app.use("/api/dichvucanlamsan", dichvucanlamsan);
app.use("/api/ketquacanlamsan", ketquacanlamsan);

app.use("/api/thanhtoan", thanhtoanRoute)
app.use("/api/gia/dichvu", cogiadichvu);
app.use("/api/gia/thuoc", cogiathuoc);
app.use("/api/thoigian", thoigian);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
