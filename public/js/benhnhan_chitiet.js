let globalOccupiedSlots = []; 
let maBenhNhanDangXem = null;

function generateTimeSlotsHTML(selectedSlot) {
  let html = '<option value=""> Chọn khung giờ </option>';

  const periods = [
    { start: 7, end: 11, label: "Sáng" },
    { start: 13, end: 17, label: "Chiều" },
  ];

  let hasSlot = false;

  periods.forEach((period) => {
    let current = period.start * 60; 
    const end = period.end * 60;

    while (current <= end) {
      const hour = Math.floor(current / 60);
      const minute = current % 60;
      const timeString = `${String(hour).padStart(2, "0")}:${String(
        minute
      ).padStart(2, "0")}`;

      const isOccupied = globalOccupiedSlots.includes(timeString);
      if (!isOccupied) {
        html += `<option value="${timeString}">${timeString} (${period.label})</option>`;
        hasSlot = true;
      } else {
        html += `<option value="${timeString}" disabled class="text-muted bg-light">${timeString} (Đã kín)</option>`;
      }

      current += 30;
    }
  });

  if (!hasSlot) {
    html = '<option value="">Ngày này đã kín lịch</option>';
  }

  return html;
}

async function loadAvailableSlots(dateText) {
  const selectElement = document.getElementById("reschedule_time");
  if (!dateText || !selectElement) return;

  selectElement.innerHTML = "<option>Đang tải dữ liệu...</option>";
  selectElement.disabled = true;

  const parts = dateText.split("/");
  if (parts.length !== 3) {
    alert("Ngày không hợp lệ");
    return;
  }
  const dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  try {
    console.log("Đang tải lịch cho ngày:", dateISO);
    const response = await fetch(
      `/api/lich-hen/khung-gio-ban/0?ngay=${dateISO}`
    );

    if (!response.ok) throw new Error("Lỗi tải khung giờ");

    const result = await response.json();
    globalOccupiedSlots = result.occupiedSlots || [];

    selectElement.innerHTML = generateTimeSlotsHTML(null);
    selectElement.disabled = false;
  } catch (error) {
    console.error("Lỗi tải slot:", error);
    selectElement.innerHTML = '<option value="">Lỗi tải giờ</option>';
    selectElement.disabled = false;
  }
}

function modalThemLichTaiKham(maBenhNhan) {
  maBenhNhanDangXem = maBenhNhan;
  const modalEl = document.getElementById("rescheduleModal");
  const modalInstance = new bootstrap.Modal(modalEl);

  document.getElementById("rescheduleForm").reset();
  document.getElementById("reschedule_bn_ma").value = maBenhNhan;

  document.getElementById("reschedule_time").innerHTML =
    '<option value="">-- Vui lòng chọn ngày trước --</option>';

  modalInstance.show();
  $("#reschedule_date").datepicker("destroy");

  $("#reschedule_date").datepicker({
    dateFormat: "dd/mm/yy",
    minDate: 1,
    changeMonth: true,
    changeYear: true,
    onSelect: function (dateText) {
      loadAvailableSlots(dateText);
    },
  });
}

async function luuLichTaiKham() {
  const maBN = document.getElementById("reschedule_bn_ma").value;
  const ngayHenVal = document.getElementById("reschedule_date").value;
  const khungGio = document.getElementById("reschedule_time").value;
  const ghiChu = document.getElementById("reschedule_note").value;

  if (!ngayHenVal || !khungGio) {
    alert("Vui lòng chọn Ngày và Giờ hẹn.");
    return;
  }

  const parts = ngayHenVal.split("/");
  const ngayHenISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  try {
    const response = await fetch("/api/lich-hen/dat-lich-tai-kham", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maBenhNhan: maBN,
        ngay_hen: ngayHenISO,
        khung_gio: khungGio,
        ghi_chu: ghiChu,
        trang_thai: "TAI_KHAM",
      }),
    });

    const result = await response.json();

    if (response.ok) {
      const modalEl = document.getElementById("rescheduleModal");
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Đã đặt lịch tái khám thành công!");
      } else {
        alert("Đã đặt lịch tái khám thành công!");
        window.location.reload();
      }
    } else {
      alert("Lỗi: " + (result.message || "Lỗi server"));
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi kết nối server.");
  }
}


