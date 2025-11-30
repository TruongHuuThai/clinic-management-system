let allDrugGroups = [];
let priceModalInstance = null;
let currentTMaEditing = null; 
let deleteIdTarget = null;

function formatCurrencyForInput(amount) {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return "";
  }
  return Math.floor(numericAmount);
}

function formatDateTimeVN(isoString) {
  if (!isoString) return '<span class="badge bg-success">Hiện tại</span>';
  const date = new Date(isoString);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function luuCapNhatGiaAPI(tMa, newPrice) {
  try {
    const response = await fetch(`/api/thuoc/cap-nhat-gia/${tMa}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gia_moi: newPrice }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message);

    return true;
  } catch (error) {
    alert(`Lỗi cập nhật: ${error.message}`);
    return false;
  }
}

async function moModalSua(buttonElement) {
  const tMa = buttonElement.getAttribute("data-id");
  if (!tMa) {
    console.error("Lỗi: Không tìm thấy Mã Thuốc (data-id).");
    return;
  }

  const editModal = new bootstrap.Modal(
    document.getElementById("editDrugModal")
  );

  try {
    const detailResponse = await fetch(`/api/thuoc/${tMa}`);
    if (!detailResponse.ok) throw new Error("Không tìm thấy chi tiết thuốc.");
    const drug = await detailResponse.json();

    if (allDrugGroups.length === 0) {
      const groupResponse = await fetch("/api/thuoc/nhom-thuoc");
      allDrugGroups = await groupResponse.json();
    }

    $("#edit-t-ma").val(tMa);
    $("#edit-t-ten-thuoc").val(drug.t_ten_thuoc);
    $("#edit-t-don-vi-tinh").val(drug.t_don_vi_tinh || "");
    $("#edit-t-ham-luong").val(drug.t_ham_luong || "");
    $("#edit-t-cach-dung-mac-dinh").val(drug.t_cach_dung_mac_dinh || "");
    $("#edit-t-huong-dan").val(drug.t_huong_dan || "");

    const $selectGroup = $("#edit-t-loai-thuoc");
    $selectGroup.empty();
    allDrugGroups.forEach((group) => {
      const isSelected = group.nt_ma == drug.t_loai_thuoc ? "selected" : "";
      $selectGroup.append(
        `<option value="${group.nt_ma}" ${isSelected}>${group.nt_ten}</option>`
      );
    });

    editModal.show();
  } catch (error) {
    console.error("LỖI KHI TẢI DỮ LIỆU SỬA:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

$("#editDrugForm").on("submit", async function (e) {
  e.preventDefault();

  const tMa = $("#edit-t-ma").val();
  const formData = $(this).serializeArray();
  const data = {};
  formData.forEach((item) => {
    data[item.name] = item.value;
  });

  try {
    const response = await fetch(`/api/thuoc/cap-nhat-thong-tin/${tMa}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message);

    const editModalEl = document.getElementById("editDrugModal");
    const editModalInstance = bootstrap.Modal.getInstance(editModalEl);
    if (editModalInstance) {
      editModalInstance.hide();
    }

    if (typeof hienThiThongBaoThanhCong === "function") {
      hienThiThongBaoThanhCong("Cap nhat thong tin thuoc thanh cong!");
    } else {
      window.location.reload();
    }
  } catch (error) {
    alert(`Lỗi: ${error.message}`);
  }
});

function moModalGia(btnElement) {
  const tMa = btnElement.getAttribute("data-id");
  const currentRow = $(`tr[data-tma='${tMa}']`);

  if (currentRow.length === 0) return;

  currentTMaEditing = tMa;

  const drugName = currentRow.find("td").eq(1).text();
  const currentPriceText = currentRow
    .find("td")
    .eq(7)
    .text()
    .replace(/\.|,|VNĐ/g, "")
    .trim();
  const currentPrice = parseFloat(currentPriceText) || 0;

  $("#price-drug-name").text(drugName);
  $("#price-old-display").text(currentPrice.toLocaleString("vi-VN"));

  const $input = $("#new_price_input");
  const $error = $("#price-error");

  $input.val(formatCurrencyForInput(currentPrice));
  $input.removeClass("is-invalid");
  $error.addClass("d-none");

  const modalEl = document.getElementById("priceModal");
  priceModalInstance = new bootstrap.Modal(modalEl);
  priceModalInstance.show();

  modalEl.addEventListener(
    "shown.bs.modal",
    function () {
      $input.focus();
      $input.select();
    },
    { once: true }
  );
}

