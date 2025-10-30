// app.js

const express = require('express');
const app = express();
const path = require('path');
// Import kết nối DB (pool) - Giả sử tồn tại file config/db.js
const pool = require('./config/db');

// Import các route từ thư mục route/
const dashboardRoute = require('./route/dashboard');
const appointmentsRoute = require('./route/appointments');


// --- CẤU HÌNH MIDDLEWARE ---
app.use(express.json()); // Cần thiết để đọc req.body cho API PUT/POST

// Phân tích URL-encoded data
app.use(express.urlencoded({ extended: true }));

//  CẤU HÌNH VIEW ENGINE VÀ TỆP TĨNH 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// SỬ DỤNG ROUTE 
app.use('/', dashboardRoute);
app.use('/api', appointmentsRoute);


// KHỞI CHẠY SERVER 
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});