let globalOccupiedSlots = [];

function generateTimeSlotsHTML(currentSlotValue) {
  let html = "";
  const periods = [
    { start: 7, end: 11, label: "Sáng" },
    { start: 13, end: 20, label: "Chiều" },
  ];

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

      if (!isOccupied || timeString === currentSlotValue) {
        const isSelected = timeString === currentSlotValue ? "selected" : "";
        html += `<option value="${timeString}" ${isSelected}>${timeString} (${period.label})</option>`;
      }

      current += 30;
    }
  });
  return html;
}

async function loadAvailableSlots(appointmentId, selectedSlot) {
  let appointmentDateVN = document.getElementById("ngay_hen").value;
  const selectElement = document.getElementById("khung_gio");

  if (!appointmentDateVN || !selectElement) return;

  let appointmentDateISO = appointmentDateVN;
  if (appointmentDateVN.includes("/")) {
    const parts = appointmentDateVN.split("/");

    if (parts.length === 3) {
      appointmentDateISO = `${parts[2]}-${parts[1].padStart(
        2,
        "0"
      )}-${parts[0].padStart(2, "0")}`;
    }
  } else {
    appointmentDateISO = appointmentDateVN.substring(0, 10);
  }

  try {
    const apiUrl = `/api/appointments/occupied_slots/${appointmentId}?date=${appointmentDateISO}`;
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error("Failed to fetch occupied slots");

    const result = await response.json();
    globalOccupiedSlots = result.occupiedSlots;

    selectElement.innerHTML = generateTimeSlotsHTML(selectedSlot);
  } catch (error) {
    console.error("Lỗi khi tải slot:", error);
    alert("Không thể kiểm tra khung giờ trống. Vui lòng thử lại.");
  }
}
function initializeFormLogic(appointmentId, currentSlot, initialSlots) {
  const form = document.getElementById("editAppointmentForm");
  const selectElement = document.getElementById("khung_gio");
  const dateInput = document.getElementById("ngay_hen");

  globalOccupiedSlots = initialSlots || [];

  if (selectElement && currentSlot) {
    selectElement.innerHTML = generateTimeSlotsHTML(currentSlot);
  } else {
    console.error("Lỗi: Không tìm thấy SELECT element hoặc currentSlot.");
  }

  if (form && appointmentId) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      saveAppointment(appointmentId);
    });
  }

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      const selectedSlot = selectElement.value;
      loadAvailableSlots(appointmentId, selectedSlot);
    });
  }
}

async function saveAppointment(appointmentId) {
  const form = document.getElementById("editAppointmentForm");

  const ngayHenVN = form.querySelector("#ngay_hen").value;
  const khungGio = form.querySelector("#khung_gio").value;
  const trangThai = form.querySelector("#trang_thai").value;
  const ghiChu = form.querySelector("#ghi_chu").value;

  let ngayHenISO = ngayHenVN;

  if (ngayHenVN && ngayHenVN.includes("/")) {
    const parts = ngayHenVN.split("/");
    ngayHenISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const updatedData = {
    ngay_hen: ngayHenISO,
    khung_gio: khungGio,
    trang_thai: trangThai,
    ghi_chu: ghiChu,
  };

  const apiUrl = `/api/appointments/${appointmentId}`;

  try {
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const errorResult = await response.json();
      throw new Error(
        errorResult.message || `Lỗi server HTTP: ${response.status}`
      );
    }

    $("<div></div>")
      .html(
        '<i class="fas fa-check-circle text-success me-2"></i> Lưu thay đổi thành công!'
      )
      .dialog({
        modal: true,
        title: "Cập nhật Thành công",
        classes: {
          "ui-dialog": "success-dialog",
        },
        buttons: [],
        close: function () {
          $(this).dialog("destroy").remove();
        },
      });

    setTimeout(() => {
      window.location.href = "/api/appointments";
    }, 1000);
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu cập nhật:", error);
    alert(
      `Lỗi kết nối hoặc server: ${error.message || "Không thể lưu thay đổi."}`
    );
  }
}

function danhSachBenhNhan() {
  window.location.href = "/api/patients";
}

function danhSachLichHen() {
  window.location.href = "/api/appointments";
}
