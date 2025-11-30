const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/tim-kiem", async (req, res) => {
  const tuKhoa = req.query.q;
  const maNhom = req.query.groupId; 

  if (!tuKhoa || tuKhoa.length < 1) return res.json([]);

  try {
    let truyVan = `
        SELECT 
            t.t_ma, 
            t.t_ten_thuoc, 
            t.t_don_vi_tinh, 
            t.t_ham_luong,
            t.t_loai_thuoc,
            nt.nt_ten AS ten_nhom,
            t.t_cach_dung_mac_dinh,
            t.t_huong_dan
        FROM thuoc t
        LEFT JOIN nhom_thuoc nt ON t.t_loai_thuoc = nt.nt_ma
        WHERE t.t_ten_thuoc ILIKE $1 
    `;

    const thamSo = [`%${tuKhoa}%`];

    if (maNhom) {
      truyVan += ` AND t.t_loai_thuoc = $2`;
      thamSo.push(maNhom);
    }

    truyVan += ` LIMIT 20;`;

    const ketQua = await pool.query(truyVan, thamSo);
    res.json(ketQua.rows);
  } catch (loi) {
    console.error("LOI SQL TIM KIEM:", loi);
    res.status(200).json([]);
  }
});

router.get("/nhom-thuoc", async (req, res) => {
  try {
    const truyVan = `SELECT nt_ma, nt_ten FROM nhom_thuoc ORDER BY nt_ten;`;
    const ketQua = await pool.query(truyVan);
    res.json(ketQua.rows);
  } catch (loi) {
    res.status(500).json({ error: "Loi tai nhom thuoc" });
  }
});

router.get("/", async (req, res) => {
  const { nt_ma, search } = req.query;
  let chuoiDieuKien = "";
  const mangThamSo = [];
  let chiSoThamSo = 1;

  if (nt_ma) {
    chuoiDieuKien += `WHERE t.t_loai_thuoc = $${chiSoThamSo++}`;
    mangThamSo.push(nt_ma);
  }

  if (search) {
    const toanTu = chuoiDieuKien ? " AND" : " WHERE";
    chuoiDieuKien += `${toanTu} t.t_ten_thuoc ILIKE $${chiSoThamSo++}`;
    mangThamSo.push(`%${search}%`);
  }

  try {
    const truyVanNhom = `SELECT nt_ma, nt_ten FROM nhom_thuoc ORDER BY nt_ten;`;
    const ketQuaNhom = await pool.query(truyVanNhom);

    const truyVanGiaHienTai = `
        (SELECT cgt_gia_thuoc 
         FROM co_gia_thuoc 
         WHERE cgt_thuoc_ma = t.t_ma 
         ORDER BY cgt_ngay_ap_dung DESC 
         LIMIT 1)
    `;

    const truyVanThuoc = `
            SELECT
                t.t_ma,
                t.t_ten_thuoc,
                nt.nt_ten AS nhom_thuoc,
                t.t_don_vi_tinh,
                t.t_ham_luong,
                t.t_cach_dung_mac_dinh,
                t.t_huong_dan,
                ${truyVanGiaHienTai} AS gia_hien_tai
            FROM thuoc t
            JOIN nhom_thuoc nt ON t.t_loai_thuoc = nt.nt_ma
            ${chuoiDieuKien}
            ORDER BY t.t_ma DESC;
        `;
    const ketQuaThuoc = await pool.query(truyVanThuoc, mangThamSo);

    res.render("thuoc_danhsach", {
      title: "Quan Ly Thuoc",
      drugs: ketQuaThuoc.rows,
      groups: ketQuaNhom.rows,
      query: req.query,
    });
  } catch (loi) {
    console.error(loi);
    res.status(500).render("loi_hethong", { message: "Loi tai du lieu thuoc" });
  }
});

router.post("/them-moi", async (req, res) => {
  const {
    t_ten_thuoc,
    t_loai_thuoc,
    t_don_vi_tinh,
    t_ham_luong,
    gia_moi,
    t_cach_dung_mac_dinh,
    t_huong_dan,
  } = req.body;

  if (!t_ten_thuoc || !t_loai_thuoc || !t_don_vi_tinh || !gia_moi) {
    return res.status(400).send("Thieu thong tin bat buoc");
  }

  const ketNoi = await pool.connect();
  try {
    await ketNoi.query("BEGIN");

    const truyVanThemThuoc = `
            INSERT INTO thuoc (t_ten_thuoc, t_don_vi_tinh, t_ham_luong, t_loai_thuoc, t_cach_dung_mac_dinh, t_huong_dan)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING t_ma;
        `;
    const ketQuaThuoc = await ketNoi.query(truyVanThemThuoc, [
      t_ten_thuoc,
      t_don_vi_tinh,
      t_ham_luong || null,
      t_loai_thuoc,
      t_cach_dung_mac_dinh || null,
      t_huong_dan || null,
    ]);
    const maThuoc = ketQuaThuoc.rows[0].t_ma;

    const truyVanThemGia = `
        WITH thoi_gian_moi AS (
            INSERT INTO thoi_gian (tg_ngay_ap_dung) 
            VALUES (CURRENT_TIMESTAMP) 
            RETURNING tg_ngay_ap_dung
        )
        INSERT INTO co_gia_thuoc (cgt_ngay_ap_dung, cgt_thuoc_ma, cgt_gia_thuoc)
        SELECT tg_ngay_ap_dung, $1, $2
        FROM thoi_gian_moi;
    `;
    await ketNoi.query(truyVanThemGia, [maThuoc, parseFloat(gia_moi)]);

    await ketNoi.query("COMMIT");
    res.status(201).json({ success: true, message: "Them thuoc thanh cong" });
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    console.error(loi);
    res.status(500).json({ message: "Loi he thong" });
  } finally {
    ketNoi.release();
  }
});

