let drugGroups = [];
let serviceList = [];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function populateGroupSelect($selectElement) {
  $selectElement
    .empty()
    .append('<option value="">--- Chọn Nhóm Thuốc ---</option>');
  drugGroups.forEach((group) => {
    $selectElement.append(
      `<option value="${group.nt_ma}">${group.nt_ten}</option>`
    );
  });
}

function populateServiceSelect($selectElement) {
  $selectElement
    .empty()
    .append('<option value="">--- Chọn Dịch vụ ---</option>');
  serviceList.forEach((service) => {
    $selectElement.append(
      `<option value="${service.dvcls_ma}">${service.dvcls_ten}</option>`
    );
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
}

function initAutocomplete(rowId) {
  const $drugInput = $(`#drugNameInput-${rowId}`);
  const $hiddenId = $(`#drugIdHidden-${rowId}`);
  const $groupSelect = $(`#drugGroupSelect-${rowId}`);
  const $unitInput = $(`#drugUnitInput-${rowId}`);

  const $row = $drugInput.closest("tr");
  const $quantityInput = $row.find('input[name="so_luong[]"]');

  let currentDrugList = [];

  $groupSelect.on("change", function () {
    const nt_ma = $(this).val();
    $drugInput.val("");
    $hiddenId.val("");
    $unitInput.val("");
    $quantityInput.val("");

    if (!nt_ma) {
      currentDrugList = [];
      $drugInput.autocomplete("option", "source", []);
      return;
    }

    fetch(`/api/thuoc/theo_nhom/${nt_ma}`)
      .then((res) => res.json())
      .then((data) => {
        currentDrugList = data.map((item) => ({
          label: item.t_ten_thuoc,
          value: item.t_ten_thuoc,
          id: item.t_ma,
          unit: item.t_don_vi_tinh,
        }));
        $drugInput.autocomplete("option", "source", currentDrugList);
      })
      .catch((error) => console.error("Lỗi tải thuốc:", error));
  });

  $drugInput.autocomplete({
    minLength: 1,
    source: [],
    select: function (event, ui) {
      $drugInput.val(ui.item.value);
      $hiddenId.val(ui.item.id);
      $unitInput.val(ui.item.unit);

      if ($quantityInput.length) {
        $quantityInput.val(1);
      }
      return false;
    },
    search: function (event, ui) {
      if (!$groupSelect.val()) {
        $drugInput.val("");
        return false;
      }
    },
  });
}

function initDrugRow($row) {
  const rowId = $row.attr("data-id");
  populateGroupSelect($row.find(".drug-group-select"));
  initAutocomplete(rowId);
}

function createDrugRow() {
  const rowId = generateId();
  const newRow = $(`
      <tr class="drug-row" data-id="${rowId}">
        <td><select name="maNhom[]" class="form-select drug-group-select" id="drugGroupSelect-${rowId}" required></select></td>
        <td><input type="text" name="thuoc_ten[]" class="form-control" placeholder="Gõ tên thuốc..." id="drugNameInput-${rowId}" required><input type="hidden" name="thuoc_ma[]" id="drugIdHidden-${rowId}" /></td>
        <td><input type="number" name="so_luong[]" class="form-control" min="1" required></td>
        <td><input type="text" name="don_vi[]" class="form-control" id="drugUnitInput-${rowId}" placeholder="Đơn vị" readonly/></td>
        <td><input type="text" name="cach_dung[]" class="form-control" placeholder="Ngày 2 lần, mỗi lần 1 viên..." required/></td>
        <td><button type="button" class="btn btn-danger btn-sm remove-drug">Xóa</button></td>
      </tr>
  `);
  return newRow;
}

function initServiceRow($row) {
  const $serviceSelect = $row.find(".service-select");
  const $priceInput = $row.find('input[id^="servicePriceInput"]');

  populateServiceSelect($serviceSelect);

  $serviceSelect.on("change", function () {
    const dvcls_ma = $(this).val();
    const selectedService = serviceList.find(
      (s) => String(s.dvcls_ma) === String(dvcls_ma)
    );

    if (selectedService && selectedService.cgdv_gia_ddich_vu) {
      const formattedPrice = formatCurrency(selectedService.cgdv_gia_ddich_vu);
      $priceInput.val(formattedPrice);
    } else {
      $priceInput.val("");
    }
  });
}

function createServiceRowHtml() {
  const rowId = generateId();
  const newRow = $(`
      <tr class="service-row" data-id="${rowId}">
          <td>
              <select name="service_ma[]" class="form-select service-select" id="serviceSelect-${rowId}" required></select>
          </td>
          <td>
              <input type="number" name="service_so_luong[]" class="form-control text-end" value="1" min="1" required />
          </td>
          <td>
              <input type="text" class="form-control text-end" id="servicePriceInput-${rowId}" placeholder="Giá" readonly />
          </td>
          <td>
              <button type="button" class="btn btn-danger btn-sm remove-service">Xóa</button>
          </td>
      </tr>
  `);
  return newRow;
}

$(document).ready(function () {
  const drugTableBody = $("#drugTable tbody");
  const addDrugButton = $("#addDrugButton");
  const serviceTableBody = $("#serviceTableBody");
  const addServiceButton = $("#addServiceButton");

  fetch("/api/thuoc/nhom-thuoc")
    .then((res) => res.json())
    .then((data) => {
      drugGroups = data;
      initDrugRow(drugTableBody.find("tr").first());
    })
    .catch((error) => console.error("Lỗi tải nhóm thuốc:", error));

  fetch("/api/dichvucanlamsan/all")
    .then((res) => res.json())
    .then((data) => {
      serviceList = data;
      const $initialServiceRow = serviceTableBody
        .find("tr.service-row")
        .first();
      if ($initialServiceRow.length) {
        initServiceRow($initialServiceRow);
      }
    })
    .catch((error) => console.error("Lỗi tải danh sách dịch vụ:", error));

  addDrugButton.on("click", function () {
    const newRow = createDrugRow();
    drugTableBody.append(newRow);
    initDrugRow(newRow);
  });

  addServiceButton.on("click", function () {
    const newRow = createServiceRowHtml();
    serviceTableBody.append(newRow);
    initServiceRow(newRow);
  });

  drugTableBody.on("click", ".remove-drug", function () {
    if (drugTableBody.children().length > 1) {
      $(this).closest("tr").remove();
    }
  });

  serviceTableBody.on("click", ".remove-service", function () {
    if (serviceTableBody.children().length > 1) {
      $(this).closest("tr").remove();
    }
  });

  $("#drugTable tbody, #serviceTableBody").on(
    "input",
    'input[type="number"]',
    function () {
      let value = parseInt($(this).val());
      if (isNaN(value) || value < 1) {
        $(this).val(1);
      }
    }
  );

  $("#phieuKhamBenhForm").on("submit", function (e) {
    e.preventDefault();
    const $form = $(this);

    $(':input[name="so_luong[]"], :input[name="service_so_luong[]"]').each(
      function () {
        let value = parseInt($(this).val());
        if (isNaN(value) || value < 1) {
          $(this).val(1);
        }
      }
    );

    $form.off("submit").submit();
  });
});
