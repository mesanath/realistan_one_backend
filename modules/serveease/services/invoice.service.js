const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const logger = require('../utils/logger');

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'ap-south-1';

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Build a PDF invoice buffer for a completed booking
 */
function buildPdfBuffer(booking, service, customer) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#6366f1';
    const textDark = '#1e293b';
    const textMuted = '#64748b';
    const lineColor = '#e2e8f0';

    // Header band
    doc.rect(0, 0, 595, 80).fill(primary);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('ServeEase', 50, 25);
    doc.fontSize(9).font('Helvetica')
      .text('Realistan · Your Service, On Your Schedule', 50, 52);
    doc.text('INVOICE', 450, 30, { align: 'right', width: 100 });

    // Invoice meta
    doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold');
    doc.text('Invoice Details', 50, 100);

    doc.font('Helvetica').fontSize(9).fillColor(textMuted);
    const now = new Date();
    const meta = [
      ['Invoice No', `INV-${booking.bookingCode}`],
      ['Booking ID', booking.bookingCode],
      ['Invoice Date', now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
      ['Service Date', booking.serviceEndedAt
        ? new Date(booking.serviceEndedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A'],
    ];
    meta.forEach(([k, v], i) => {
      doc.fillColor(textMuted).text(k, 50, 120 + i * 16);
      doc.fillColor(textDark).text(v, 200, 120 + i * 16);
    });

    // Customer
    doc.fillColor(textDark).fontSize(10).font('Helvetica-Bold').text('Bill To', 350, 100);
    doc.font('Helvetica').fontSize(9).fillColor(textDark)
      .text(customer.name || 'Customer', 350, 120)
      .fillColor(textMuted)
      .text(customer.phone || '', 350, 135)
      .text(booking.address?.addressLine || '', 350, 150, { width: 180 });

    // Divider
    doc.moveTo(50, 195).lineTo(545, 195).strokeColor(lineColor).stroke();

    // Service table header
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(9)
      .text('Service', 50, 210)
      .text('Package', 220, 210)
      .text('Duration', 340, 210)
      .text('Amount', 470, 210);

    doc.moveTo(50, 224).lineTo(545, 224).strokeColor(lineColor).stroke();

    // Service row
    doc.fillColor(textDark).font('Helvetica').fontSize(9)
      .text(service?.name || booking.serviceId?.toString() || 'Service', 50, 235, { width: 160 })
      .text(booking.packageName || 'Standard', 220, 235)
      .text(service?.durationMinutes ? `${service.durationMinutes} min` : '—', 340, 235)
      .text(`₹${booking.baseAmount.toLocaleString('en-IN')}`, 470, 235);

    doc.moveTo(50, 260).lineTo(545, 260).strokeColor(lineColor).stroke();

    // Pricing breakdown
    let y = 275;
    const pricingRows = [
      ['Subtotal', booking.baseAmount],
      ['Discount', -booking.discountAmount],
    ];
    if (booking.couponCode) pricingRows.splice(1, 0, [`Coupon (${booking.couponCode})`, -booking.discountAmount]);

    pricingRows.forEach(([label, amt]) => {
      if (Math.abs(amt) === 0 && label !== 'Subtotal') return;
      doc.fillColor(textMuted).font('Helvetica').fontSize(9).text(label, 350, y);
      const sign = amt < 0 ? '-' : '';
      doc.fillColor(amt < 0 ? '#22c55e' : textDark)
        .text(`${sign}₹${Math.abs(amt).toLocaleString('en-IN')}`, 470, y);
      y += 16;
    });

    // Total
    doc.moveTo(350, y + 4).lineTo(545, y + 4).strokeColor(primary).lineWidth(1.5).stroke();
    y += 14;
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(11)
      .text('Total Paid', 350, y)
      .text(`₹${booking.finalAmount.toLocaleString('en-IN')}`, 470, y);

    // Payment method
    y += 25;
    doc.fillColor(textMuted).font('Helvetica').fontSize(8)
      .text(`Payment Method: ${(booking.paymentMethod || 'cod').toUpperCase()}`, 350, y);

    // Footer
    doc.moveTo(50, 720).lineTo(545, 720).strokeColor(lineColor).stroke();
    doc.fillColor(textMuted).fontSize(7).font('Helvetica')
      .text('Thank you for choosing ServeEase by Realistan. For support: support@realistan.in | +91 80000 00000', 50, 728, { align: 'center', width: 495 });

    doc.end();
  });
}

/**
 * Generate PDF invoice, upload to S3, return public URL
 * Falls back to a data-URL flag when S3 credentials are absent (dev mode)
 */
async function generateInvoice(booking, service, customer) {
  const buffer = await buildPdfBuffer(booking, service, customer);

  if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_aws_access_key') {
    logger.warn(`[INVOICE] S3 not configured — invoice generated in memory for booking ${booking._id}`);
    return { url: null, buffer, skippedUpload: true };
  }

  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const key = `invoices/${year}/${month}/${booking._id}.pdf`;

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
    ContentDisposition: `inline; filename="invoice-${booking.bookingCode}.pdf"`,
  }));

  // Signed URL valid 7 days
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn: 7 * 24 * 3600 });

  logger.info(`[INVOICE] Generated and uploaded for booking ${booking._id} → ${key}`);
  return { url, skippedUpload: false };
}

module.exports = { generateInvoice };
