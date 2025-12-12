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

document.addEventListener("DOMContentLoaded", function () {
  const selectPttt = document.getElementById("phuong_thuc_tt");
  const btnOpenQR = document.getElementById("btnOpenQR");
  const inputTongCong = document.getElementById("inputTongCong");
  const inputPkbMa = document.querySelector('input[name="pkb_ma"]');

  const optNone = document.getElementById("opt_none");
  const serviceItems = document.querySelectorAll(".service-item");
  const inputKhac = document.getElementById("input_khac");

  const qrModalElement = document.getElementById("qrModal");
  let qrModal = null;
  if (qrModalElement) {
    qrModal = new bootstrap.Modal(qrModalElement);
  }

  if (optNone) {
    optNone.addEventListener("change", function () {
      if (this.checked) {
        serviceItems.forEach((item) => (item.checked = false));
        if (inputKhac) {
          inputKhac.disabled = true;
          inputKhac.value = "";
        }
      }
    });
  }

  if (serviceItems.length > 0) {
    serviceItems.forEach((item) => {
      item.addEventListener("change", function () {
        if (this.checked && optNone) optNone.checked = false;

        const anyChecked = Array.from(serviceItems).some((i) => i.checked);
        if (!anyChecked && optNone) optNone.checked = true;

        if (this.id === "opt_khac") {
          if (this.checked) {
            inputKhac.disabled = false;
            inputKhac.focus();
          } else {
            inputKhac.disabled = true;
            inputKhac.value = "";
          }
        }
      });
    });
  }

  if (selectPttt) {
    selectPttt.addEventListener("change", function () {
      if (this.value == "2") {
        if (btnOpenQR) btnOpenQR.classList.remove("d-none");

        hienThiQRCode();
        if (qrModal) qrModal.show();
      } else {
        if (btnOpenQR) btnOpenQR.classList.add("d-none");
        stopChecking();
      }
    });
  }

  if (btnOpenQR) {
    btnOpenQR.addEventListener("click", function () {
      hienThiQRCode();
      if (qrModal) qrModal.show();
    });
  }

  if (qrModalElement) {
    qrModalElement.addEventListener("hidden.bs.modal", function () {
      stopChecking();
    });
  }
  function hienThiQRCode() {
    if (!inputTongCong || !inputPkbMa) return;

    const amount = inputTongCong.value;
    const pkbMa = inputPkbMa.value;
    const content = `TT PKB ${pkbMa}`;

    const qrUrl = `https://img.vietqr.io/image/${BANK_INFO.BANK_ID}-${
      BANK_INFO.ACCOUNT_NO
    }-${BANK_INFO.TEMPLATE}.png?amount=${amount}&addInfo=${encodeURIComponent(
      content
    )}&accountName=${encodeURIComponent(BANK_INFO.ACCOUNT_NAME)}`;

    const imgQr = document.getElementById("vietqr-image");
    if (imgQr) imgQr.src = qrUrl;

    document.getElementById("qr-bank-name").innerText = BANK_INFO.BANK_ID;
    document.getElementById("qr-account-num").innerText = BANK_INFO.ACCOUNT_NO;
    document.getElementById("qr-account-name").innerText =
      BANK_INFO.ACCOUNT_NAME;
    document.getElementById("qr-content").innerText = content;

    const formattedAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
    document.getElementById("qr-amount").innerText = formattedAmount;

    stopChecking();
    if (!isPaymentSuccess) {
      checkPaidInterval = setInterval(() => {
        checkPaid(amount, content);
      }, 3000);
    }
  }

  // 5. HÀM CHECK TIỀN TỪ GOOGLE SCRIPT
  async function checkPaid(amount, content) {
    if (isPaymentSuccess) return;

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const resData = await response.json();
      const lastTransactions = resData.data.slice(-10);

      const match = lastTransactions.find((transaction) => {
        const price = parseFloat(transaction["Giá trị"]);
        const description = transaction["Mô tả"];
        return price >= parseFloat(amount) && description.includes(content);
      });

      if (match) {
        isPaymentSuccess = true;
        stopChecking();
        if (qrModal) qrModal.hide();

        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "success",
            title: "Đã nhận được tiền!",
            text: "Hệ thống đang xử lý hóa đơn...",
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          alert("Đã nhận được tiền! Đang xử lý...");
        }

        setTimeout(() => {
          const form = document.getElementById("thanhtoanForm");
          if (form) form.submit();
        }, 1500);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function stopChecking() {
    if (checkPaidInterval) {
      clearInterval(checkPaidInterval);
      checkPaidInterval = null;
    }
  }

  window.copyText = function (elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.innerText;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        const btn = document.querySelector(
          `i[onclick="copyText('${elementId}')"]`
        );
        if (btn) {
          btn.classList.remove("fa-copy", "text-secondary");
          btn.classList.add("fa-check", "text-success");
          setTimeout(() => {
            btn.classList.remove("fa-check", "text-success");
            btn.classList.add("fa-copy", "text-secondary");
          }, 1500);
        } else {
          alert("Đã sao chép: " + text);
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Copy thất bại, vui lòng bôi đen và copy thủ công.");
      });
  };
});
