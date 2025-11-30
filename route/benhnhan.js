const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/api/:maBenhNhan", async (req, res) => {
  try {
    const maBenhNhan = req.params.maBenhNhan;
    const truyVan = `SELECT * FROM benh_nhan WHERE bn_ma = $1`;
    const ketQua = await pool.query(truyVan, [maBenhNhan]);

    if (ketQua.rows.length === 0) {
      return res.status(404).json({ message: "Khong tim thay benh nhan" });
    }
    res.json(ketQua.rows[0]);
  } catch (loi) {
    console.error("Loi API lay chi tiet:", loi);
    res.status(500).json({ message: "Loi he thong" });
  }
});

router.put("/cap-nhat/:maBenhNhan", async (req, res) => {
  const maBenhNhan = req.params.maBenhNhan;
  const { ten_benh_nhan, so_dien_thoai, gioi_tinh, ngay_sinh, dia_chi } =
    req.body;

  let ngaySinhChuan = ngay_sinh || null;
  if (ngay_sinh && ngay_sinh.includes("/")) {
    const parts = ngay_sinh.split("/");
    ngaySinhChuan = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  try {
    const ketNoi = await pool.connect();
    const truyVan = `
        UPDATE benh_nhan 
        SET bn_ho_ten = $1, bn_sdt = $2, bn_gioi_tinh = $3, bn_ngay_sinh = $4, bn_dia_chi = $5 
        WHERE bn_ma = $6
    `;
    await ketNoi.query(truyVan, [
      ten_benh_nhan,
      so_dien_thoai,
      gioi_tinh,
      ngaySinhChuan,
      dia_chi,
      maBenhNhan,
    ]);
    ketNoi.release();

    res.json({ success: true, message: "Cap nhat thanh cong" });
  } catch (loi) {
    console.error("Lỗi khi cap nhat:", loi);

    if (loi.code === "22001") {
      return res
        .status(400)
        .json({ message: "Dia chi qua dai (toi da 255 ky tu)." });
    }

    if (loi.code === "23505") {
      return res.status(409).json({ message: "SDT da ton tai." });
    }

    res.status(500).json({ message: "Loi he thong noi bo." });
  }
});

router.delete("/xoa/:maBenhNhan", async (req, res) => {
  const maBenhNhan = req.params.maBenhNhan;
  try {
    const kiemTra = await pool.query(
      "SELECT 1 FROM phieu_kham_benh WHERE pkb_ma_bn = $1 LIMIT 1",
      [maBenhNhan]
    );
    if (kiemTra.rowCount > 0) {
      return res
        .status(409)
        .json({ message: "Bệnh nhân đã có lịch sử khám không thể xóa" });
    }

    await pool.query("DELETE FROM lich_hen WHERE lh_ma_bn = $1", [maBenhNhan]); 
    await pool.query("DELETE FROM benh_nhan WHERE bn_ma = $1", [maBenhNhan]);

    res.json({ success: true });
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Loi he thong" });
  }
});

router.get("/tim-kiem", async (req, res) => {
  const tuKhoa = req.query.q;

  if (!tuKhoa || tuKhoa.length < 2) {
    return res.json([]);
  }

  try {
    const thamSoTimKiem = `%${tuKhoa}%`;

    const truyVanTimKiem = `
            SELECT 
                bn_ma, 
                bn_ho_ten, 
                bn_sdt, 
                bn_gioi_tinh, 
                bn_ngay_sinh, 
                bn_dia_chi 
            FROM benh_nhan 
            WHERE 
                bn_ho_ten ILIKE $1 OR 
                bn_sdt ILIKE $1
            LIMIT 10;
        `;

    const ketQua = await pool.query(truyVanTimKiem, [thamSoTimKiem]);

    res.json(ketQua.rows);
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ error: "Loi he thong" });
  }
});

