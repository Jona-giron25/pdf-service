const express = require("express");
const cors = require("cors");

// 👇 IMPORTANTE: usamos tu archivo bueno
const generarPDF = require("./pdfFactura");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

// ================= RUTA PDF =================
app.post("/cotizacion/pdf", (req, res) => {
  try {
    const { factura, items } = req.body;

    // 👇 AQUÍ usamos tu diseño real
    generarPDF(res, factura, items);

  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).send("Error generando PDF");
  }
});

// ================= SERVER =================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("PDF Service corriendo en puerto " + PORT);
});