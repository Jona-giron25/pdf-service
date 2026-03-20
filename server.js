const express = require("express");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

function formatCotizacion(id) {
  return `COT-${String(id).padStart(6, "0")}`;
}

const formatearMoneda = (valor) => {
  const numero = parseFloat(valor) || 0;
  return numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

function formatearTelefono(numero) {
  if (!numero) return "";
  const limpio = numero.toString().replace(/\D/g, "");
  if (limpio.length === 8) {
    return limpio.slice(0, 4) + "-" + limpio.slice(4);
  }
  return numero;
}

app.post("/cotizacion/pdf", (req, res) => {
  try {
    const { factura, items } = req.body;

    const doc = new PDFDocument({
      size: "LETTER",
      margin: 35,
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${formatCotizacion(factura.id)}.pdf`
    );

    doc.pipe(res);

    doc.on("pageAdded", () => {
      doc.x = 35;
      doc.y = 35;
    });

    const BLUE = "#0B4FA3";
    const LIGHT = "#E9EEF5";
    const GRAY = "#D6DCE5";

    // ===== LOGOS =====
    doc.image(path.join(__dirname, "assets/logo-brand.png"), 30, 30, {
      width: 320,
    });

    doc.image(path.join(__dirname, "assets/inflables.png"), 455, 50, {
      width: 110,
    });

    /* ================= HEADER ================= */

    doc.fillColor("#000")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("SOLUCIONES GRÁFICAS EMPRESARIALES, S. DE R.L.", 40, 115)
      .text("RTN: 08019021340263", 40, 130)
      .text("Tel: 2219-9820 / 9400-9145", 40, 145)
      .text("ventas@brandsolutionshn.com", 40, 160);

    doc.fillColor(BLUE)
      .fontSize(13)
      .text("COTIZACIÓN", 455, 115);

    doc.fillColor("#000")
      .fontSize(9)
      .text(`No. ${formatCotizacion(factura.id)}`, 455, 130)
      .text(`Fecha: ${factura.fecha}`, 455, 145)
      .text(`Vendedor: ${factura.usuario || ""}`, 455, 160);

    doc.moveTo(35, 185).lineTo(575, 185).strokeColor(GRAY).stroke();

    /* ================= CLIENTE ================= */

    const boxY = 180;
    const boxHeight = 60;

    doc.rect(35, boxY, 540, boxHeight).fill(LIGHT);
    doc.rect(35, boxY, 5, boxHeight).fill(BLUE);

    doc.fillColor(BLUE)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("DATOS DEL CLIENTE", 50, boxY + 8);

    doc.fillColor("#000")
      .font("Helvetica")
      .fontSize(9)
      .text(`Nombre: ${factura.cliente}`, 50, boxY + 25);

    if (factura.cliente_rtn) {
      doc.text(`RTN: ${factura.cliente_rtn}`, 50, boxY + 38);
    }

    let rightY = boxY + 25;

    if (factura.cliente_telefono) {
      doc.text(
        `Teléfono: ${formatearTelefono(factura.cliente_telefono)}`,
        320,
        rightY
      );
      rightY += 13;
    }

    if (factura.cliente_correo) {
      doc.text(`Correo: ${factura.cliente_correo}`, 320, rightY);
    }

    /* ================= TABLA ================= */

    const PAGE_HEIGHT = doc.page.height;
    const FOOTER_HEIGHT = 80;
    const SAFE_BOTTOM = PAGE_HEIGHT - FOOTER_HEIGHT;
    const pageBottom = SAFE_BOTTOM - 120;

    const startY = boxY + boxHeight + 20;
    let y = startY + 30;

    const col = {
      cod: 40,
      desc: 70,
      unidad: 235,
      cant: 285,
      precio: 330,
      total: 385,
      img: 445,
    };

    doc.rect(35, startY, 540, 22).fill(LIGHT);

    doc.fillColor(BLUE)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("CÓD.", col.cod, startY + 7)
      .text("DESCRIPCIÓN", col.desc, startY + 7)
      .text("UNIDAD", col.unidad, startY + 7)
      .text("CANT.", col.cant, startY + 7)
      .text("P. UNIT.", col.precio, startY + 7)
      .text("TOTAL", col.total, startY + 7)
      .text("IMAGEN REF.", col.img, startY + 7);

    items.forEach((item, i) => {
      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precio) || 0;

      const rowHeight = Math.max(
        doc.heightOfString(item.descripcion, { width: 150 }),
        60
      );

      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = 60;

        doc.rect(35, y, 540, 22).fill(LIGHT);

        doc.fillColor(BLUE)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("CÓD.", col.cod, y + 7)
          .text("DESCRIPCIÓN", col.desc, y + 7)
          .text("UNIDAD", col.unidad, y + 7)
          .text("CANT.", col.cant, y + 7)
          .text("P. UNIT.", col.precio, y + 7)
          .text("TOTAL", col.total, y + 7)
          .text("IMAGEN REF.", col.img, y + 7);

        y += 30;
      }

      const textY = y + rowHeight / 2 - 4;

      doc.fontSize(8)
        .fillColor("#000")
        .text(String(i + 1).padStart(2, "0"), col.cod, textY)
        .text(item.descripcion, col.desc, textY, { width: 150 })
        .text(item.unidad, col.unidad, textY, { width: 40, align: "center" })
        .text(cantidad.toString(), col.cant, textY, {
          width: 35,
          align: "center",
        })
        .text(`L ${formatearMoneda(precio)}`, col.precio, textY, {
          width: 50,
          align: "center",
        })
        .text(
          `L ${formatearMoneda(cantidad * precio)}`,
          col.total,
          textY,
          { width: 50, align: "center" }
        );

      if (item.imagen) {
        try {
          const base64 = item.imagen.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64, "base64");

          doc.image(buffer, col.img, y + 5, {
            fit: [55, 55],
          });
        } catch {}
      }

      y += rowHeight;
      doc.moveTo(35, y).lineTo(575, y).strokeColor(GRAY).stroke();
    });

    if (y > 600) {
      doc.addPage();
      y = 60;
    }

    /* ================= TOTALES ================= */

    y += 10;

    doc.font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(BLUE)
      .text(`SUBTOTAL: L ${formatearMoneda(factura.subtotal)}`, 430, y, {
        width: 140,
        align: "right",
      })
      .text(`ISV 15%: L ${formatearMoneda(factura.isv)}`, 430, y + 15, {
        width: 140,
        align: "right",
      })
      .fontSize(10)
      .text(`TOTAL: L ${formatearMoneda(factura.total)}`, 430, y + 32, {
        width: 140,
        align: "right",
      });

    /* ================= FOOTER ================= */

    const range = doc.bufferedPageRange();

    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);

      const footerY = doc.page.height - 55;

      doc.moveTo(35, footerY)
        .lineTo(575, footerY)
        .strokeColor(GRAY)
        .stroke();

      doc.font("Helvetica-Bold").fontSize(8).fillColor(BLUE);

      const pageWidth = doc.page.width;

      const direccion =
        "Barrio La Granja, Centro Comercial La Plazita, Tegucigalpa M.D.C, Honduras.";
      const contacto =
        "www.brandsolutionshn.com | +504 2219-9820 / 9400-9145 / 9422-5948";

      const direccionWidth = doc.widthOfString(direccion);
      const contactoWidth = doc.widthOfString(contacto);

      doc.text(direccion, (pageWidth - direccionWidth) / 2, footerY + 8, {
        lineBreak: false,
      });

      doc.text(contacto, (pageWidth - contactoWidth) / 2, footerY + 20, {
        lineBreak: false,
      });

      doc.text(`Página ${i + 1} de ${range.count}`, 500, footerY + 20);
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generando PDF");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("PDF Service corriendo en puerto " + PORT);
});
