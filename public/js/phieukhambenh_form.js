let drugGroups = [];

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

$(document).ready(function () {
  const drugTableBody = $("#drugTable tbody");
  const addDrugButton = $("#addDrugButton");

  fetch("/api/thuoc/nhom_thuoc")
    .then((res) => res.json())
    .then((data) => {
      drugGroups = data;
      initDrugRow(drugTableBody.find("tr").first());
    })
    .catch((error) => console.error("Lỗi tải nhóm thuốc:", error));

  function createDrugRow() {
    const rowId = generateId();
    const newRow = $(`
                <tr>
                    <td>
                        <select name="maNhom[]" class="form-select drug-group-select" id="drugGroupSelect-${rowId}" required>
                        </select>
                    </td>
                    <td>
                        <input type="text" name="thuoc_ten[]" class="form-control" placeholder="Gõ tên thuốc..." id="drugNameInput-${rowId}" required>
                        <input type="hidden" name="thuoc_ma[]" id="drugIdHidden-${rowId}">
                    </td>
                    <td><input type="number" name="so_luong[]" class="form-control" min="1" required></td>
                    <td><input type="text" name="cach_dung[]" class="form-control" placeholder="Ngày 2 lần, mỗi lần 1 viên..." required></td>
                    <td><button type="button" class="btn btn-danger btn-sm remove-drug">Xóa</button></td>
                </tr>
            `);
    drugTableBody.append(newRow);

    initDrugRow(newRow);
  }

  function initDrugRow($row) {
    const rowId = $row.attr("data-id");
    populateGroupSelect($row.find(".drug-group-select"));
    initAutocomplete(rowId);
  }

  addDrugButton.on("click", createDrugRow);

  drugTableBody.on("click", ".remove-drug", function (e) {
    if (drugTableBody.children().length > 1) {
      $(this).closest("tr").remove();
    }
  });

  drugTableBody.on("input", 'input[name="so_luong[]"]', function () {
    let value = parseInt($(this).val());

    if (isNaN(value) || value < 1) {
      $(this).val(1);
    }
  });

  $("#phieuKhamBenhForm").on("submit", function (e) {
    let isValid = true;
    $('input[name="so_luong[]"]').each(function () {
      let value = parseInt($(this).val());
      if (isNaN(value) || value < 1) {
        $(this).val(1);
      }
    });
  });
});