router.get("/them-moi", (req, res) => {
  const duLieuBenhNhan = {
    ten_benh_nhan: "",
    ngay_sinh: "",
    so_dien_thoai: "",
    dia_chi: "",
  };

  const gioiTinhMacDinh = "Nam";
  const thongBaoLoi = null;

  res.render("benhnhan_them", {
    title: "Them Benh Nhan Moi",
    patient: duLieuBenhNhan,
    currentGender: gioiTinhMacDinh,
    error: thongBaoLoi,
  });
});

router.post("/them-moi", async (req, res) => {
  const { ten_benh_nhan, ngay_sinh, gioi_tinh, so_dien_thoai, dia_chi } =
    req.body;

  if (!ten_benh_nhan || !so_dien_thoai) {
    return res
      .status(400)
      .json({ success: false, message: "Ten va SDT la bat buoc." }); 
  }

  let ngaySinhChuan = ngay_sinh || null;
  if (ngay_sinh && ngay_sinh.includes("/")) {
    const mangNgay = ngay_sinh.split("/");
    ngaySinhChuan = `${mangNgay[2]}-${mangNgay[1].padStart(
      2,
      "0"
    )}-${mangNgay[0].padStart(2, "0")}`;
  }

  try {
    const ketNoi = await pool.connect();

    const truyVanKiemTra = `SELECT bn_ma FROM benh_nhan WHERE bn_sdt = $1;`;
    const ketQuaKiemTra = await ketNoi.query(truyVanKiemTra, [so_dien_thoai]);

    if (ketQuaKiemTra.rows.length > 0) {
      ketNoi.release();
      return res.status(409).json({
        success: false,
        message: `SDT ${so_dien_thoai} da duoc su dung.`,
      });
    }

    const truyVanThem = `
            INSERT INTO benh_nhan (bn_ho_ten, bn_gioi_tinh, bn_ngay_sinh, bn_sdt, bn_dia_chi, bn_ngay_tao)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING bn_ma;
        `;

    const ketQuaThem = await ketNoi.query(truyVanThem, [
      ten_benh_nhan,
      gioi_tinh || null,
      ngaySinhChuan,
      so_dien_thoai,
      dia_chi || null,
    ]);
    const maBenhNhanMoi = ketQuaThem.rows[0].bn_ma;

    ketNoi.release();

    res.status(201).json({
      success: true,
      message: "Them benh nhan thanh cong.",
      bn_ma: maBenhNhanMoi,
    });
    
  } catch (loi) {
    console.error("LỖI KHI TẠO BỆNH NHÂN MỚI:", loi);
    res
      .status(500)
      .json({ success: false, message: "Loi he thong khi tao benh nhan moi." });
  }
});

router.get("/", async (req, res) => {
  const thamSoTruyVan = req.query;
  let chuoiDieuKien = "";
  const mangThamSo = [];

  if (thamSoTruyVan.search) {
    chuoiDieuKien = `WHERE (bn_ho_ten ILIKE $1 OR bn_sdt ILIKE $1)`;
    mangThamSo.push(`%${thamSoTruyVan.search}%`);
  }

  try {
    const truyVanDanhSach = `
            SELECT bn_ma, bn_ho_ten, bn_sdt, bn_dia_chi, bn_ngay_tao, bn_gioi_tinh, bn_ngay_sinh
            FROM benh_nhan 
            ${chuoiDieuKien}
            ORDER BY bn_ngay_tao DESC;
        `;
    const ketQuaDanhSach = await pool.query(truyVanDanhSach, mangThamSo);

    res.render("benhnhan_danhsach", {
      patients: ketQuaDanhSach.rows,
      title: "Danh Sach Benh Nhan",
      query: thamSoTruyVan,
    });
  } catch (loi) {
    console.error(loi);
    res
      .status(500)
      .render("loi_hethong", { message: "Loi tai danh sach benh nhan" });
  }
});

