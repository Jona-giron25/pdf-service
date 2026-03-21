const express = require("express");
const cors = require("cors");

const generarPDF = require("./pdfFactura");

const app = express();

// 🔐 CONFIGURACIÓN
app.use(cors());
app.use(express.json({ limit: "20mb" })); // 👈 aumentamos por imágenes base64

// ================= RUTA PDF =================
app.post("/cotizacion/pdf", (req, res) => {
  try {
    const body = req.body || {};

    // 🔍 DEBUG (IMPORTANTE)
    console.log("=========== PDF REQUEST ===========");
    console.log(JSON.stringify(body, null, 2));

    // ================= VALIDACIÓN =================
    const factura = body.factura || {};
    const items = Array.isArray(body.items) ? body.items : [];

    // 🔴 NORMALIZAR FACTURA
    const facturaNormalizada = {
      id: factura.id || 0,
      fecha: factura.fecha || new Date().toLocaleDateString(),
      usuario: factura.usuario || "",
      cliente: factura.cliente || "",
      cliente_rtn: factura.cliente_rtn || "",
      cliente_telefono: factura.cliente_telefono || "",
      cliente_correo: factura.cliente_correo || "",
      subtotal: Number(factura.subtotal) || 0,
      isv: Number(factura.isv) || 0,
      total: Number(factura.total) || 0,

      // 🔥 CAMPOS IMPORTANTES PARA NOTAS
      notas: factura.notas || "",
      tiempo_entrega: factura.tiempo_entrega || "",
      motor_voltaje: factura.motor_voltaje || ""
    };

    // 🔴 NORMALIZAR ITEMS
    const itemsNormalizados = items.map((item, index) => {
      let imagenValida = null;

      // Validar imagen base64
      if (item.imagen && typeof item.imagen === "string") {
        if (item.imagen.startsWith("data:image")) {
          imagenValida = item.imagen;
        } else {
          console.log(`⚠️ Imagen inválida en item ${index}`);
        }
      }

      return {
        descripcion: item.descripcion || "",
        cantidad: Number(item.cantidad) || 0,
        precio: Number(item.precio) || 0,
        unidad: item.unidad || "",
        imagen: imagenValida
      };
    });

    // 🔍 DEBUG FINAL
    console.log("FACTURA NORMALIZADA:", facturaNormalizada);
    console.log("ITEMS NORMALIZADOS:", itemsNormalizados.length);

    // ================= GENERAR PDF =================
    generarPDF(res, facturaNormalizada, itemsNormalizados);

  } catch (error) {
    console.error("❌ ERROR GENERANDO PDF:", error);
    res.status(500).json({
      error: true,
      message: "Error generando PDF"
    });
  }
});

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("✅ PDF Service activo");
});

// ================= SERVER =================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("🚀 PDF Service corriendo en puerto " + PORT);
});