router.post("/cap-nhat-thong-tin/:maThuoc", async (req, res) => {
  const { maThuoc } = req.params;
  const {
    t_ten_thuoc,
    t_loai_thuoc,
    t_don_vi_tinh,
    t_ham_luong,
    t_cach_dung_mac_dinh,
    t_huong_dan,
  } = req.body;

  try {
    const truyVanCapNhat = `
            UPDATE thuoc
            SET 
                t_ten_thuoc = $1,
                t_loai_thuoc = $2,
                t_don_vi_tinh = $3,
                t_ham_luong = $4,
                t_cach_dung_mac_dinh = $5,
                t_huong_dan = $6
            WHERE 
                t_ma = $7
            RETURNING t_ma;
        `;

    const ketQua = await pool.query(truyVanCapNhat, [
      t_ten_thuoc,
      t_loai_thuoc,
      t_don_vi_tinh || null,
      t_ham_luong || null,
      t_cach_dung_mac_dinh || null,
      t_huong_dan || null,
      maThuoc,
    ]);

    if (ketQua.rowCount === 0) {
      return res.status(404).json({ message: "Khong tim thay thuoc" });
    }
    res.status(200).json({ success: true, message: "Cap nhat thanh cong" });
  } catch (loi) {
    console.error(loi);
    res.status(500).json({ message: "Loi he thong" });
  }
});

router.post("/cap-nhat-gia/:maThuoc", async (req, res) => {
  const maThuoc = req.params.maThuoc;
  const { gia_moi } = req.body;

  const ketNoi = await pool.connect();
  try {
    await ketNoi.query("BEGIN");

    const truyVanCapNhatGia = `
        WITH thoi_gian_moi AS (
            INSERT INTO thoi_gian (tg_ngay_ap_dung) 
            VALUES (CURRENT_TIMESTAMP) 
            RETURNING tg_ngay_ap_dung
        )
        INSERT INTO co_gia_thuoc (cgt_ngay_ap_dung, cgt_thuoc_ma, cgt_gia_thuoc)
        SELECT tg_ngay_ap_dung, $1, $2
        FROM thoi_gian_moi;
    `;
    await ketNoi.query(truyVanCapNhatGia, [maThuoc, parseFloat(gia_moi)]);

    await ketNoi.query("COMMIT");
    res.status(200).json({ success: true, message: "Cap nhat gia thanh cong" });
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    res.status(500).json({ message: "Loi cap nhat gia" });
  } finally {
    ketNoi.release();
  }
});

router.post("/xoa/:maThuoc", async (req, res) => {
  const maThuoc = req.params.maThuoc;
  const ketNoi = await pool.connect();

  try {
    await ketNoi.query("BEGIN");

    const truyVanKiemTra = `SELECT 1 FROM chi_tiet_don_thuoc WHERE ctdt_ma_thuoc = $1 LIMIT 1;`;
    const ketQuaKiemTra = await ketNoi.query(truyVanKiemTra, [maThuoc]);

    if (ketQuaKiemTra.rowCount > 0) {
      await ketNoi.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Thuoc da duoc ke don khong the xoa" });
    }

    const truyVanXoaGia = `DELETE FROM co_gia_thuoc WHERE cgt_thuoc_ma = $1;`;
    await ketNoi.query(truyVanXoaGia, [maThuoc]);

    const truyVanXoaThuoc = `DELETE FROM thuoc WHERE t_ma = $1;`;
    const ketQuaXoa = await ketNoi.query(truyVanXoaThuoc, [maThuoc]);

    if (ketQuaXoa.rowCount > 0) {
      await ketNoi.query("COMMIT");
      res.status(200).json({ success: true, message: "Xoa thanh cong" });
    } else {
      await ketNoi.query("ROLLBACK");
      res.status(404).json({ message: "Khong tim thay thuoc" });
    }
  } catch (loi) {
    await ketNoi.query("ROLLBACK");
    console.error(loi);
    res.status(500).json({ message: "Loi he thong" });
  } finally {
    ketNoi.release();
  }
});

router.get("/lich-su/:maThuoc", async (req, res) => {
  const maThuoc = req.params.maThuoc;
  try {
    const truyVanLichSu = `
        SELECT 
            cgt_gia_thuoc,
            cgt_ngay_ap_dung AS bat_dau,
            LEAD(cgt_ngay_ap_dung) OVER (ORDER BY cgt_ngay_ap_dung ASC) AS ket_thuc
        FROM co_gia_thuoc
        WHERE cgt_thuoc_ma = $1
        ORDER BY cgt_ngay_ap_dung DESC;
    `;
    const ketQua = await pool.query(truyVanLichSu, [maThuoc]);
    res.json(ketQua.rows);
  } catch (loi) {
    res.status(500).json({ message: "Loi tai lich su" });
  }
});

router.get("/:maThuoc", async (req, res) => {
  const maThuoc = req.params.maThuoc;
  try {
    const truyVanChiTiet = `SELECT * FROM thuoc WHERE t_ma = $1`;
    const ketQua = await pool.query(truyVanChiTiet, [maThuoc]);
    if (ketQua.rows.length === 0) {
      return res.status(404).json({ message: "Khong tim thay thuoc" });
    }
    res.json(ketQua.rows[0]);
  } catch (loi) {
    res.status(500).json({ message: "Loi tai chi tiet" });
  }
});

module.exports = router;