router.get("/:maBenhNhan", async (req, res) => {
  const maBenhNhan = req.params.maBenhNhan;

  try {
    const truyVanHoSo = `SELECT * FROM benh_nhan WHERE bn_ma = $1`;
    const ketQuaHoSo = await pool.query(truyVanHoSo, [maBenhNhan]);

    if (ketQuaHoSo.rows.length === 0) {
      return res.status(404).render("loi_hethong", { message: "Khong tim thay benh nhan." });
    }
    const thongTinBenhNhan = ketQuaHoSo.rows[0];

    const truyVanLichHen = `
        SELECT lh.lh_ma, lh.lh_ngay_hen, lh.lh_khung_gio, lh.lh_trang_thai, lh.lh_ghi_chu
        FROM lich_hen lh 
        WHERE lh.lh_ma_bn = $1 and lh.lh_da_xoa = FALSE
        ORDER BY lh.lh_ngay_hen DESC, lh.lh_khung_gio DESC;
    `;
    const ketQuaLichSu = await pool.query(truyVanLichHen, [maBenhNhan]); 
    const truyVanLichSuKham = `
        SELECT 
            pkb.pkb_ma, 
            pkb.pkb_ngay_kham, 
            pkb.pkb_trieu_chung, 
            pkb.pkb_ghi_chu
        FROM phieu_kham_benh pkb
        WHERE pkb.pkb_ma_bn = $1
        ORDER BY pkb_ngay_kham DESC;
    `;
    const ketQuaLichSuKham = await pool.query(truyVanLichSuKham, [maBenhNhan]); 
    res.render("benhnhan_chitiet", {
        patient: thongTinBenhNhan,
        history: ketQuaLichSu.rows, 
        examHistory: ketQuaLichSuKham.rows,
        title: "Chi Tiet Benh Nhan",
    });
  } catch (loi) {
    console.error("Lỗi khi tải hồ sơ bệnh nhân:", loi);
    res.status(500).render("loi_hethong", { message: "Loi tai ho so" });
  }
});

router.get("/kham-moi/:maLichHen", async (req, res) => {
  const maLichHen = req.params.maLichHen;

  try {
    const truyVanLichHen = `SELECT bn_ma, bs_ma, lh_ngay_kham FROM lich_hen WHERE lh_ma = $1;`;
    const ketQuaLichHen = await pool.query(truyVanLichHen, [maLichHen]);

    if (ketQuaLichHen.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Khong tim thay lich hen" });
    }

    const maBenhNhan = ketQuaLichHen.rows[0].bn_ma;
    const ngayKham = ketQuaLichHen.rows[0].lh_ngay_kham;

    const truyVanBenhNhan = `
            SELECT bn_ma, bn_ho_ten, bn_tuoi, bn_gioi_tinh, bn_dia_chi, bn_tien_su
            FROM benh_nhan 
            WHERE bn_ma = $1;
        `;
    const ketQuaBenhNhan = await pool.query(truyVanBenhNhan, [maBenhNhan]);
    const duLieuBenhNhan =
      ketQuaBenhNhan.rows.length > 0 ? ketQuaBenhNhan.rows[0] : {};

    duLieuBenhNhan.ngayKham = ngayKham;

    return res.render("phieukham_them", {
      benhNhan: duLieuBenhNhan,
      lh_ma: maLichHen,
    });
  } catch (loi) {
    console.error(loi);
    return res
      .status(500)
      .render("loi_hethong", { message: "Loi tai phieu kham" });
  }
});

