// config/db.js

const { Pool } = require('pg');

// Khai báo thông số kết nối PostgreSQL
const pool = new Pool({
    user: 'postgres',           // <<< THAY THẾ bằng username CSDL của bạn (Ví dụ: 'postgres')
    host: 'localhost',          // Địa chỉ máy chủ (mặc định là 'localhost')
    database: 'clinic-management-system',      // <<< THAY THẾ bằng TÊN CSDL của bạn (Ví dụ: 'clinic_management')
    password: 'Thai@0867504590',  // <<< THAY THẾ bằng MẬT KHẨU CSDL của bạn
    port: 5432,                 // Cổng mặc định của PostgreSQL
});

// Kiểm tra kết nối
pool.on('connect', () => {
    console.log('✅ Successfully connected to PostgreSQL database.');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error - Check your credentials and server status:', err.message);
    // Thoát ứng dụng nếu lỗi CSDL nghiêm trọng
    process.exit(-1);
});

// Xuất đối tượng pool để các file khác có thể sử dụng
module.exports = pool;