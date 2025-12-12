require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const app = express();

const routeTrangChu = require("./route/trangchu");
const routeLichHen = require("./route/lichhen");
const routeBenhNhan = require("./route/benhnhan");
const routePhieuKham = require("./route/phieukhambenh");
const routeChanDoan = require("./route/chandoan");
const routeThuoc = require("./route/thuoc");
const routeBenh = require("./route/benh");
const routeDonThuoc = require("./route/donthuoc");
const routePhieuChiDinh = require("./route/phieuchidinh");
const routeKetQuaCLS = require("./route/ketquacls.js");
const routeDichVuCLS = require("./route/dichvucls.js");
const routeThanhToan = require("./route/thanhtoan");

const routeOCR = require("./route/ocr");
const routeDonMau = require("./route/donthuocmau");
const thongKeRouter = require("./route/thongke");

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", routeTrangChu);

app.use("/api/lich-hen", routeLichHen);
app.use("/api/benh-nhan", routeBenhNhan);
app.use("/api/phieu-kham", routePhieuKham);
app.use("/api/chan-doan", routeChanDoan);
app.use("/api/benh", routeBenh);
app.use("/api/thuoc", routeThuoc);
app.use("/api/don-thuoc", routeDonThuoc);
app.use("/api/phieu-chi-dinh", routePhieuChiDinh);
app.use("/api/dich-vu-cls", routeDichVuCLS);
app.use("/api/ket-qua-cls", routeKetQuaCLS);
app.use("/api/thanh-toan", routeThanhToan);
app.use("/api/ocr", routeOCR);
app.use("/quan-ly/don-mau", routeDonMau);
app.use("/api/thong-ke", thongKeRouter);

app.use((req, res, next) => {
  const error = new Error("Không tìm thấy trang yêu cầu");
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  console.error("LỖI HỆ THỐNG:", err.message);
  res.status(err.status || 500);

  if (req.originalUrl.startsWith("/api")) {
    return res.json({
      thanhcong: false,
      thongbao: err.message || "Lỗi máy chủ nội bộ",
    });
  }

  res.send(`<h1>Đã xảy ra lỗi: ${err.message}</h1>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});