router.post("/luu-phieu-kham", async (req, res) => {
  const {
    pkb_ma_bn,
    lh_ma,
    pkb_trieu_chung,
    pkb_ghi_chu,
    b_ma,
    dt_ghi_chu,
    thuoc_ma,
    so_luong,
    cach_dung,
  } = req.body;

  const ketNoi = await pool.connect();
  try {
    await ketNoi.query("BEGIN");

    const truyVanPkb = `
            INSERT INTO phieu_kham_benh (pkb_ma_bn, pkb_ngay_kham, pkb_trieu_chung, pkb_ghi_chu)
            VALUES ($1, NOW(), $2, $3) 
            RETURNING pkb_ma;
        `;
    const ketQuaPkb = await ketNoi.query(truyVanPkb, [
      pkb_ma_bn,
      pkb_trieu_chung,
      pkb_ghi_chu,
    ]);
    const maPhieuKham = ketQuaPkb.rows[0].pkb_ma;

    if (b_ma) {
      const truyVanChanDoan = `INSERT INTO chan_doan (cd_ma_pkb, cd_ma_b) VALUES ($1, $2);`;
      await ketNoi.query(truyVanChanDoan, [maPhieuKham, b_ma]);
    }

    const truyVanDonThuoc = `
            INSERT INTO don_thuoc (dt_ma_pkb, dt_ghi_chu, dt_ngay_tao)
            VALUES ($1, $2, NOW()) 
            RETURNING dt_ma;
        `;
    const ketQuaDonThuoc = await ketNoi.query(truyVanDonThuoc, [
      maPhieuKham,
      dt_ghi_chu,
    ]);
    const maDonThuoc = ketQuaDonThuoc.rows[0].dt_ma;

    if (Array.isArray(thuoc_ma)) {
      const truyVanChiTiet = `
                INSERT INTO chi_tiet_don_thuoc (ctdt_ma_dt, ctdt_ma_t, ctdt_so_luong, ctdt_cach_dung)
                VALUES ($1, $2, $3, $4);
            `;
      for (let i = 0; i < thuoc_ma.length; i++) {
        if (thuoc_ma[i] && so_luong[i] && cach_dung[i]) {
          await ketNoi.query(truyVanChiTiet, [
            maDonThuoc,
            thuoc_ma[i],
            so_luong[i],
            cach_dung[i],
          ]);
        }
      }
    }

    const truyVanCapNhatLich = `UPDATE lich_hen SET lh_trang_thai = 'DA_HOAN_THANH' WHERE lh_ma = $1;`;
    await ketNoi.query(truyVanCapNhatLich, [lh_ma]);

    await ketNoi.query("COMMIT");
    res.redirect(`/api/benh-nhan/${pkb_ma_bn}`);
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    console.error(loi);
    res.status(500).render("loi_hethong", { message: "Loi luu phieu kham" });
  } finally {
    ketNoi.release();
  }
});

router.get("/sua/:maBenhNhan", async (req, res) => {
  const maBenhNhan = req.params.maBenhNhan;

  try {
    const truyVan = `SELECT * FROM benh_nhan WHERE bn_ma = $1;`;
    const ketQua = await pool.query(truyVan, [maBenhNhan]);

    if (ketQua.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Khong tim thay benh nhan" });
    }

    res.render("benhnhan_sua", {
      title: "Chinh Sua Ho So",
      patient: ketQua.rows[0],
    });
  } catch (loi) {
    console.error(loi);
    res.status(500).render("loi_hethong", { message: "Loi tai form sua" });
  }
});

router.post("/sua/:maBenhNhan", async (req, res) => {
  const maBenhNhan = req.params.maBenhNhan;
  const { ho_ten, sdt, gioi_tinh, ngay_sinh, dia_chi } = req.body;

  const ketNoi = await pool.connect();

  try {
    const truyVanCapNhat = `
            UPDATE benh_nhan
            SET 
                bn_ho_ten = $1,
                bn_sdt = $2,
                bn_gioi_tinh = $3,
                bn_ngay_sinh = $4,
                bn_dia_chi = $5,
                bn_ngay_cap_nhat = CURRENT_TIMESTAMP
            WHERE 
                bn_ma = $6
            RETURNING bn_ma;
        `;

    const ketQua = await ketNoi.query(truyVanCapNhat, [
      ho_ten,
      sdt || null,
      gioi_tinh,
      ngay_sinh || null,
      dia_chi,
      maBenhNhan,
    ]);

    if (ketQua.rows.length === 0) {
      return res.status(404).send("Khong tim thay benh nhan");
    }
    res.redirect(`/api/benh-nhan/${maBenhNhan}`);
  } catch (loi) {
    console.error(loi);
    if (loi.code === "23505") {
      return res.status(409).send("SDT da ton tai");
    }
    res.status(500).send("Loi he thong");
  } finally {
    ketNoi.release();
  }
});

module.exports = router;