$("#btn-save-price").on("click", async function () {
  const $input = $("#new_price_input");
  const $error = $("#price-error");
  const newPrice = $input.val();

  if (!newPrice || parseFloat(newPrice) <= 0) {
    $input.addClass("is-invalid");
    $error.removeClass("d-none");
    $input.focus();
    return;
  }

  $input.removeClass("is-invalid");
  $error.addClass("d-none");

  const isSuccess = await luuCapNhatGiaAPI(currentTMaEditing, newPrice);

  if (isSuccess) {
    if (priceModalInstance) priceModalInstance.hide();
    if (typeof hienThiThongBaoThanhCong === "function") {
      hienThiThongBaoThanhCong("Cap nhat gia thanh cong!");
    } else {
      window.location.reload();
    }
  }
});

async function xemLichSuGia(btnElement) {
  const tMa = btnElement.getAttribute("data-id");
  const drugName = $(`tr[data-tma='${tMa}']`).find("td").eq(1).text();

  $("#history-drug-name").text(drugName);

  const modal = new bootstrap.Modal(document.getElementById("historyModal"));
  modal.show();

  const $tbody = $("#history-table-body");
  $tbody.empty();
  $("#history-loading").removeClass("d-none");
  $("#history-empty").addClass("d-none");

  try {
    const response = await fetch(`/api/thuoc/lich-su/${tMa}`);
    const history = await response.json();

    $("#history-loading").addClass("d-none");

    if (history.length === 0) {
      $("#history-empty").removeClass("d-none");
      return;
    }

    let html = "";
    history.forEach((item, index) => {
      const isCurrent = index === 0;
      const priceClass = isCurrent ? "text-success fw-bold" : "text-dark";

      html += `
          <tr>
            <td class="ps-4 ${priceClass}">
              ${parseFloat(item.cgt_gia_thuoc).toLocaleString("vi-VN")}
            </td>
            <td class="small">${formatDateTimeVN(item.bat_dau)}</td>
            <td class="small text-muted">${formatDateTimeVN(item.ket_thuc)}</td>
          </tr>
        `;
    });

    $tbody.html(html);
  } catch (error) {
    console.error(error);
    $("#history-loading").addClass("d-none");
    alert("Khong the tai lich su gia.");
  }
}

function xoaThuoc(btnElement) {
  const tMa = btnElement.getAttribute("data-id");

  const currentRow = $(`tr[data-tma='${tMa}']`);
  const tTen = currentRow.find("td").eq(1).text();

  deleteIdTarget = tMa;

  $("#delete-drug-name").text(tTen);

  const deleteModal = new bootstrap.Modal(
    document.getElementById("deleteConfirmModal")
  );
  deleteModal.show();
}

$("#btn-confirm-delete").on("click", async function () {
  if (!deleteIdTarget) return;

  const confirmModalEl = document.getElementById("deleteConfirmModal");
  const confirmModal = bootstrap.Modal.getInstance(confirmModalEl);
  confirmModal.hide();

  try {
    const response = await fetch(`/api/thuoc/xoa/${deleteIdTarget}`, {
      method: "POST",
    });

    const result = await response.json();

    if (response.ok) {
      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Da xoa thuoc thanh cong!");
      } else {
        window.location.reload();
      }
    } else if (response.status === 409) {
      const tTen = $("#delete-drug-name").text();
      $("#error-drug-name").text(tTen);

      const errorModal = new bootstrap.Modal(
        document.getElementById("deleteErrorModal")
      );
      errorModal.show();
    } else {
      alert(`Lỗi: ${result.message}`);
    }
  } catch (error) {
    console.error(error);
    alert("Lỗi kết nối server.");
  }
});

$("#new_price_input").on("keypress", function (e) {
  if (e.which < 48 || e.which > 57) {
    e.preventDefault();
  }
});

$(document).ready(function () {
  $("#addNewDrugBtn").on("click", function () {
    alert("Mo modal them thuoc moi");
  });

  $("#drug-search-input").autocomplete({
    source: function (request, response) {
      $.ajax({
        url: "/api/thuoc/autocomplete",
        dataType: "json",
        data: { term: request.term },
        success: function (data) {
          response(data);
        },
        error: function () {
          response([]);
        },
      });
    },
    minLength: 1,
    select: function (event, ui) {
      $("#drug-search-input").val(ui.item.label);
      $("#filter-section form").submit();
      return false;
    },
  });
});
