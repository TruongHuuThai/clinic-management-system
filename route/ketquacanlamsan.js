const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/nhap/:pcdMa", async (req, res) => {
  const pcdMa = req.params.pcdMa;

  try {
    const mainQuery = `
            SELECT 
                ctcd.ctcd_ma, 
                ctcd.ctcd_ma_dvcls,
                ctcd.ctcd_so_luong,
                ctcd.ctcd_trang_thai,
                dv.dvcls_ten, 
                pkb.pkb_ma_bn
            FROM chi_tiet_chi_dinh ctcd
            JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
            JOIN phieu_chi_dinh pcd ON ctcd.ctcd_ma_pcd = pcd.pcd_ma
            JOIN phieu_kham_benh pkb ON pcd.pcd_ma_pkb = pkb.pkb_ma
            WHERE ctcd.ctcd_ma_pcd = $1
            LIMIT 1;
        `;
    const result = await pool.query(mainQuery, [pcdMa]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .render("error_page", { message: "Không tìm thấy chi tiết chỉ định." });
    }

    const bn_ma = result.rows[0].pkb_ma_bn;

    const patientQuery = `
            SELECT bn_ho_ten FROM benh_nhan WHERE bn_ma = $1;
        `;
    const patientResult = await pool.query(patientQuery, [bn_ma]);
    const bn_ho_ten = patientResult.rows[0].bn_ho_ten;

    const ctcdListQuery = `
            SELECT 
                ctcd.ctcd_ma, 
                ctcd.ctcd_so_luong, 
                dv.dvcls_ten, 
                ctcd.ctcd_trang_thai,
                dv.dvcls_loai
            FROM chi_tiet_chi_dinh ctcd
            JOIN dich_vu_can_lam_san dv ON ctcd.ctcd_ma_dvcls = dv.dvcls_ma
            WHERE ctcd.ctcd_ma_pcd = $1
            ORDER BY ctcd.ctcd_ma;
        `;
    const ctcdListResult = await pool.query(ctcdListQuery, [pcdMa]);

    res.render("ketqua_form", {
      pcdMa: pcdMa,
      ctcdList: ctcdListResult.rows,
      bn_ma: bn_ma,
      bn_ho_ten: bn_ho_ten,
    });
  } catch (error) {
    console.error("LỖI KHI TẢI FORM NHẬP KẾT QUẢ:", error);
    res.status(500).render("error_page", {
      message: "Lỗi hệ thống khi tải form kết quả cận lâm sàng.",
    });
  }
});

router.post("/save", async (req, res) => {
  const pcdMa = req.body.pcd_ma;

  const ctcdMAs = Array.isArray(req.body["ctcd_ma[]"])
    ? req.body["ctcd_ma[]"]
    : req.body["ctcd_ma[]"]
    ? [req.body["ctcd_ma[]"]]
    : [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let savedCount = 0;

    for (const ctcdMa of ctcdMAs) {
      if (!ctcdMa) continue;

      const kqclsMota = req.body[`kqcls_mota_${ctcdMa}`];
      const kqclsTrangThai = req.body[`ctcd_trang_thai_${ctcdMa}`];

      if (kqclsMota) {
        const insertKqclsQuery = `
					INSERT INTO ket_qua_can_lam_san (kqcls_ma_ctcd, kqcls_mota, kqcls_ket_luan)
					VALUES ($1, $2, $3);
				`;
        await client.query(insertKqclsQuery, [ctcdMa, kqclsMota, null]);

        const updateCtcdQuery = `
					UPDATE chi_tiet_chi_dinh
					SET ctcd_trang_thai = $1
					WHERE ctcd_ma = $2;
				`;
        await client.query(updateCtcdQuery, [
          kqclsTrangThai || "DA_CO_KET_QUA",
          ctcdMa,
        ]);
        savedCount++;
      }
    }

    await client.query("COMMIT");

    res.redirect(`/api/thanhtoan/lap-phieu/${pcdMa}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("LỖI KHI LƯU KẾT QUẢ CẬN LÂM SÀNG:", error);
    res.status(500).send("Lỗi máy chủ khi lưu kết quả cận lâm sàng.");
  } finally {
    client.release();
  }
});

module.exports = router;