function xoaLichHen(maLichHen) {
  if (!maLichHen) return;
  if (!confirm("Bạn có chắc chắn muốn hủy lịch hẹn này?")) return;

  fetch(`/api/lich-hen/${maLichHen}`, { method: "DELETE" })
    .then((res) => {
      if (res.ok) {
        alert("Đã hủy lịch hẹn.");
        window.location.reload();
      } else {
        alert("Lỗi khi hủy lịch.");
      }
    })
    .catch((err) => alert("Lỗi kết nối."));
}

async function modalSuaLichHen(maLichHen) {
  try {
    const res = await fetch(`/api/lich-hen/api/${maLichHen}`);
    if (!res.ok) throw new Error("Lỗi tải dữ liệu");

    const lh = await res.json();

    document.getElementById("edit_lh_ma").value = lh.lh_ma;
    document.getElementById("edit_lh_ghi_chu").value = lh.lh_ghi_chu || "";
    document.getElementById("edit_lh_trang_thai").value = lh.lh_trang_thai;

    let dateStr = "";
    if (lh.lh_ngay_hen) {
      const d = new Date(lh.lh_ngay_hen);
      dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getFullYear()}`;
    }
    document.getElementById("edit_lh_ngay").value = dateStr;

    await loadAvailableSlotsForEdit(dateStr, lh.lh_khung_gio);

    const modalEl = document.getElementById("editAppointmentModal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    $("#edit_lh_ngay").datepicker({
      dateFormat: "dd/mm/yy",
      onSelect: function (dateText) {
        loadAvailableSlotsForEdit(dateText, null); 
      },
    });
  } catch (err) {
    console.error(err);
    alert("Không thể tải thông tin lịch hẹn.");
  }
}

async function loadAvailableSlotsForEdit(dateText, currentSlot) {
  const selectEl = document.getElementById("edit_lh_gio");
  if (!dateText) return;

  const parts = dateText.split("/");
  const dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  try {
    const res = await fetch(`/api/lich-hen/khung-gio-ban/0?ngay=${dateISO}`);
    const result = await res.json();

    globalOccupiedSlots = result.occupiedSlots || [];

    let html = generateTimeSlotsHTML(currentSlot); 
    selectEl.innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}

async function luuCapNhatLichHen() {
  const maLichHen = document.getElementById("edit_lh_ma").value;
  const ngayHenVal = document.getElementById("edit_lh_ngay").value;
  const khungGio = document.getElementById("edit_lh_gio").value;
  const trangThai = document.getElementById("edit_lh_trang_thai").value;
  const ghiChu = document.getElementById("edit_lh_ghi_chu").value;

  if (!ngayHenVal || !khungGio) {
    alert("Vui lòng chọn ngày và giờ.");
    return;
  }

  const parts = ngayHenVal.split("/");
  const ngayHenISO = `${parts[2]}-${parts[1]}-${parts[0]}`;

  try {
    const res = await fetch(`/api/lich-hen/${maLichHen}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ngay_hen: ngayHenISO,
        khung_gio: khungGio,
        trang_thai: trangThai,
        ghi_chu: ghiChu,
      }),
    });

    if (res.ok) {
      bootstrap.Modal.getInstance(
        document.getElementById("editAppointmentModal")
      ).hide();
      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Cập nhật lịch hẹn thành công!");
      } else {
        window.location.reload();
      }
    } else {
      alert("Lỗi cập nhật.");
    }
  } catch (err) {
    alert("Lỗi kết nối.");
  }
}

let maLichHenXoa = null;
function modalXoaLichHen(maLichHen) {
  maLichHenXoa = maLichHen;
  const modal = new bootstrap.Modal(
    document.getElementById("deleteAppointmentModal")
  );
  modal.show();

  document.getElementById("btnConfirmDeleteAppt").onclick = async function () {
    try {
      const res = await fetch(`/api/lich-hen/${maLichHenXoa}`, {
        method: "DELETE",
      });
      if (res.ok) {
        bootstrap.Modal.getInstance(
          document.getElementById("deleteAppointmentModal")
        ).hide();
        if (typeof hienThiThongBaoThanhCong === "function") {
          hienThiThongBaoThanhCong("Đã xóa lịch hẹn!");
        } else {
          window.location.reload();
        }
      } else {
        alert("Không thể xóa.");
      }
    } catch (err) {
      alert("Lỗi kết nối.");
    }
  };
}

function chuyenTrangSuaLich(maLichHen) {
  if (!maLichHen) return;
  window.location.href = `/api/lich-hen/sua/${maLichHen}`;
}

function chuyenTrangSuaHoSo(maBenhNhan) {
  window.location.href = `/api/benh-nhan`;
}
