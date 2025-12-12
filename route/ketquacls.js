const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const boNhoDem = multer.memoryStorage();
const boTaiLen = multer({ storage: boNhoDem });

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.get("/nhap/:maPhieuChiDinh", async (req, res) => {
  const maPhieuChiDinh = req.params.maPhieuChiDinh;

  try {
    const truyVanThongTin = `
            SELECT 
                pkb.pkb_ma,
                pkb.pkb_ma_bn
            FROM phieu_chi_dinh pcd
            JOIN phieu_kham_benh pkb ON pcd.pcd_ma_pkb = pkb.pkb_ma
            WHERE pcd.pcd_ma = $1
            LIMIT 1;
        `;
    const ketQuaThongTin = await pool.query(truyVanThongTin, [maPhieuChiDinh]);

    if (ketQuaThongTin.rows.length === 0) {
      return res
        .status(404)
        .render("loi_hethong", { message: "Khong tim thay phieu chi dinh" });
    }

    const maBenhNhan = ketQuaThongTin.rows[0].pkb_ma_bn;
    const maPhieuKham = ketQuaThongTin.rows[0].pkb_ma;

    const truyVanBenhNhan = `SELECT bn_ho_ten, bn_ma FROM benh_nhan WHERE bn_ma = $1;`;
    const ketQuaBenhNhan = await pool.query(truyVanBenhNhan, [maBenhNhan]);
    const thongTinBenhNhan = ketQuaBenhNhan.rows[0];

    const truyVanDanhSach = `
            SELECT 
                ctcd.ctcd_ma, 
                ctcd.ctcd_so_luong, 
                dv.dvcls_ten, 
                dv.dvcls_loai,
                ctcd.ctcd_trang_thai
            FROM chi_tiet_chi_dinh ctcd
            JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
            WHERE ctcd.ctcd_ma_pcd = $1
            ORDER BY ctcd.ctcd_ma;
        `;
    const ketQuaDanhSach = await pool.query(truyVanDanhSach, [maPhieuChiDinh]);

    res.render("ketqua_cls_them", {
      pcdMa: maPhieuChiDinh,
      pkbMa: maPhieuKham,
      ctcdList: ketQuaDanhSach.rows,
      bn_ma: thongTinBenhNhan.bn_ma,
      bn_ho_ten: thongTinBenhNhan.bn_ho_ten,
    });
  } catch (loi) {
    console.error(loi);
    res
      .status(500)
      .render("loi_hethong", { message: "Loi tai form nhap ket qua" });
  }
});

router.post("/luu", boTaiLen.any(), async (req, res) => {
  const maPhieuChiDinh = req.body.pcd_ma;
  const maChiTietTho = req.body["ctcd_ma[]"] || req.body["ctcd_ma"];

  let danhSachMaChiTiet = [];
  if (maChiTietTho) {
    if (Array.isArray(maChiTietTho)) {
      danhSachMaChiTiet = maChiTietTho;
    } else {
      danhSachMaChiTiet = [maChiTietTho];
    }
    danhSachMaChiTiet = danhSachMaChiTiet.filter(
      (ma) => ma && String(ma).trim() !== ""
    );
  }

  if (!maPhieuChiDinh) {
    return res.status(400).send("Thieu ma phieu chi dinh");
  }

  const banDoFileDaTai = {};
  if (req.files && req.files.length > 0) {
    for (const tep of req.files) {
      const khop = tep.fieldname.match(/kqcls_file_(\d+)/);
      if (khop) {
        const maChiTiet = khop[1];
        const tenFile = `kqcls_${maChiTiet}_${Date.now()}${path.extname(
          tep.originalname
        )}`;
        const duongDanFile = path.join("uploads", tenFile);

        const absolutePath = path.join(uploadDir, tenFile);

        try {
          fs.writeFileSync(absolutePath, tep.buffer);
          banDoFileDaTai[maChiTiet] = duongDanFile;
        } catch (loi) {
          console.error(`Loi luu file cho CTCD ${maChiTiet}:`, loi);
        }
      }
    }
  }

  const ketNoi = await pool.connect();
  try {
    await ketNoi.query("BEGIN");

    for (const maChiTiet of danhSachMaChiTiet) {
      if (!maChiTiet) continue;

      const moTaKetQua = req.body[`kqcls_mota_${maChiTiet}`] || null;
      const ketLuan = req.body[`kqcls_ketluan_${maChiTiet}`] || null;
      const giaTriChinh = req.body[`kqcls_json_${maChiTiet}`] || null;
      const trangThai = req.body[`ctcd_trang_thai_${maChiTiet}`];
      const duongDanFile = banDoFileDaTai[maChiTiet] || null;

      if (
        moTaKetQua ||
        ketLuan ||
        giaTriChinh ||
        duongDanFile ||
        trangThai === "DA_CO_KET_QUA" ||
        trangThai === "HUY"
      ) {
        const truyVanKiemTra = `SELECT kqcls_ma FROM ket_qua_can_lam_san WHERE kqcls_ma_ctcd = $1;`;
        const ketQuaKiemTra = await ketNoi.query(truyVanKiemTra, [maChiTiet]);

        if (ketQuaKiemTra.rows.length > 0) {
          let queryUpdate = `UPDATE ket_qua_can_lam_san SET kqcls_mota = $2, kqcls_ket_luan = $3, kqcls_gia_tri_chinh = $4`;
          const params = [maChiTiet, moTaKetQua, ketLuan, giaTriChinh];

          if (duongDanFile) {
            queryUpdate += `, kqcls_file_dinh_kem = $5`;
            params.push(duongDanFile);
            queryUpdate += ` WHERE kqcls_ma_ctcd = $1`;
          } else {
            queryUpdate += ` WHERE kqcls_ma_ctcd = $1`;
          }

          await ketNoi.query(queryUpdate, params);
        } else {
          const truyVanThem = `
                        INSERT INTO ket_qua_can_lam_san (kqcls_ma_ctcd, kqcls_mota, kqcls_ket_luan, kqcls_file_dinh_kem, kqcls_gia_tri_chinh)
                        VALUES ($1, $2, $3, $4, $5);
                    `;
          await ketNoi.query(truyVanThem, [
            maChiTiet,
            moTaKetQua,
            ketLuan,
            duongDanFile,
            giaTriChinh,
          ]);
        }

        const truyVanCapNhatTrangThai = `UPDATE chi_tiet_chi_dinh SET ctcd_trang_thai = $1 WHERE ctcd_ma = $2;`;
        await ketNoi.query(truyVanCapNhatTrangThai, [
          trangThai || "DA_CO_KET_QUA",
          maChiTiet,
        ]);
      }
    }

    const resPKB = await ketNoi.query(
      "SELECT pcd_ma_pkb FROM phieu_chi_dinh WHERE pcd_ma = $1",
      [maPhieuChiDinh]
    );
    const pkbMa = resPKB.rows[0].pcd_ma_pkb;

    await ketNoi.query("COMMIT");

    res.redirect(`/api/thanh-toan/lap-phieu/${pkbMa}`);
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    console.error(loi);
    res.status(500).send("Loi luu ket qua: " + loi.message);
  } finally {
    ketNoi.release();
  }
});

module.exports = router;
