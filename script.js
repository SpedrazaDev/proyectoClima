// ==========================================================
// Proyecto IoT - Consultas Ambientales TEC
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHvDbXG5LlK4lsPhp--ITUdqtRktN1J80",
  authDomain: "proyectoiot-101a5.firebaseapp.com",
  databaseURL: "https://proyectoiot-101a5-default-rtdb.firebaseio.com",
  projectId: "proyectoiot-101a5",
  storageBucket: "proyectoiot-101a5.firebasestorage.app",
  messagingSenderId: "852096685447",
  appId: "1:852096685447:web:5f9a58cec9bc69110b2f22"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🎨 Colores y unidades de cada variable
const propiedades = {
  temperatura: { color: "#FF6B6B", unidad: "°C" },
  humedad: { color: "#1E90FF", unidad: "%" },
  viento: { color: "#3CB371", unidad: "m/s" }
};

const btn = document.getElementById("consultarBtn");
const variableSelect = document.getElementById("variableSelect");
const resumen = document.getElementById("resumen");
let grafico = null;

// 🔍 Validación de fechas
function validarFechas(inicio, fin) {
  if (!inicio || !fin) {
    alert("⚠️ Debes seleccionar ambas fechas.");
    return false;
  }
  const d1 = new Date(inicio);
  const d2 = new Date(fin);
  if (d2 < d1) {
    alert("⚠️ La fecha final no puede ser anterior a la fecha inicial.");
    return false;
  }
  const hoy = new Date();
  if (d1 > hoy || d2 > hoy) {
    alert("⚠️ Las fechas no pueden ser mayores al día actual.");
    return false;
  }
  return true;
}

// =========================================================
// 🔍 CONSULTAR DATOS Y MOSTRAR GRÁFICO
// =========================================================
btn.addEventListener("click", async () => {
  const variable = variableSelect.value;
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  if (!validarFechas(fechaInicio, fechaFin)) return;

  try {
    const snapshot = await get(child(ref(db), "lecturas"));
    if (!snapshot.exists()) {
      alert("❌ No hay datos en Firebase.");
      return;
    }

    const datos = Object.values(snapshot.val());
    const filtrados = datos
      .filter(d => d.fecha >= fechaInicio && d.fecha <= fechaFin)
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

    if (filtrados.length === 0) {
      alert("⚠️ No se encontraron lecturas en ese rango.");
      return;
    }

    console.log("✅ Ejemplo de lectura:", filtrados[0]);
    const etiquetas = filtrados.map(d => `${d.fecha} ${d.hora}`);

    const calcStats = arr => {
      const nums = arr.filter(v => !isNaN(v));
      if (nums.length === 0) return { max: 0, min: 0, prom: 0 };
      return {
        max: Math.max(...nums).toFixed(2),
        min: Math.min(...nums).toFixed(2),
        prom: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
      };
    };

    let datasets = [];
    let resumenTexto = "";
    let tablaDatos = [];

    // =========================================
    // 🔹 Mostrar TODAS las variables
    // =========================================
    if (variable === "Todas las anteriores") {
      const variables = ["temperatura", "humedad", "viento"];

      filtrados.forEach(d => {
        tablaDatos.push({
          Fecha: `${d.fecha} ${d.hora}`,
          Temperatura: parseFloat(d.temperatura).toFixed(2),
          Humedad: parseFloat(d.humedad).toFixed(2),
          Viento: parseFloat(d.viento).toFixed(2)
        });
      });

      variables.forEach(v => {
        const valores = filtrados.map(d => parseFloat(d[v]));
        const stats = calcStats(valores);
        const { color, unidad } = propiedades[v];
        resumenTexto += `📈 ${v.charAt(0).toUpperCase() + v.slice(1)} → Promedio ${stats.prom}${unidad}, Máx ${stats.max}${unidad}, Mín ${stats.min}${unidad}\n`;

        datasets.push({
          label: `${v.charAt(0).toUpperCase() + v.slice(1)} (${unidad})`,
          data: valores,
          borderColor: color,
          backgroundColor: color + "33",
          fill: false,
          tension: 0.3,
          pointRadius: 2
        });
      });
    }
    // =========================================
    // 🔹 Solo una variable
    // =========================================
    else {
      const valores = filtrados.map(d => parseFloat(d[variable]));
      const stats = calcStats(valores);
      const { color, unidad } = propiedades[variable];

      resumenTexto = `📊 Promedio global: ${stats.prom}${unidad} | 🔼 Máx: ${stats.max}${unidad} | 🔽 Mín: ${stats.min}${unidad}`;

      filtrados.forEach(d => {
        tablaDatos.push({
          Fecha: `${d.fecha} ${d.hora}`,
          [variable.charAt(0).toUpperCase() + variable.slice(1)]: parseFloat(d[variable]).toFixed(2)
        });
      });

      datasets.push({
        label: `${variable.charAt(0).toUpperCase() + variable.slice(1)} (${unidad})`,
        data: valores,
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.3,
        pointRadius: 3
      });
    }

    // Guardar para el PDF
    window.ultimoDataset = tablaDatos;

    resumen.innerHTML = resumenTexto.replace(/\n/g, "<br>");

    // 🧹 Limpiar gráfico anterior
    const ctx = document.getElementById("grafico").getContext("2d");
    if (grafico) grafico.destroy();

    // 🧭 Dibujar nuevo gráfico
    grafico = new Chart(ctx, {
      type: "line",
      data: { labels: etiquetas, datasets },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            title: { display: true, text: "Hora del día" },
            ticks: {
              callback: function (value) {
                const label = this.getLabelForValue(value);
                return label.split(" ")[1];
              },
              maxTicksLimit: 10
            }
          },
          y: { beginAtZero: false }
        },
        plugins: {
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              label: ctx => {
                const unidad = ctx.dataset.label.match(/\((.*?)\)/)?.[1] || "";
                return `${ctx.dataset.label.split(" ")[0]}: ${ctx.parsed.y.toFixed(2)} ${unidad}`;
              }
            }
          }
        }
      }
    });

  } catch (error) {
    console.error("❌ Error al consultar Firebase:", error);
    alert("Error al obtener datos. Revisa la consola.");
  }
});

