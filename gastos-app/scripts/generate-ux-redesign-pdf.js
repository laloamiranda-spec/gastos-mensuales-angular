const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const outputDir = path.resolve(__dirname, '..', 'docs');
const outputPath = path.join(outputDir, 'propuesta-rediseno-ux-finanzascasa.pdf');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 42;
let y = 50;

const colors = {
  ink: [22, 54, 45],
  muted: [78, 110, 98],
  line: [201, 227, 214],
  primary: [8, 117, 88],
  soft: [240, 248, 243],
  surface: [252, 255, 253],
  warning: [214, 138, 26],
  info: [31, 89, 130],
  danger: [197, 69, 72],
};

function addPageIfNeeded(extra = 24) {
  if (y + extra > pageHeight - margin) {
    doc.addPage();
    y = 50;
  }
}

function pageTitle(text, kicker) {
  if (kicker) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...colors.primary);
    doc.text(kicker.toUpperCase(), margin, y);
    y += 14;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...colors.ink);
  doc.text(text, margin, y);
  y += 24;
}

function section(text) {
  addPageIfNeeded(32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colors.primary);
  doc.text(text, margin, y);
  y += 18;
}

function paragraph(text) {
  addPageIfNeeded(48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...colors.ink);
  const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 14 + 8;
}

function bullets(items) {
  items.forEach((item) => {
    addPageIfNeeded(22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...colors.ink);
    const lines = doc.splitTextToSize(`- ${item}`, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 4;
  });
  y += 4;
}

function table(head, body) {
  addPageIfNeeded(80);
  doc.autoTable({
    startY: y,
    head: [head],
    body,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 9.3,
      textColor: colors.ink,
      cellPadding: 6,
      lineColor: colors.line,
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: colors.soft,
    },
  });
  y = doc.lastAutoTable.finalY + 18;
}

