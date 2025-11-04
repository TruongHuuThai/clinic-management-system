// public/js/dashboard.js

// Hàm tiepDon nhận chính nút được click (element) làm đối số
function receive(buttonElement) {
    // 1. Lấy Mã Lịch Hẹn (ID) từ thuộc tính data-id của nút
    const appointmentId = buttonElement.getAttribute('data-id');

    if (!appointmentId) {
        console.error("Lỗi JS: Không tìm thấy Mã Lịch Hẹn (data-id).");
        return;
    }

    // 2. Hiển thị hộp thoại xác nhận
    const confirmation = confirm(`Xác nhận tiếp đón bệnh nhân cho lịch hẹn #${appointmentId}?`);

    // 3. Xử lý khi xác nhận (Có/OK)
    if (confirmation) {
        // Cấu hình URL API (Khớp với app.use('/api', ...) và router.post('/appointment/:id/status'))
        const apiUrl = `/api/appointment/${appointmentId}/status`; 
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                // CẦN thiết lập Content-Type để server (express.json()) có thể đọc body
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                newStatus: 'DA DEN' 
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Cập nhật thất bại. Mã lỗi: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Cập nhật trạng thái thành công:", data);

            // 4. Cập nhật giao diện (UI)
            
            // a. Cập nhật thẻ trạng thái
            const displayStatusSpan = document.getElementById(`display-status-${appointmentId}`);
            if (displayStatusSpan) {
                // Thay đổi chữ hiển thị
                displayStatusSpan.previousElementSibling.textContent = 'ĐÃ ĐẾN'; 
                // Thay đổi class CSS nếu cần: displayStatusSpan.previousElementSibling.classList.remove('status-chua_den');
            }

            // b. Thay đổi nút hành động (Ẩn Tiếp Đón, Hiện Bắt Đầu Khám)
            const actionContainer = buttonElement.closest('td').querySelector('#action-buttons-' + appointmentId);
            
            // Lấy nút Bắt đầu Khám (nút ẩn)
            const startExamButton = buttonElement.nextElementSibling;
            
            // Ẩn nút "Tiếp Đón" hiện tại
            buttonElement.style.display = 'none';

            // Hiện nút "Bắt đầu Khám"
            if (startExamButton) {
                startExamButton.style.display = 'inline-block';
            }
            
            alert("Tiếp đón thành công!");
        })
        .catch(error => {
            console.error("Lỗi khi cập nhật trạng thái:", error);
            alert(`Thao tác thất bại: ${error.message}`);
        });

    } else {
        console.log("Hủy thao tác tiếp đón.");
    }
}

// Hàm giả định cho nút Bắt đầu Khám
function examination(buttonElement) {
    const appointmentId = buttonElement.getAttribute('data-id');
    alert(`Chuyển đến màn hình khám cho lịch hẹn ID: ${appointmentId}`);
    // Thực tế: window.location.href = `/khambenh/${appointmentId}`;
}

function danhSachLichHen(){
    window.location.href = "/api/appointments";
}
