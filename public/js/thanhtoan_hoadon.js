const BANK_INFO = {
  BANK_ID: "BIDV", 
  ACCOUNT_NO: "V3CASS7411139399", 
  ACCOUNT_NAME: "TRUONG HUU THAI",
  TEMPLATE: "compact2", 
};

$(document).ready(function () {
  $("#phuong_thuc_tt").on("change", function () {
    const selectedText = $(this).find("option:selected").text().trim();
    const qrSection = $("#qr-section");

    if (selectedText.toLowerCase().includes("chuyển khoản")) {
      hienThiQRCode();
      qrSection.removeClass("d-none").addClass("d-block"); 
    } else {
      qrSection.removeClass("d-block").addClass("d-none"); 
    }
  });
});

function hienThiQRCode() {
  const amount = $('input[name="tong_cong"]').val(); 
  const pkbMa = $('input[name="pkb_ma"]').val();

  const content = `TT PKB ${pkbMa}`;

  const qrUrl = `https://img.vietqr.io/image/${BANK_INFO.BANK_ID}-${
    BANK_INFO.ACCOUNT_NO
  }-${
    BANK_INFO.TEMPLATE
  }.png?amount=${amount}&addInfo=${content}&accountName=${encodeURIComponent(
    BANK_INFO.ACCOUNT_NAME
  )}`;

  $("#vietqr-image").attr("src", qrUrl);

  $("#qr-bank-name").text(BANK_INFO.BANK_ID);
  $("#qr-account-num").text(BANK_INFO.ACCOUNT_NO);
  $("#qr-account-name").text(BANK_INFO.ACCOUNT_NAME);
  $("#qr-content").text(content);

  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  $("#qr-amount").text(formattedAmount);
}

function copyText(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const btn = document.querySelector(
        `button[onclick="copyText('${elementId}')"]`
      );
      const originalHTML = btn.innerHTML;

      btn.innerHTML = '<i class="fas fa-check"></i> Đã chép';
      btn.classList.remove("btn-outline-secondary");
      btn.classList.add("btn-success");

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove("btn-success");
        btn.classList.add("btn-outline-secondary");
      }, 1500);
    })
    .catch((err) => {
      console.error("Lỗi copy:", err);
    });
}
