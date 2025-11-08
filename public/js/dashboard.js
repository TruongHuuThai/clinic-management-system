function receive(buttonElement) {
    const appointmentId = buttonElement.getAttribute('data-id');
    if (!appointmentId) {
        console.error("Lỗi JS: Không tìm thấy Mã Lịch Hẹn (data-id).");
        return;
    }
    const confirmation = confirm(`Xác nhận tiếp đón bệnh nhân cho lịch hẹn #${appointmentId}?`);

    if (confirmation) {
        const apiUrl = `/api/appointment/${appointmentId}/status`; 
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
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
            const displayStatusSpan = document.getElementById(`display-status-${appointmentId}`);
            if (displayStatusSpan) {
                displayStatusSpan.previousElementSibling.textContent = 'ĐÃ ĐẾN'; 
            }
            const actionContainer = buttonElement.closest('td').querySelector('#action-buttons-' + appointmentId);
            const startExamButton = buttonElement.nextElementSibling;
            buttonElement.style.display = 'none';
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

function examination(buttonElement) {
    const appointmentId = buttonElement.getAttribute('data-id');
    alert(`Chuyển đến màn hình khám cho lịch hẹn ID: ${appointmentId}`);
}