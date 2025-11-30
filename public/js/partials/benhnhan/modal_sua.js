let modalSuaInstance = null;

async function moModalSuaBenhNhan(maBenhNhan) {
  try {
    const form = document.getElementById("editPatientForm");

    if (form) form.reset();
    xoaLoi("edit_bn_ho_ten");
    xoaLoi("edit_bn_sdt");
    xoaLoi("edit_bn_ngay_sinh");

    const res = await fetch(`/api/benh-nhan/api/${maBenhNhan}`);
    if (!res.ok) throw new Error("Lỗi tải dữ liệu: " + res.status);

    const bn = await res.json();

    document.getElementById("edit_bn_ma").value = bn.bn_ma;
    document.getElementById("edit_bn_ho_ten").value = bn.bn_ho_ten || "";
    document.getElementById("edit_bn_sdt").value = bn.bn_sdt || "";
    document.getElementById("edit_bn_dia_chi").value = bn.bn_dia_chi || "";

    const dateInput = document.getElementById("edit_bn_ngay_sinh");
    if (dateInput) {
      if (bn.bn_ngay_sinh) {
        const d = new Date(bn.bn_ngay_sinh);
        const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(
          d.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}/${d.getFullYear()}`;
        dateInput.value = dateStr;
      } else {
        dateInput.value = "";
      }
    }
    if (bn.bn_gioi_tinh === "Nam") {
      document.getElementById("gender_nam").checked = true;
    } else if (bn.bn_gioi_tinh === "Nu" || bn.bn_gioi_tinh === "Nữ") {
      document.getElementById("gender_nu").checked = true;
    } else {
      document.getElementById("gender_nam").checked = true;
    }

    const modalEl = document.getElementById("editPatientModal");
    if (modalEl) {
      modalSuaInstance = new bootstrap.Modal(modalEl);
      modalSuaInstance.show();
    }
  } catch (err) {
    console.error("LỖI KHI NẠP DỮ LIỆU:", err);
    alert("Không thể tải thông tin bệnh nhân.");
  }
}