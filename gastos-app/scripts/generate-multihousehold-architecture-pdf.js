const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const outputDir = path.resolve(__dirname, '..', 'docs');
const outputPath = path.join(outputDir, 'arquitectura-multihogar-finanzascasa.pdf');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 48;
let y = 56;

function addPageIfNeeded(extra = 24) {
  if (y + extra > pageHeight - margin) {
    doc.addPage();
    y = 56;
  }
}

function title(text) {
  addPageIfNeeded(42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(18, 78, 56);
  doc.text(text, margin, y);
  y += 28;
}

function subtitle(text) {
  addPageIfNeeded(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105);
  doc.text(text, margin, y);
  y += 18;
}

function paragraph(text) {
  addPageIfNeeded(44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(40, 60, 52);
  const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 14 + 8;
}

function bullets(items) {
  items.forEach((item) => {
    addPageIfNeeded(22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 60, 52);
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
      fontSize: 9.5,
      textColor: [40, 60, 52],
      cellPadding: 6,
      lineColor: [205, 232, 216],
    },
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [244, 251, 247],
    },
  });
  y = doc.lastAutoTable.finalY + 18;
}

title('Arquitectura multihogar de FinanzasCasa');
paragraph('Documento tecnico de evolucion hacia una plataforma multi-hogar con usuarios reales, invitaciones, reparto de gastos por porcentaje, liquidaciones internas y administracion del sistema.');

subtitle('Objetivo');
paragraph('FinanzasCasa debe permitir que una persona participe en varios hogares sin mezclar informacion, que cada hogar tenga reglas propias y que la seguridad viva en membresias y permisos claros.');

subtitle('Principios');
bullets([
  'El eje del negocio es el hogar.',
  'Un usuario puede pertenecer a varios hogares.',
  'Los datos financieros deben colgar de household_id.',
  'El reparto de gastos vive en reglas y ocurrencias.',
  'La administracion del sistema debe separarse de la administracion del hogar.',
]);

subtitle('Entidades clave');
table(
  ['Entidad', 'Rol dentro del sistema'],
  [
    ['profiles', 'Identidad visible del usuario'],
    ['households', 'Contenedor principal del negocio'],
    ['household_memberships', 'Relacion usuario-hogar con permisos'],
    ['household_invites', 'Invitaciones pendientes o aceptadas'],
    ['subscription_plans', 'Planes free y premium'],
    ['household_subscriptions', 'Estado de pago del hogar'],
    ['expense_split_rules', 'Reparto base de gastos por porcentaje'],
    ['expense_occurrence_allocations', 'Montos reales por integrante y ocurrencia'],
  ],
);

subtitle('Roles por hogar');
bullets([
  'owner: dueño del hogar, invitaciones, plan y administracion total.',
  'admin: administra cuentas, gastos y configuracion del hogar.',
  'editor: captura movimientos, gastos y pagos.',
  'viewer: solo consulta.',
  'limited: acceso parcial para una fase posterior.',
]);

subtitle('Modulos recomendados');
table(
  ['Modulo', 'Objetivo'],
  [
    ['Hogar y accesos', 'Crear hogares, invitar personas y administrar roles'],
    ['Reparto de gastos', 'Dividir gastos por porcentaje y preparar liquidaciones internas'],
    ['Administracion del sistema', 'Activar cuentas, planes y funciones gratuitas o de pago'],
  ],
);

subtitle('Roadmap');
bullets([
  'Fase 1: tablas base, modulos visibles y servicios iniciales.',
  'Fase 2: household_id en tablas financieras y migracion de datos existentes.',
  'Fase 3: Supabase Auth, invitaciones reales y RLS.',
  'Fase 4: liquidaciones internas, cobro por plan y auditoria.',
]);

doc.save(outputPath);
console.log(`PDF generado en: ${outputPath}`);
