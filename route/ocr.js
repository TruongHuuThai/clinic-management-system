const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/phan-tich", upload.single("file_anh"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu file ảnh" });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = `Bạn là trợ lý y tế. Hãy trích xuất thông tin từ phiếu kết quả cận lâm sàng này.
                    Trả về JSON với các trường sau:
                    - chi_so (array string): Các chỉ số xét nghiệm quan trọng hoặc nội dung mô tả hình ảnh.
                    - ket_luan (string): Kết luận cuối cùng của bác sĩ (nếu có).
                    - ghi_chu (string): Các ghi chú bất thường (nếu có).
                    Nếu không tìm thấy thông tin, hãy để trống.`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    const jsonResult = JSON.parse(text);
    let formattedText = "";
    if (jsonResult.chi_so && jsonResult.chi_so.length > 0) {
      formattedText +=
        "- Các chỉ số/Mô tả:\n" +
        jsonResult.chi_so.map((i) => `+ ${i}`).join("\n") +
        "\n";
    }
    if (jsonResult.ket_luan) {
      formattedText += `\n- KẾT LUẬN: ${jsonResult.ket_luan}\n`;
    }
    if (jsonResult.ghi_chu) {
      formattedText += `\n- Ghi chú: ${jsonResult.ghi_chu}`;
    }

    res.json({
      success: true,
      text: formattedText.trim(),
      rawData: jsonResult, 
    });
  } catch (error) {
    console.error("Lỗi OCR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
