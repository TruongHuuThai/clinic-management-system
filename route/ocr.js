const express = require("express");
const router = express.Router();
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/phan-tich", upload.single("file_anh"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng gửi file ảnh." });
    }

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
      ],
    });

const prompt = `
      Bạn là trợ lý y tế chuyên nghiệp. Hãy phân tích hình ảnh này.
      Dựa vào nội dung, hãy tự động nhận diện xem nó thuộc loại nào trong 5 nhóm dịch vụ sau đây và trích xuất dữ liệu tương ứng:

      1. NHÓM "CÔNG THỨC MÁU" (Hematology/CBC):
         - Tìm và trích xuất các chỉ số: Bạch cầu (WBC), Hồng cầu (RBC), Huyết sắc tố (HGB), Tiểu cầu (PLT).
         - Nếu có cột đánh giá (Cao/Thấp/Bình thường), hãy ghi chú bên cạnh chỉ số.

      2. NHÓM "SIÊU ÂM BỤNG" (Ultrasound):
         - Tóm tắt ngắn gọn tình trạng các cơ quan: Gan, Mật, Tụy, Lách, Thận (nếu có nhắc đến).
         - Trích xuất nguyên văn phần "KẾT LUẬN" của bác sĩ.

      3. NHÓM "ĐƯỜNG HUYẾT" (Glucose):
         - Tìm chỉ số Glucose (hoặc Đường huyết ngẫu nhiên).
         - Ghi kèm đơn vị (mmol/L hoặc mg/dL).

      4. NHÓM "CHỨC NĂNG GAN" (AST/ALT):
         - Tìm chỉ số men gan: AST (SGOT) và ALT (SGPT).
         - Đánh giá sơ bộ (Tăng/Bình thường) dựa trên khoảng tham chiếu trong ảnh.

      5. NHÓM "ĐIỆN TIM ĐỒ" (ECG):
         - Trích xuất thông số máy đo (nếu rõ): Nhịp tim (HR/Rate), Khoảng PR, QRS...
         - Trích xuất "KẾT LUẬN" (thường nằm ở đầu hoặc cuối phiếu). Ví dụ: Nhịp xoang, Thiếu máu cục bộ...
         - Nếu không có chữ kết luận, hãy mô tả tóm tắt hình dạng sóng quan sát được.

      YÊU CẦU ĐẦU RA:
      - Trả về văn bản thuần (Plain text) Tiếng Việt.
      - Không dùng định dạng Markdown (không dùng dấu ** đậm, không dùng dấu # tiêu đề).
      - Trình bày rõ ràng, mỗi chỉ số một dòng.
      - Mẫu: [Tên chỉ số]: [Kết quả] [Đơn vị] (Ghi chú)
      - Nếu ảnh mờ hoặc không thuộc 5 nhóm trên, hãy trả về: "Không thể nhận diện loại phiếu này."
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log("AI Tra ve:", text);

    res.json({ success: true, text: text });
  } catch (error) {
    console.error("LỖI AI CHI TIẾT:", error);

    let message = "Không thể phân tích ảnh.";

    if (error.message.includes("404")) {
      message =
        "Sai tên Model AI (404 Not Found). Vui lòng kiểm tra lại phiên bản model.";
    } else if (error.message.includes("SAFETY")) {
      message = "AI từ chối đọc ảnh này vì lý do an toàn (Safety Filter).";
    } else if (error.message.includes("API_KEY")) {
      message = "API Key không hợp lệ.";
    }

    res.status(500).json({
      message: message,
      error: error.message,
    });
  }
});

module.exports = router;
