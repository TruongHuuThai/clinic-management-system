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
        SET bn_ho_ten = $1, bn_sdt = $2, bn_la_nam = $3, bn_ngay_sinh = $4, bn_dia_chi = $5 
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
                bn_la_nam, 
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
    title: "Thêm Bệnh Nhân Mới",
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
            INSERT INTO benh_nhan (bn_ho_ten, bn_la_nam, bn_ngay_sinh, bn_sdt, bn_dia_chi, bn_ngay_tao)
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
  const { search, trang } = req.query;

  const SO_DONG_MOI_TRANG = 10;
  const trangHienTai = parseInt(trang) || 1;
  const viTriBatDau = (trangHienTai - 1) * SO_DONG_MOI_TRANG;

  let chuoiDieuKien = "";
  const mangThamSo = [];

  if (search) {
    chuoiDieuKien = `WHERE (bn_ho_ten ILIKE $1 OR bn_sdt ILIKE $1)`;
    mangThamSo.push(`%${search}%`);
  }

  try {
    const demQuery = `SELECT COUNT(*) FROM benh_nhan ${chuoiDieuKien}`;
    const ketQuaDem = await pool.query(demQuery, mangThamSo);
    const tongSoLuong = parseInt(ketQuaDem.rows[0].count);
    const tongSoTrang = Math.ceil(tongSoLuong / SO_DONG_MOI_TRANG);

    const patientsQuery = `
            SELECT bn_ma, bn_ho_ten, bn_sdt, bn_dia_chi, bn_ngay_sinh, bn_la_nam
            FROM benh_nhan 
            ${chuoiDieuKien}
            ORDER BY bn_ngay_tao DESC
            LIMIT ${SO_DONG_MOI_TRANG} OFFSET ${viTriBatDau}; -- Thêm dòng này
        `;
    const patientResult = await pool.query(patientsQuery, mangThamSo);

    res.render("benhnhan_danhsach", {
      patients: patientResult.rows,
      title: "Danh Sách Bệnh Nhân",
      query: req.query,
      currentPage: trangHienTai,
      totalPages: tongSoTrang,
      totalCount: tongSoLuong,
    });
  } catch (error) {
    console.error("Lỗi tải danh sách:", error);
    res
      .status(500)
      .render("loi_hethong", { message: "Lỗi tải danh sách bệnh nhân." });
  }
});

router.get("/:maBenhNhan", async (req, res) => {
  const maBenhNhan = req.params.maBenhNhan;

  try {
    const queryBN = `SELECT * FROM benh_nhan WHERE bn_ma = $1`;
    const resultBN = await pool.query(queryBN, [maBenhNhan]);

    if (resultBN.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Không tìm thấy bệnh nhân này!" });
    }
    const queryLichHen = `
            SELECT * FROM lich_hen 
            WHERE lh_ma_bn = $1 
            ORDER BY lh_ngay_hen DESC, lh_khung_gio DESC
        `;
    const resultLichHen = await pool.query(queryLichHen, [maBenhNhan]);
    const queryPKB = `
            SELECT pkb_ma, pkb_ngay_kham, pkb_trieu_chung, pkb_ghi_chu 
            FROM phieu_kham_benh 
            WHERE pkb_ma_bn = $1 
            ORDER BY pkb_ngay_kham DESC
        `;
    const resultPKB = await pool.query(queryPKB, [maBenhNhan]);
    let danhSachPhieuKham = resultPKB.rows;
    danhSachPhieuKham = await Promise.all(
      danhSachPhieuKham.map(async (pkb) => {
        const queryDonThuoc = `SELECT dt_ma, dt_ghi_chu FROM don_thuoc WHERE dt_ma_pkb = $1`;
        const resDT = await pool.query(queryDonThuoc, [pkb.pkb_ma]);

        let thuoc = [];
        let chanDoan = [];
        let loiDan = "";

        if (resDT.rows.length > 0) {
          const dt_ma = resDT.rows[0].dt_ma;
          loiDan = resDT.rows[0].dt_ghi_chu;

          const queryChiTietThuoc = `
                    SELECT t.t_ten_thuoc, t.t_don_vi_tinh, ct.ctdt_so_luong, ct.ctdt_lieu_dung, ct.ctdt_cach_dung
                    FROM chi_tiet_don_thuoc ct
                    JOIN thuoc t ON ct.ctdt_ma_thuoc = t.t_ma
                    WHERE ct.ctdt_ma_dt = $1
                `;
          const resThuoc = await pool.query(queryChiTietThuoc, [dt_ma]);
          thuoc = resThuoc.rows;
          const queryBenh = `
                    SELECT b.b_ten, b.b_ma_icd
                    FROM chan_doan cd
                    JOIN benh b ON cd.cd_ma_benh = b.b_ma
                    WHERE cd.cd_ma_dt = $1
                `;
          const resBenh = await pool.query(queryBenh, [dt_ma]);
          chanDoan = resBenh.rows;
        }

        const queryCLS = `
                SELECT 
                    dv.dvcls_ten, 
                    kq.kqcls_mota, 
                    kq.kqcls_ket_luan, 
                    kq.kqcls_file_dinh_kem
                FROM phieu_chi_dinh pcd
                JOIN chi_tiet_chi_dinh ctcd ON pcd.pcd_ma = ctcd.ctcd_ma_pcd
                JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
                LEFT JOIN ket_qua_can_lam_san kq ON ctcd.ctcd_ma = kq.kqcls_ma_ctcd
                WHERE pcd.pcd_ma_pkb = $1
            `;
        const resCLS = await pool.query(queryCLS, [pkb.pkb_ma]);
        return {
          ...pkb,
          chan_doan: chanDoan, 
          thuoc: thuoc,
          loi_dan: loiDan, 
          cls: resCLS.rows, 
        };
      })
    );
    res.render("benhnhan_chitiet", {
      title: "Hồ sơ bệnh nhân",
      patient: resultBN.rows[0], 
      history: resultLichHen.rows, 
      examHistory: danhSachPhieuKham,
    });
  } catch (err) {
    console.error("Lỗi khi xem chi tiết bệnh nhân:", err);
    res
      .status(500)
      .render("loi_hethong", { message: "Lỗi máy chủ khi tải hồ sơ bệnh án." });
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
            SELECT bn_ma, bn_ho_ten, bn_tuoi, bn_la_nam , bn_dia_chi, bn_tien_su
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
      title: "Chỉnh Sửa Hồ Sơ",
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
                bn_la_nam = $3,
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
