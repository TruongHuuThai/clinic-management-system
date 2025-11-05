// Khai báo biến cần thiết (Bạn cần đảm bảo biến này là global)
let globalOccupiedSlots = []; 

const ALL_TIME_SLOTS = [
    { value: '08:00', label: '08:00 - 09:00 (Sáng)' },
    { value: '10:00', label: '10:00 - 11:00 (Sáng)' },
    { value: '14:00', label: '14:00 - 15:00 (Chiều)' },
    { value: '16:00', label: '16:00 - 17:00 (Chiều)' }
];

// Hàm tạo HTML cho các slots (Dựa trên mã gốc của bạn)
function generateTimeSlotsHTML(currentSlotValue) {
    let html = '';
    const periods = [
        { start: 7, end: 11, label: "Sáng" },
        { start: 13, end: 20, label: "Chiều" }
    ];

    periods.forEach(period => {
        let current = period.start * 60;
        const end = period.end * 60;

        while (current <= end) {
            const hour = Math.floor(current / 60);
            const minute = current % 60;
            const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

            const isOccupied = globalOccupiedSlots.includes(timeString);

            // Tinh chỉnh logic: Chỉ hiển thị slot nếu nó KHÔNG bị chiếm
            if (!isOccupied) {
                const isSelected = timeString === currentSlotValue ? 'selected' : '';
                html += `<option value="${timeString}" ${isSelected}>${timeString} (${period.label})</option>`;
            }

            current += 30;
        }
    });
    
    if (html === '') {
        return '<option value="" disabled selected>Không còn khung giờ trống</option>';
    }
    
    return html;
}

// Hàm tải slot có sẵn từ API
async function loadAvailableSlots(selectedSlot) { 
    const date = document.getElementById('appointment_date').value;
    const slotSelect = document.getElementById('khung_gio');
    
    // Luôn đặt trạng thái tải khi bắt đầu
    slotSelect.innerHTML = '<option value="" disabled selected>Đang tải...</option>';

    if (!date) {
        slotSelect.innerHTML = '<option value="" disabled selected>Chọn ngày trước</option>';
        return;
    }

    try {
        // ID=0: Tạo lịch hẹn mới, không cần loại trừ lịch hẹn cũ
        const appointmentId = 0; 
        const apiUrl = `/api/appointments/occupied_slots/${appointmentId}?date=${date}`; 
        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error('Failed to fetch available slots');

        const result = await response.json();
        globalOccupiedSlots = result.occupiedSlots; 

        // Tái tạo HTML
        slotSelect.innerHTML = generateTimeSlotsHTML(selectedSlot);

    } catch (error) {
        console.error("Lỗi khi tải slot:", error);
        alert("Không thể kiểm tra khung giờ trống.");
        slotSelect.innerHTML = '<option value="" disabled selected>Lỗi tải khung giờ</option>';
    }
}

// HÀM CHÍNH: Hiển thị form tái khám
function showTaiKhamForm() {
    const container = document.getElementById('reschedule-form-container');
    const dateInput = document.getElementById('appointment_date');
    
    // 1. Đặt ngày mặc định và hiển thị
    dateInput.valueAsDate = new Date(); 
    document.getElementById('form-message').textContent = '';
    container.style.display = 'block';
    
    // 2. Gắn/Gỡ Listener (Sử dụng hàm bọc để duy trì listener và loại bỏ lỗi gọi hàm cũ)
    // Tách hàm listener ra để dễ dàng gỡ bỏ
    const slotChangeListener = () => loadAvailableSlots(null);

    // Xóa listener cũ và thêm listener mới cho trường ngày
    dateInput.removeEventListener('change', slotChangeListener); 
    dateInput.addEventListener('change', slotChangeListener); 

    // 3. Tải slots ban đầu
    loadAvailableSlots(null); 
}

// HÀM SUBMIT TÁI KHÁM (Không thay đổi)
async function submitTaiKham(patientId) {
    const date = document.getElementById('appointment_date').value;
    const note = document.getElementById('appointment_note').value;
    const slotSelect = document.getElementById('khung_gio');
    const timeSlot = slotSelect.value; 
    const messageEl = document.getElementById('form-message');

    if (!date || !timeSlot) {
        messageEl.textContent = 'Vui lòng chọn Ngày Hẹn và Khung Giờ.';
        messageEl.style.color = 'red';
        return;
    }

    try {
        const response = await fetch('/api/appointments/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: patientId,
                ngay_hen: date,
                ghi_chu: note,
                khung_gio: timeSlot,
                trang_thai: 'THEO_LICH'
            })
        });
        
        const result = await response.json();

        if (response.ok) {
            messageEl.textContent = '✅ Đã tạo lịch tái khám thành công!';
            messageEl.style.color = 'green';
            setTimeout(() => { window.location.reload(); }, 1000); 
        } else {
            messageEl.textContent = `Lỗi: ${result.message || 'Không thể tạo lịch hẹn.'}`;
            messageEl.style.color = 'red';
        }
        
    } catch (error) {
        messageEl.textContent = ' Lỗi kết nối máy chủ.';
        messageEl.style.color = 'red';
        console.error('Lỗi khi gửi lịch tái khám:', error);
    }
}

function hideTaiKhamForm() {
    document.getElementById('reschedule-form-container').style.display = 'none';
}

function danhSachBenhNhan(){ window.location.href = "/api/patients"; }
function danhSachLichHen(){ window.location.href = "/api/appointments"; }
function capNhatHoSoBenhNhan(bn_ma) { window.location.href = `/api/patient_detail/edit/${bn_ma}`; }