// ================================
// 🌓 MODO OSCURO / CLARO
// ================================
const modoBtn = document.getElementById("modoBtn");
modoBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  modoBtn.textContent = document.body.classList.contains("dark-mode")
    ? "☀️ Modo claro"
    : "🌙 Modo oscuro";
});

// ================================
// 📄 DESCARGAR PDF (con tabla + gráfico)
// ================================
const pdfBtn = document.getElementById("pdfBtn");
pdfBtn.addEventListener("click", async () => {
  if (!window.ultimoDataset || window.ultimoDataset.length === 0) {
    alert("⚠️ Primero realiza una consulta para generar los datos.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // 🧾 Encabezado
  doc.setFontSize(16);
  doc.text(" Reporte de Consultas Ambientales - IoT TEC", 10, 15);

  // 🖼️ Agregar imagen del gráfico
  const canvas = document.getElementById("grafico");
  if (canvas) {
    const imgData = canvas.toDataURL("image/png", 1.0);
    doc.addImage(imgData, "PNG", 10, 20, 190, 80); // (x, y, ancho, alto)
  }

  // 📊 Crear tabla de datos debajo del gráfico
  const columnas = Object.keys(window.ultimoDataset[0]);
  const filas = window.ultimoDataset.map(obj => columnas.map(c => obj[c]));

  const startY = canvas ? 110 : 30; // si no hay gráfico, empieza arriba

  doc.autoTable({
    startY,
    head: [columnas],
    body: filas,
    theme: "grid",
    headStyles: { fillColor: [22, 160, 133] },
    styles: { fontSize: 10 }
  });

  // 📅 Fecha de generación
  doc.setFontSize(10);
  doc.text(`Generado el ${new Date().toLocaleString()}`, 10, doc.lastAutoTable.finalY + 10);

  // 💾 Descargar PDF
  doc.save("reporte_ambiental.pdf");
});