function chip(x, yPos, text, fill = colors.soft, border = colors.line, textColor = colors.ink) {
  const width = doc.getTextWidth(text) + 18;
  doc.setFillColor(...fill);
  doc.setDrawColor(...border);
  doc.roundedRect(x, yPos - 10, width, 18, 9, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  doc.text(text, x + 9, yPos + 2);
  return width;
}

function mockShellTitle(title, subtitleText) {
  addPageIfNeeded(320);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...colors.ink);
  doc.text(title, margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...colors.muted);
  const lines = doc.splitTextToSize(subtitleText, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 12 + 10;
}

function drawCard(x, top, w, h, title, value, tone = 'primary') {
  const toneMap = {
    primary: colors.primary,
    warning: colors.warning,
    info: colors.info,
    danger: colors.danger,
  };
  const accent = toneMap[tone] || colors.primary;
  doc.setFillColor(...colors.surface);
  doc.setDrawColor(...colors.line);
  doc.roundedRect(x, top, w, h, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(title.toUpperCase(), x + 14, top + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...accent);
  doc.text(value, x + 14, top + 42);
}

function drawWireframeInicio() {
  mockShellTitle('Mock 1. Inicio', 'Pantalla principal orientada a decisiones del mes y salud financiera del hogar.');
  const top = y;
  const left = margin;
  const sidebarW = 92;
  const contentX = left + sidebarW + 14;
  const contentW = pageWidth - contentX - margin;

  doc.setFillColor(14, 58, 46);
  doc.roundedRect(left, top, sidebarW, 300, 18, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(235, 252, 245);
  doc.text('FinanzasCasa', left + 14, top + 24);
  ['Inicio', 'Dinero', 'Pagos', 'Plan', 'Hogar'].forEach((item, index) => {
    const rowY = top + 54 + index * 34;
    if (index === 0) {
      doc.setFillColor(17, 94, 74);
      doc.roundedRect(left + 10, rowY - 12, sidebarW - 20, 24, 12, 12, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(230, 247, 239);
    doc.text(item, left + 16, rowY + 2);
  });

  doc.setFillColor(248, 252, 250);
  doc.setDrawColor(...colors.line);
  doc.roundedRect(contentX, top, contentW, 300, 18, 18, 'FD');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(contentX + 16, top + 14, contentW - 32, 38, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text('HOGAR ACTIVO', contentX + 28, top + 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...colors.ink);
  doc.text('FUBA', contentX + 28, top + 46);
  chip(contentX + contentW - 176, top + 33, 'Cambiar hogar', colors.soft, colors.line);
  chip(contentX + contentW - 84, top + 33, 'Acciones', [232, 247, 238], colors.line, colors.primary);

  const cardsTop = top + 66;
  const gap = 12;
  const cardW = (contentW - 32 - gap * 3) / 4;
  drawCard(contentX + 16, cardsTop, cardW, 70, 'Disponible hoy', 'MX$11,592', 'primary');
  drawCard(contentX + 16 + (cardW + gap), cardsTop, cardW, 70, 'Apartado tarjetas', 'MX$6,800', 'warning');
  drawCard(contentX + 16 + (cardW + gap) * 2, cardsTop, cardW, 70, 'Pagos proximos', '5', 'danger');
  drawCard(contentX + 16 + (cardW + gap) * 3, cardsTop, cardW, 70, 'Restante para gastar', 'MX$4,792', 'info');

  const panelTop = cardsTop + 84;
  const leftPanelW = contentW * 0.58;
  const rightPanelW = contentW - 32 - leftPanelW - 12;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(contentX + 16, panelTop, leftPanelW, 136, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text('Pagos proximos', contentX + 30, panelTop + 20);
  ['18 Mar  Telmex                  MX$899', '20 Mar  AMEX corte               MX$4,250', '24 Mar  Limpieza semanal         MX$600'].forEach((row, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.text(row, contentX + 30, panelTop + 44 + idx * 24);
  });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(contentX + 16 + leftPanelW + 12, panelTop, rightPanelW, 136, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text('Tarjetas por liquidar', contentX + 16 + leftPanelW + 26, panelTop + 20);
  drawCard(contentX + 16 + leftPanelW + 24, panelTop + 34, rightPanelW - 32, 44, 'AMEX', 'MX$4,250', 'warning');
  drawCard(contentX + 16 + leftPanelW + 24, panelTop + 84, rightPanelW - 32, 34, 'BBVA Azul', 'MX$2,550', 'info');

  y = top + 318;
}

function drawWireframePagos() {
  mockShellTitle('Mock 2. Pagos', 'Pantalla principal para obligaciones, calendario, tarjetas y recurrentes.');
  const top = y;
  const x = margin;
  const w = pageWidth - margin * 2;

  doc.setFillColor(...colors.surface);
  doc.setDrawColor(...colors.line);
  doc.roundedRect(x, top, w, 298, 18, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...colors.ink);
  doc.text('Pagos', x + 18, top + 28);
  chip(x + 104, top + 22, 'Marzo 2026');
  chip(x + 194, top + 22, 'Todas las tarjetas');
  chip(x + w - 166, top + 22, 'Vista lista', [232, 247, 238], colors.line, colors.primary);
  chip(x + w - 84, top + 22, 'Calendario');

  const cardW = (w - 18 * 2 - 12 * 3) / 4;
  const cardTop = top + 48;
  drawCard(x + 18, cardTop, cardW, 64, 'Total por pagar', 'MX$12,340', 'danger');
  drawCard(x + 18 + (cardW + 12), cardTop, cardW, 64, 'Tarjetas', 'MX$6,800', 'warning');
  drawCard(x + 18 + (cardW + 12) * 2, cardTop, cardW, 64, 'Recurrentes', 'MX$3,240', 'info');
  drawCard(x + 18 + (cardW + 12) * 3, cardTop, cardW, 64, 'Apartado ideal', 'MX$5,100', 'primary');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 18, top + 126, w * 0.59, 150, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text('Lista priorizada', x + 30, top + 146);
  [
    '18 Mar   AMEX pago limite           MX$4,250   Falta apartar MX$1,100',
    '19 Mar   Telmex                     MX$899     Confirmado',
    '24 Mar   Limpieza semanal           MX$600     Pendiente',
    '27 Mar   Spotify                    MX$179     Automatico',
  ].forEach((row, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...colors.muted);
    doc.text(row, x + 30, top + 172 + idx * 24);
  });

  doc.setFillColor(255, 255, 255);
  const rightX = x + 18 + w * 0.59 + 12;
  const rightW = w - (rightX - x) - 18;
  doc.roundedRect(rightX, top + 126, rightW, 150, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text('Tarjetas', rightX + 14, top + 146);
  drawCard(rightX + 14, top + 160, rightW - 28, 40, 'AMEX - Pago 20 Mar', 'MX$4,250', 'warning');
  drawCard(rightX + 14, top + 208, rightW - 28, 40, 'BBVA Azul - Pago 28 Mar', 'MX$2,550', 'info');

  y = top + 316;
}

function drawWireframeHogar() {
  mockShellTitle('Mock 3. Hogar', 'Pantalla enfocada en colaboracion, accesos y reparto entre integrantes.');
  const top = y;
  const x = margin;
  const w = pageWidth - margin * 2;

  doc.setFillColor(...colors.surface);
  doc.setDrawColor(...colors.line);
  doc.roundedRect(x, top, w, 316, 18, 18, 'FD');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 18, top + 18, w - 36, 58, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.text('HOGAR', x + 32, top + 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...colors.ink);
  doc.text('FUBA', x + 32, top + 58);
  chip(x + 118, top + 52, 'Plan Plus');
  chip(x + w - 182, top + 52, 'Invitar persona', [232, 247, 238], colors.line, colors.primary);
  chip(x + w - 84, top + 52, 'Configurar');

  const colW = (w - 48) / 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 18, top + 90, colW, 104, 14, 14, 'FD');
  doc.roundedRect(x + 30 + colW, top + 90, colW, 104, 14, 14, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text('Miembros del hogar', x + 30, top + 110);
  ['Eduardo  Owner del hogar', 'Ana Laura  Editor y comparte gastos', 'Mauricio  Viewer'].forEach((row, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.text(row, x + 30, top + 136 + idx * 18);
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text('Usuarios con acceso', x + 42 + colW, top + 110);
  ['lalo.amiranda@gmail.com  owner', 'ana@correo.com  editor', 'mauricio@correo.com  viewer'].forEach((row, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.text(row, x + 42 + colW, top + 136 + idx * 18);
  });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 18, top + 208, w - 36, 90, 14, 14, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text('Reparto de gastos y saldos internos', x + 30, top + 228);
  tableLikeRows([
    ['Internet', 'Eduardo 70%', 'Ana 30%', 'Pendiente de reembolso'],
    ['Supermercado', 'Eduardo 50%', 'Ana 50%', 'Liquidado'],
    ['Limpieza semanal', 'Mauricio 100%', '-', 'Programado'],
  ], x + 30, top + 242, w - 60);

  y = top + 334;
}

function tableLikeRows(rows, startX, startY, width) {
  const cols = [width * 0.30, width * 0.23, width * 0.18, width * 0.29];
  let currentY = startY;
  rows.forEach((row, index) => {
    doc.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 252 : 255, index % 2 === 0 ? 250 : 255);
    doc.roundedRect(startX, currentY, width, 20, 6, 6, 'F');
    let currentX = startX + 8;
    row.forEach((cell, cellIndex) => {
      doc.setFont('helvetica', cellIndex === 0 ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...colors.muted);
      doc.text(String(cell), currentX, currentY + 13);
      currentX += cols[cellIndex];
    });
    currentY += 24;
  });
}

pageTitle('Propuesta UX/UI de FinanzasCasa', 'Redesign');
paragraph('Documento ejecutivo de rediseno de experiencia para convertir FinanzasCasa en una plataforma mas clara, accionable y colaborativa. La propuesta toma patrones de productos de referencia en finanzas personales y los adapta al contexto de hogares compartidos, pagos recurrentes, tarjetas y manejo de efectivo.');

section('Referencias consideradas');
bullets([
  'Monarch Money: household collaboration, dashboard modular y recurring transactions.',
  'Copilot Money: foco en free to spend, salud del mes y proxima accion.',
  'Rocket Money: organizacion de facturas, recurrentes y pagos futuros.',
  'YNAB: claridad presupuestaria y lenguaje simple para decisiones diarias.',
]);

section('Problemas detectados hoy');
bullets([
  'Demasiados modulos compiten por conceptos similares.',
  'La informacion critica no aparece primero.',
  'La deuda de tarjeta, el dinero real y el gasto planeado se mezclan visualmente.',
  'La colaboracion del hogar aun se siente operativa, no humana.',
  'La interfaz conserva rasgos de panel administrativo en vez de producto financiero moderno.',
]);

section('Nueva navegacion propuesta');
table(
  ['Nivel', 'Pantalla', 'Funcion principal'],
  [
    ['1', 'Inicio', 'Entender el estado del hogar en segundos'],
    ['1', 'Dinero', 'Gestionar cuentas, movimientos y transferencias'],
    ['1', 'Pagos', 'Ver obligaciones, tarjetas, recurrentes y calendario'],
    ['1', 'Plan', 'Administrar presupuesto, limites y metas'],
    ['1', 'Hogar', 'Gestionar miembros, accesos e invitaciones'],
    ['1', 'Resumenes', 'Analizar tendencias y exportar'],
    ['1', 'Ajustes', 'Seguridad, perfil y configuracion'],
  ],
);

section('Direccion visual');
bullets([
  'Estilo editorial y ligero, no tecnico.',
  'Jerarquia fuerte en montos, alertas y proximos eventos.',
  'Sidebar mas sobria y topbar mas util.',
  'Semantica de color por estado: saludable, atencion, riesgo e informacion.',
  'Mas aire, menos cajas innecesarias y menos etiquetas duras.',
]);

drawWireframeInicio();
drawWireframePagos();
drawWireframeHogar();

section('Lineamientos UX por modulo');
table(
  ['Modulo', 'Cambio sugerido', 'Impacto esperado'],
  [
    ['Inicio', 'KPIs de decision, alertas y actividad reciente', 'Mas claridad y accion inmediata'],
    ['Dinero', 'Unificar cuentas, entradas y transferencias', 'Menos confusion conceptual'],
    ['Pagos', 'Convertirlo en pantalla estrella con tarjetas y calendario', 'Mejor control de obligaciones'],
    ['Hogar', 'Separar miembros reales de usuarios con acceso', 'Colaboracion mas clara'],
    ['Mobile', 'Bottom nav y listas tipo card', 'Uso mucho mas natural en telefono'],
  ],
);

section('Roadmap recomendado');
bullets([
  'Fase 1: shell global, navegacion, topbar y selector de hogar.',
  'Fase 2: rediseno completo de Inicio y Pagos.',
  'Fase 3: nuevo modulo Hogar y experiencia movil.',
  'Fase 4: sistema de componentes y prototipo de alta fidelidad.',
]);

section('Conclusion');
paragraph('La propuesta busca que FinanzasCasa deje de sentirse como un conjunto de pantallas y se convierta en una experiencia financiera del hogar mas simple y mas segura. El rediseno pone al frente la disponibilidad real, el dinero a apartar para tarjetas y los pagos que vienen, mientras ordena la colaboracion del hogar con una interfaz mas amigable y moderna.');

doc.save(outputPath);
console.log(`PDF generado en: ${outputPath}`);
