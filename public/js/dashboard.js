function receive(buttonElement) {
    const appointmentId = buttonElement.getAttribute('data-id');
    const appointmentName = buttonElement.getAttribute('data-name');
    
    if (!appointmentId) {
        console.error("Lỗi JS: Không tìm thấy Mã Lịch Hẹn (data-id).");
        return;
    }
    const confirmation = confirm(`Xác nhận tiếp đón bệnh nhân ${appointmentName} cho lịch hẹn?`);

    if (confirmation) {
        const apiUrl = `/api/appointment/${appointmentId}/status`; 
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                newStatus: 'DA_DEN'
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(`Cập nhật thất bại. Server: ${text}`); });
            }
            return response.json();
        })
        .then(data => {
            const tdElement = buttonElement.closest('td');
            const statusSpan = tdElement.querySelector('.status-badge');
            const tiepDonBtn = tdElement.querySelector('.btn-tiep-don');
            const batDauKhamBtn = tdElement.querySelector('.btn-bat-dau-kham');
            if (statusSpan) {
                statusSpan.textContent = 'Đã đến';
                statusSpan.className = 'status-badge status status-daden'; 
            }
        
            if (tiepDonBtn) {
                tiepDonBtn.style.display = 'none';
            }
            if (batDauKhamBtn) {
                batDauKhamBtn.style.display = 'inline-block';
            }
            
            alert(`Đã tiếp đón ${appointmentName} thành công!`);
            window.location.reload();
        })
        .catch(error => {
            console.error("Lỗi khi cập nhật trạng thái:", error);
            alert(`Thao tác thất bại: ${error.message}`);
        });

    } else {
        console.log("Hủy thao tác tiếp đón.");
    }
}

async function examination(buttonElement) {
    const appointmentId = buttonElement.getAttribute('data-id');
    const appointmentName = buttonElement.getAttribute('data-name');

    if (!appointmentId) {
        console.error("Lỗi JS: Không tìm thấy Mã Lịch Hẹn (data-id).");
        return;
    }
    const confirmation = confirm(`Xác nhận bắt đầu khám cho bệnh nhân ${appointmentName} có lịch hẹn ${appointmentId}?`);

    if (confirmation) {
        const statusApiUrl = `/api/appointment/${appointmentId}/status`; 
        
        try {
            const statusResponse = await fetch(statusApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newStatus: 'DANG_KHAM' }), 
            });
            
            if (!statusResponse.ok) {
                const errorText = await statusResponse.text();
                throw new Error(`Lỗi cập nhật trạng thái: ${errorText}`);
            }

            window.location.href = `/api/phieukhambenh/new/${appointmentId}`; 

        } catch (error) {
            console.error("LỖI KHỞI TẠO KHÁM BỆNH:", error);
            alert(`Thao tác thất bại: ${error.message || 'Không thể bắt đầu khám.'}`);
        }
    }
}



