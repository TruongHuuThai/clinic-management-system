function updateStatusAndReload(
  appointmentId,
  newStatus,
  appointmentName,
  isExamination = false
) {
  const apiUrl = `/api/appointment/${appointmentId}/status`;

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
      console.log(`Đã cập nhật trạng thái thành công cho ${appointmentName}.`);

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
      title: "Xác nhận Tiếp Đón",
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

async function examination(buttonElement) {
  const appointmentId = buttonElement.getAttribute("data-id");
  const appointmentName = buttonElement.getAttribute("data-name");

  if (!appointmentId) {
    console.error("Lỗi JS: Không tìm thấy Mã Lịch Hẹn (data-id).");
    return;
  }

  $("<div></div>")
    .html(
      `Xác nhận **bắt đầu/tiếp tục khám** cho bệnh nhân <strong>${appointmentName}</strong>?`
    )
    .dialog({
      resizable: false,
      modal: true,
      title: "Xác nhận Khởi tạo Khám",
      buttons: {
        "Bắt đầu/Tiếp tục": function () {
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
