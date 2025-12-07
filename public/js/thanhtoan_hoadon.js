const BANK_INFO = {
  BANK_ID: "BIDV",
  ACCOUNT_NO: "V3CASS7411139399",
  ACCOUNT_NAME: "TRUONG HUU THAI",
  TEMPLATE: "compact2",
};

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzzNi0Zo5Xx1pCi8d0OAg40CGxOU26XUd5gQwo7a1iyk3rtMPs-xkcS7316xrEmbg4/exec";

let checkPaidInterval = null;
let isPaymentSuccess = false;

$(document).ready(function () {
  $("#phuong_thuc_tt").on("change", function () {
    const selectedText = $(this).find("option:selected").text().trim();
    const qrSection = $("#qr-section");
    stopChecking();

    if (selectedText.toLowerCase().includes("chuyển khoản")) {
      hienThiQRCode();
      qrSection.removeClass("d-none").addClass("d-block");
    } else {
      qrSection.removeClass("d-block").addClass("d-none");
    }
  });
});

function stopChecking() {
  if (checkPaidInterval) {
    clearInterval(checkPaidInterval);
    checkPaidInterval = null;
  }
}

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
  setTimeout(() => {
    if (
      !isPaymentSuccess &&
      $("#phuong_thuc_tt")
        .find("option:selected")
        .text()
        .toLowerCase()
        .includes("chuyển khoản")
    ) {
      console.log("Bắt đầu kiểm tra giao dịch...");
      stopChecking();


      checkPaidInterval = setInterval(() => {
        checkPaid(amount, content);
      }, 3000);
    }
  }, 5000);
}

async function checkPaid(amount, content) {
  if (isPaymentSuccess) return;

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const data = await response.json();

    const lastTransactions = data.data.slice(-5);
    const match = lastTransactions.find((transaction) => {
      const price = parseFloat(transaction["Giá trị"]);
      const description = transaction["Mô tả"];

      return price >= parseFloat(amount) && description.includes(content);
    });

    if (match) {
      console.log("Thanh toán thành công!");
      isPaymentSuccess = true;
      stopChecking();
      if (typeof hienThiThongBaoThanhCong === "function") {
        hienThiThongBaoThanhCong("Đã nhận được tiền! Hệ thống đang xử lý...");
      } else {
        alert("Đã nhận được tiền!");
      }
      setTimeout(() => {
        const form = document.getElementById("thanhtoan"); 
        if (form) form.submit();
      }, 1500);
    } else {
      console.log("Chưa thấy giao dịch...");
    }
  } catch (error) {
    console.error("Lỗi kiểm tra thanh toán:", error);
  }
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
