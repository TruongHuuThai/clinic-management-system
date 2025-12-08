let modalCLS = null;
let modalConfirmDelete = null;
let modalSuccess = null;
let idCanXoa = null;

document.addEventListener("DOMContentLoaded", function () {
  modalCLS = new bootstrap.Modal(document.getElementById("modalCLS"));
  modalConfirmDelete = new bootstrap.Modal(
    document.getElementById("modalConfirmDelete")
  );
  modalSuccess = new bootstrap.Modal(document.getElementById("successModal"));
});

function hienThiThanhCong(mess) {
  document.getElementById("successModalTitle").innerText = mess;
  modalSuccess.show();
  setTimeout(() => window.location.reload(), 1500);
}

function moModalThem() {
  document.getElementById("formCLS").reset();
  document.getElementById("formCLS").action = "/api/dich-vu-cls/them";
  document.getElementById("dvcls_ma").value = "";
  document.getElementById("modalTitle").innerText = "Thêm Dịch Vụ Mới";
  modalCLS.show();
  setTimeout(() => document.getElementById("dvcls_ten").focus(), 500);
}

function moModalSua(id, ten, loai, phuong_pham, ghi_chu) {
  document.getElementById("dvcls_ma").value = id;
  document.getElementById("dvcls_ten").value = ten;
  document.getElementById("dvcls_loai").value = loai;

  document.getElementById("dvcls_phuong_pham").value =
    phuong_pham && phuong_pham !== "null" && phuong_pham !== "undefined"
      ? phuong_pham
      : "";
  document.getElementById("dvcls_ghi_chu").value =
    ghi_chu && ghi_chu !== "null" && ghi_chu !== "undefined" ? ghi_chu : "";

  document.getElementById("formCLS").action = "/api/dich-vu-cls/sua";
  document.getElementById("modalTitle").innerText = "Cập Nhật Dịch Vụ";
  modalCLS.show();
}

function kiemTraVaLuu() {
  const ten = document.getElementById("dvcls_ten").value.trim();
  if (!ten) {
    alert("Vui lòng nhập tên dịch vụ!");
    return;
  }

  const form = document.getElementById("formCLS");
  const data = Object.fromEntries(new FormData(form).entries());

  fetch(form.action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        modalCLS.hide();
        hienThiThanhCong(result.message);
      } else {
        alert("Lỗi: " + result.message);
      }
    })
    .catch((err) => alert("Lỗi kết nối!"));
}

function yeuCauXoa(id, ten) {
  idCanXoa = id;
  document.getElementById("lblTenXoa").innerText = ten;
  modalConfirmDelete.show();
}

function thucHienXoa() {
  if (!idCanXoa) return;
  modalConfirmDelete.hide();
  fetch(`/api/dich-vu-cls/xoa/${idCanXoa}`, { method: "POST" })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) hienThiThanhCong(result.message);
      else alert("Lỗi: " + result.message);
    })
    .catch((err) => alert("Lỗi kết nối!"));
}

function chuyenTrang(page) {
  const url = new URL(window.location.href);
  url.searchParams.set("page", page);
  window.location.href = url.toString();
}
