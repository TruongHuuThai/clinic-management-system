let modalBenh = null;
let modalConfirmSave = null;
let modalConfirmDelete = null;
let idBenhCanXoa = null;
let modalSuccess = null;

document.addEventListener("DOMContentLoaded", function () {
  modalBenh = new bootstrap.Modal(document.getElementById("modalBenh"));
  modalConfirmSave = new bootstrap.Modal(
    document.getElementById("modalConfirmSave")
  );
  modalConfirmDelete = new bootstrap.Modal(
    document.getElementById("modalConfirmDelete")
  );
  const successEl = document.getElementById("successModal");
  if (successEl) modalSuccess = new bootstrap.Modal(successEl);
});

function moModalThem() {
  document.getElementById("formBenh").reset();
  document.getElementById("formBenh").action = "/api/benh/them";
  document.getElementById("b_ma").value = "";
  document.getElementById("modalTitle").innerText = "Thêm Bệnh Mới";
  modalBenh.show();
  setTimeout(() => document.getElementById("b_ten").focus(), 500);
}

function moModalSua(id, ten, icd, mota) {
  document.getElementById("b_ma").value = id;
  document.getElementById("b_ten").value = ten;
  document.getElementById("b_ma_icd").value =
    icd && icd !== "null" && icd !== "undefined" ? icd : "";
  document.getElementById("b_mota").value =
    mota && mota !== "null" && mota !== "undefined" ? mota : "";
  document.getElementById("formBenh").action = "/api/benh/sua";
  document.getElementById("modalTitle").innerText = "Cập Nhật Thông Tin Bệnh";
  modalBenh.show();
}

function kiemTraVaHienThiXacNhanLuu() {
  const form = document.getElementById("formBenh");
  const tenBenh = document.getElementById("b_ten").value.trim();

  if (!tenBenh) {
    alert("Vui lòng nhập Tên bệnh!");
    document.getElementById("b_ten").focus();
    return;
  }
  modalConfirmSave.show();
}

function thucHienLuu() {
  modalConfirmSave.hide();

  const form = document.getElementById("formBenh");
  const url = form.action;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {

        modalBenh.hide();
        hienThiThongBaoThanhCong("Đã lưu thành công!");
      } else {
        alert("Lỗi: " + result.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Lỗi kết nối server!");
    });
}

function yeuCauXoa(id, ten) {
  idBenhCanXoa = id;
  document.getElementById("lblTenBenhXoa").innerText = ten;
  modalConfirmDelete.show();
}

function thucHienXoa() {
  if (idBenhCanXoa) {
    modalConfirmDelete.hide();

    fetch(`/api/benh/xoa/${idBenhCanXoa}`, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          hienThiThongBaoThanhCong("Đã xóa thành công!");
        } else {
          alert("Lỗi: " + result.message);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Lỗi kết nối server!");
      });
  }
}

function chuyenTrang(soTrang) {
  const urlHienTai = new URL(window.location.href);
  urlHienTai.searchParams.set("page", soTrang);s
  window.location.href = urlHienTai.toString();
}
