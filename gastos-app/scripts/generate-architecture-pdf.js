const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const outputDir = path.resolve(__dirname, '..', 'docs');
const outputPath = path.join(outputDir, 'arquitectura-finanzas-casa.pdf');

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
    const lines = doc.splitTextToSize(`• ${item}`, pageWidth - margin * 2);
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

title('Arquitectura propuesta de FinanzasCasa');
paragraph('Documento ejecutivo de rediseño funcional y tecnico, pensado para una experiencia familiar clara, con mejor organizacion entre planeacion, dinero real e instrumentos de pago.');

subtitle('Objetivo');
paragraph('La aplicacion debe ayudar a cualquier persona del hogar a entender cuanto dinero entra, cuanto sale, que pagos vienen, con que medio se pagan y cuanto queda disponible, sin obligarla a pensar en terminos tecnicos o bancarios complejos.');

subtitle('Nuevos nombres de modulos');
table(
  ['Antes', 'Ahora', 'Para que sirve'],
  [
    ['Dashboard', 'Inicio', 'Ver lo mas importante del mes en un vistazo'],
    ['Ingresos', 'Entradas de dinero', 'Registrar dinero que llega al hogar'],
    ['Gastos', 'Pagos y gastos', 'Ver obligaciones y registrar pagos'],
    ['Bancos', 'Tu dinero', 'Cuentas, saldos y movimientos reales'],
    ['Presupuesto', 'Plan mensual', 'Organizar cuanto se puede usar'],
    ['Miembros', 'Personas', 'Identificar a quienes participan'],
    ['Formas de pago', 'Tarjetas y medios de pago', 'Administrar tarjetas, efectivo, transferencias y vales'],
    ['Reportes', 'Resumenes', 'Consultar tendencias, pendientes y vista anual'],
  ],
);

subtitle('Principios de arquitectura');
bullets([
  'Separar planeacion, dinero real e instrumentos de pago.',
  'No mezclar una cuenta con saldo disponible con una tarjeta de credito.',
  'Generar ocurrencias recurrentes solo para una ventana operativa, no de forma infinita.',
  'Permitir que la experiencia del usuario sea simple aunque el modelo interno sea robusto.',
]);

subtitle('Capas funcionales');
table(
  ['Capa', 'Rol', 'Ejemplos'],
  [
    ['Cuentas', 'Saldo real disponible', 'Debito, efectivo, ahorro, inversion, vales con saldo'],
    ['Tarjetas y medios de pago', 'Instrumento con el que se paga', 'Tarjeta de credito, debito, vales, efectivo, transferencia'],
    ['Pagos y gastos planeados', 'Obligaciones futuras o recurrentes', 'Renta, suscripcion, limpieza semanal'],
    ['Ocurrencias', 'Eventos reales del calendario', 'Miercoles 4 de marzo - 600'],
    ['Movimientos reales', 'Entradas o salidas ejecutadas', 'Deposito, transferencia, pago, liquidacion'],
  ],
);

subtitle('Flujo principal del sistema');
paragraph('El comportamiento recomendado es de dos capas: lo planeado y lo real. Un gasto recurrente vive como plantilla, sus fechas del calendario viven como ocurrencias y cuando se paga, genera un movimiento real. Asi la app conserva claridad, historico y precision.');
bullets([
  'Entrada de dinero: se registra el ingreso, se elige la cuenta destino y se crea un movimiento bancario de ingreso.',
  'Gasto semanal: se registra una plantilla y el sistema genera solo las ocurrencias necesarias del mes actual y meses cercanos.',
  'Pago con debito, efectivo o vales: se marca la ocurrencia y se descuenta saldo en la cuenta correspondiente.',
  'Pago con tarjeta de credito: se registra la compra, pero la salida real de dinero ocurre al momento de la liquidacion.',
]);

subtitle('Modelo de datos recomendado');
table(
  ['Entidad', 'Responsabilidad'],
  [
    ['accounts', 'Representar saldos reales disponibles'],
    ['payment_instruments', 'Representar medios de pago'],
    ['expense_templates', 'Guardar reglas de gastos recurrentes'],
    ['expense_occurrences', 'Guardar fechas concretas de pago'],
    ['income', 'Registrar entradas de dinero'],
    ['bank_movements', 'Guardar entradas y salidas reales'],
    ['credit_card_settlements', 'Agrupar y liquidar ciclos de tarjeta en una fase posterior'],
  ],
);

subtitle('Servicios de dominio sugeridos');
bullets([
  'AccountService: administra cuentas, saldos y movimientos.',
  'PaymentInstrumentService: administra tarjetas, efectivo, transferencias y vales.',
  'RecurringObligationService: genera y sincroniza ocurrencias en ventanas de tiempo controladas.',
  'SettlementService: calcula y registra liquidaciones de tarjetas.',
]);

subtitle('Ventajas del rediseño');
bullets([
  'La experiencia es mas natural para usuarios no tecnicos.',
  'Los gastos semanales quedan representados por fecha real.',
  'El saldo de cuentas y la deuda de tarjetas dejan de confundirse.',
  'Los reportes pueden responder que toca pagar, cuanto queda y cuanto se debe con mucha mas precision.',
]);

subtitle('Ruta de evolucion');
table(
  ['Fase', 'Objetivo'],
  [
    ['Fase 1', 'Renombrar pantallas y mejorar navegacion'],
    ['Fase 2', 'Consolidar cuentas, movimientos reales e ingresos reflejados automaticamente'],
    ['Fase 3', 'Fortalecer ocurrencias y liquidaciones de tarjeta por ciclo'],
  ],
);

subtitle('Conclusion');
paragraph('La mejor arquitectura para FinanzasCasa es la que permite al usuario entender su dinero con palabras simples, mientras el sistema mantiene reglas claras de cuentas, pagos, ocurrencias y movimientos. Este enfoque reduce confusiones, mejora la escalabilidad y abre la puerta a funciones financieras mas avanzadas sin perder claridad.');

doc.save(outputPath);
console.log(`PDF generado en: ${outputPath}`);
