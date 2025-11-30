const trangThaiCLS = {
  CHO_THUC_HIEN: "Chờ thực hiện",
  DANG_THUC_HIEN: "Đang thực hiện",
  DA_CO_KET_QUA: "Đã có kết quả",
  DA_HUY: "Đã hủy",
  DA_CHI_DINH: "Đã chỉ định",
};

function getDisplayStatus(statusCode) {
  return trangThaiCLS[statusCode] || statusCode;
}

function updateStatusAndReload(
  appointmentId,
  newStatus,
  appointmentName,
  isExamination = false
) {
  const apiUrl = `/api/appointments/${appointmentId}/status`;

  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newStatus: newStatus,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(`Cập nhật thất bại. Server: ${text}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      if (isExamination) {
        window.location.href = `/api/phieukhambenh/new/${appointmentId}`;
      } else {
        window.location.reload();
      }
    })
    .catch((error) => {
      console.error("Lỗi khi cập nhật trạng thái:", error);
      alert(`Thao tác thất bại: ${error.message}`);
    });
}

function receive(buttonElement) {
  const appointmentId = buttonElement.getAttribute("data-id");
  const appointmentName = buttonElement.getAttribute("data-name");

  if (!appointmentId) {
    console.error("Lỗi JS: Không tìm thấy Mã Lịch Hẹn (data-id).");
    return;
  }

  $("<div></div>")
    .html(
      `Xác nhận tiếp đón bệnh nhân <strong>${appointmentName}</strong> (Mã LH: ${appointmentId})?`
    )
    .dialog({
      resizable: false,
      modal: true,
      title: "Xác nhận",
      closeOnEscape: false,

      open: function (event, ui) {
        $(this).parent().find(".ui-dialog-titlebar-close").hide();
      },

      buttons: {
        "Xác nhận": function () {
          $(this).dialog("close");
          updateStatusAndReload(
            appointmentId,
            "DA_DEN",
            appointmentName,
            false
          );
        },
        Hủy: function () {
          $(this).dialog("close");
        },
      },
    });
}

function examination(buttonElement) {
  const appointmentId = buttonElement.getAttribute("data-id");
  const appointmentName = buttonElement.getAttribute("data-name");

  if (!appointmentId) {
    console.error("Lỗi JS: Không tìm thấy Mã Lịch Hẹn (data-id).");
    return;
  }

  $("<div></div>")
    .html(`Xác nhận bắt đầu cho bệnh nhân <strong>${appointmentName}</strong>?`)

    .dialog({
      resizable: false,
      modal: true,
      title: "Xác nhận Khởi tạo Khám",

      open: function (event, ui) {
        $(this).parent().find(".ui-dialog-titlebar-close").hide();
      },

      buttons: {
        "Bắt đầu": function () {
          $(this).dialog("close");
          updateStatusAndReload(
            appointmentId,
            "DANG_KHAM",
            appointmentName,
            true
          );
        },
        Hủy: function () {
          $(this).dialog("close");
        },
      },
    });
}

function ketQuaCanLamSan(pkbMa) {
  if (!pkbMa) {
    alert("Lỗi: Không tìm thấy Mã Phiếu Khám Bệnh.");
    return;
  }

  const checkApiUrl = `/api/ketquacanlamsan/check-pcd/${pkbMa}`;

  fetch(checkApiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Lỗi truy vấn dữ liệu PCD.");
      }
      return response.json();
    })
    .then((data) => {
      const pcdMa = data.pcd_ma;

      if (pcdMa) {
        const redirectUrl = `/api/ketquacanlamsan/nhap/${pcdMa}`;
        window.location.href = redirectUrl;
      } else {
        const redirectUrl = `/api/thanhtoan/lap-phieu/${pkbMa}`;
        window.location.href = redirectUrl;
      }
    })
    .catch((error) => {
      console.error("Lỗi khi kiểm tra PCD:", error);
      alert(`Thao tác thất bại: ${error.message || "Lỗi kết nối server."}`);
    });
}

let maLichHenTiepDon = null; 

function tiepDon(maLichHen, tenBenhNhan) {
    maLichHenTiepDon = maLichHen;

    const tenEl = document.getElementById('receivePatientName');
    if (tenEl) tenEl.innerText = tenBenhNhan;

    const modal = new bootstrap.Modal(document.getElementById('receiveConfirmModal'));
    modal.show();
}

async function thucHienTiepDon() {
    if (!maLichHenTiepDon) return;

    const modalEl = document.getElementById('receiveConfirmModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    try {
        const res = await fetch(`/api/lich-hen/${maLichHenTiepDon}/trang-thai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trang_thai_moi: 'DA_DEN' })
        });

        const data = await res.json();

        if (res.ok) {
            if (typeof hienThiThongBaoThanhCong === 'function') {
                hienThiThongBaoThanhCong("Đã tiếp đón bệnh nhân!");
            } else {
                alert("Tiếp đón thành công!");
                window.location.reload();
            }
        } else {
            alert("Lỗi: " + (data.message || "Không thể cập nhật trạng thái"));
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối server.");
    }
}

async function batDauKham(maLichHen) {
  try {
    const res = await fetch(`/api/lich-hen/${maLichHen}/trang-thai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trang_thai_moi: "DANG_KHAM" }),
    });

    if (res.ok) {
      window.location.href = `/api/phieu-kham/new/${maLichHen}`;
    } else {
      const data = await res.json();
      alert("Lỗi: " + (data.message || "Không thể bắt đầu khám"));
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi kết nối server.");
  }
}

function tiepTucKham(maLichHen) {
  window.location.href = `/api/phieu-kham/new/${maLichHen}`;
}
