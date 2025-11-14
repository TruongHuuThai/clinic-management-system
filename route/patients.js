const express = require('express');
const router = express.Router();
const pool = require('../config/db'); 

router.get("/", async (req, res) => {
  const query = req.query;
  let whereString = "";
  const queryParams = [];

  if (query.search) {
    whereString = `WHERE (bn_ho_ten ILIKE $1 OR bn_sdt ILIKE $1)`; 
    queryParams.push(`%${query.search}%`);
  }

  try {
    const patientsQuery = `
            SELECT bn_ma, bn_ho_ten, bn_sdt, bn_dia_chi, bn_ngay_tao
            FROM benh_nhan 
            ${whereString}
            ORDER BY bn_ngay_tao DESC;
        `;
    const patientResult = await pool.query(patientsQuery, queryParams);

    res.render("patient_list", {
      patients: patientResult.rows,
      title: "Danh Sách Bệnh Nhân",
      query: query,
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách bệnh nhân:", error);
    res
      .status(500)
      .render("error_page", {
        message: "Lỗi hệ thống khi tải danh sách bệnh nhân.",
      });
  }
});

router.get('/:bn_ma', async (req, res) => {
    const bn_ma = req.params.bn_ma;
    
    try {

        const patientQuery = `SELECT * FROM benh_nhan WHERE bn_ma = $1`;
        const patientResult = await pool.query(patientQuery, [bn_ma]);
        
        if (patientResult.rows.length === 0) {
            return res.status(404).render('error_page', { message: 'Không tìm thấy bệnh nhân.' });
        }
        
        const patient = patientResult.rows[0];

        const historyQuery = `
            SELECT pkb_ma, pkb_ngay_kham, pkb_trieu_chung 
            FROM phieu_kham_benh 
            WHERE pkb_ma_bn = $1 
            ORDER BY pkb_ngay_kham DESC;
        `;
        const historyResult = await pool.query(historyQuery, [bn_ma]);

        res.render('patient_detail_page', {
            patient: patient,
            history: historyResult.rows
        });

    } catch (error) {
        console.error("Lỗi khi tải hồ sơ bệnh nhân:", error);
        res.status(500).render('error_page', { message: 'Lỗi hệ thống khi tải hồ sơ.' });
    }
});

router.get('/new/:lh_ma', async (req, res) => {
    const lh_ma = req.params.lh_ma;

    try {
        const lichHenQuery = `
            SELECT bn_ma, bs_ma, lh_ngay_kham 
            FROM lich_hen 
            WHERE lh_ma = $1;
        `;
        const lichHenRes = await pool.query(lichHenQuery, [lh_ma]);

        if (!lichHenRes || lichHenRes.rows.length === 0) {
            return res.status(404).render('error_page', { message: 'Không tìm thấy Lịch Hẹn này.' });
        }

        const bn_ma = lichHenRes.rows[0].bn_ma;
        const ngayKham = lichHenRes.rows[0].lh_ngay_kham; 

        const benhNhanQuery = `
            SELECT bn_ma, bn_ho_ten, bn_tuoi, bn_gioi_tinh, bn_dia_chi, bn_tien_su
            FROM benh_nhan 
            WHERE bn_ma = $1;
        `;
        const benhNhanRes = await pool.query(benhNhanQuery, [bn_ma]);

        const benhNhan = benhNhanRes.rows.length > 0 ? benhNhanRes.rows[0] : {};

        benhNhan.ngayKham = ngayKham;
        
        return res.render('phieukhambenh_form', {
            benhNhan: benhNhan,     
            lh_ma: lh_ma      
        });

    } catch (error) {
        console.error("Lỗi khi lấy thông tin khám bệnh:", error);
        return res.status(500).render('error_page', { message: 'Lỗi hệ thống khi tải phiếu khám (Lỗi truy vấn).' });
    }
});

router.post('/save', async (req, res) => {
    const { 
        pkb_ma_bn, lh_ma, pkb_trieu_chung, pkb_ghi_chu, 
        b_ma, 
        dt_ghi_chu, 
        thuoc_ma, so_luong, cach_dung
    } = req.body; 

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const pkbQuery = `
            INSERT INTO phieu_kham_benh (pkb_ma_bn, pkb_ngay_kham, pkb_trieu_chung, pkb_ghi_chu)
            VALUES ($1, NOW(), $2, $3) 
            RETURNING pkb_ma;
        `;
        const pkbRes = await client.query(pkbQuery, [pkb_ma_bn, pkb_trieu_chung, pkb_ghi_chu]);
        const pkb_ma = pkbRes.rows[0].pkb_ma;

        if (b_ma) {
            const chanDoanQuery = `
                INSERT INTO chan_doan (cd_ma_pkb, cd_ma_b) 
                VALUES ($1, $2);
            `;
            await client.query(chanDoanQuery, [pkb_ma, b_ma]);
        }

        const dtQuery = `
            INSERT INTO don_thuoc (dt_ma_pkb, dt_ghi_chu, dt_ngay_tao)
            VALUES ($1, $2, NOW()) 
            RETURNING dt_ma;
        `;
        const dtRes = await client.query(dtQuery, [pkb_ma, dt_ghi_chu]);
        const dt_ma = dtRes.rows[0].dt_ma;

        if (Array.isArray(thuoc_ma)) {
            const chiTietDtQuery = `
                INSERT INTO chi_tiet_don_thuoc (ctdt_ma_dt, ctdt_ma_t, ctdt_so_luong, ctdt_cach_dung)
                VALUES ($1, $2, $3, $4);
            `;
            for (let i = 0; i < thuoc_ma.length; i++) {
                if (thuoc_ma[i] && so_luong[i] && cach_dung[i]) {
                    await client.query(chiTietDtQuery, [dt_ma, thuoc_ma[i], so_luong[i], cach_dung[i]]);
                }
            }
        }

        const updateLhQuery = `
            UPDATE lich_hen 
            SET lh_trang_thai = 'DA_HOAN_THANH' 
            WHERE lh_ma = $1;
        `;
        await client.query(updateLhQuery, [lh_ma]);

        await client.query('COMMIT'); 
        res.redirect(`/api/patients/${pkb_ma_bn}`); 

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("LỖI TRANSACTION KHI LƯU KHÁM BỆNH:", error);
        res.status(500).send('Lỗi máy chủ khi lưu dữ liệu khám bệnh.');
    } finally {
        client.release();
    }
});

module.exports = router;