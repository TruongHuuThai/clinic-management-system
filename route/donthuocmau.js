const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("donthuocmau", {
    title: "Quản Lý Đơn Thuốc Mẫu",
  });
});

module.exports = router;
