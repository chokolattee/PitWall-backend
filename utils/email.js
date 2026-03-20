const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),  
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});


transporter.verify((error) => {
    if (error) console.error('SMTP connection failed:', error.message);
    else console.log('SMTP ready — Mailtrap connected');
});

const generateReceiptPDF = (order, customerName, status) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', c => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const PW = doc.page.width, L = 50, R = PW - 50, W = R - L;
            const RED = '#E10600', DARK = '#1A1A1A', BLK = '#0F0F0F';
            const SIL = '#7f8c8d', LGT = '#f5f7fa', WHT = '#FFFFFF';
            const SC = { Processing:'#FFB800', Confirmed:'#0067FF', Shipped:'#9b59b6', Delivered:'#00D2BE', Cancelled:'#e74c3c' };
            const sc = SC[status] || RED;

            const idShort     = String(order._id || '').slice(-6).toUpperCase();
            const ship        = order.shippingInfo  || {};
            const pay         = order.paymentInfo   || {};
            const items       = Array.isArray(order.orderItems) ? order.orderItems : [];
            const subtotal    = Number(order.subtotal)       || 0;
            const shippingFee = Number(order.shippingFee)    || 0;
            const discount    = Number(order.discountAmount) || 0;
            const total       = Number(order.totalPrice)     || 0;
            const vcode       = (order.voucher && order.voucher.code) ? order.voucher.code : '';
            const dateStr     = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

            doc.rect(0, 0, PW, 78).fill(DARK);
            doc.fontSize(24).fillColor(WHT).font('Helvetica-Bold').text('THE PIT WALL', L, 18, { align:'center', width:W });
            doc.fontSize(8).fillColor('#aaa').font('Helvetica').text('ORDER RECEIPT', L, 50, { align:'center', width:W, characterSpacing:3 });
            doc.rect(0, 78, PW, 5).fill(RED);
            let y = 103;

            const bw = 130, bx = (PW - bw) / 2;
            doc.roundedRect(bx, y, bw, 26, 13).fill(sc);
            doc.fontSize(10).fillColor(WHT).font('Helvetica-Bold').text(status.toUpperCase(), bx, y + 8, { width:bw, align:'center' });
            y += 42;

            doc.rect(L, y, W, 34).fill(LGT);
            doc.fontSize(8).fillColor(SIL).font('Helvetica').text('ORDER ID', L + 10, y + 5);
            doc.fontSize(13).fillColor(BLK).font('Helvetica-Bold').text('#ORD-' + idShort, L + 10, y + 15);
            doc.fontSize(8).fillColor(SIL).font('Helvetica').text('DATE', R - 90, y + 5, { width:80, align:'right' });
            doc.fontSize(10).fillColor(BLK).font('Helvetica-Bold').text(dateStr, R - 90, y + 15, { width:80, align:'right' });
            y += 48;

            const sec = (label) => {
                doc.fontSize(8).fillColor(RED).font('Helvetica-Bold').text(label, L, y, { characterSpacing:2 });
                doc.moveTo(L, y + 12).lineTo(R, y + 12).strokeColor(RED).lineWidth(1.5).stroke();
                y += 18;
            };

            sec('DELIVERY INFORMATION');
            const hW = W / 2 - 10;
            doc.fontSize(9).fillColor(BLK).font('Helvetica-Bold').text((ship.firstName || '') + ' ' + (ship.lastName || ''), L, y);
            doc.fontSize(9).fillColor(SIL).font('Helvetica')
               .text(ship.phoneNumber || 'N/A', L, y + 13)
               .text((ship.address || '') + ', ' + (ship.zipCode || ''), L, y + 26, { width:hW });
            doc.fontSize(8).fillColor(SIL).font('Helvetica').text('PAYMENT METHOD', L + hW + 20, y, { characterSpacing:1 });
            doc.fontSize(10).fillColor(BLK).font('Helvetica-Bold').text(pay.method || 'N/A', L + hW + 20, y + 14);
            y += 54;

            sec('ORDER ITEMS');
            doc.rect(L, y, W, 22).fill(DARK);
            doc.fontSize(8).fillColor(WHT).font('Helvetica-Bold');
            doc.text('PRODUCT', L + 6, y + 7, { width:W * 0.44 });
            doc.text('QTY',     L + W * 0.56, y + 7, { width:W * 0.10, align:'center' });
            doc.text('UNIT PRICE', L + W * 0.66, y + 7, { width:W * 0.17, align:'right' });
            doc.text('SUBTOTAL',   L + W * 0.83, y + 7, { width:W * 0.17 - 4, align:'right' });
            y += 22;

            items.forEach((item, i) => {
                const unit = Number(item.productPrice) || 0;
                const qty  = Number(item.quantity) || 1;
                const ls   = unit * qty;
                doc.rect(L, y, W, 38).fill(i % 2 === 0 ? WHT : LGT);
                doc.fontSize(9).fillColor(BLK).font('Helvetica-Bold').text(item.productName || 'N/A', L + 6, y + 6, { width:W * 0.44 - 10 });
                doc.fontSize(8).fillColor(SIL).font('Helvetica').text('Color: ' + (item.color || 'N/A'), L + 6, y + 21, { width:W * 0.44 - 10 });
                doc.fontSize(9).fillColor(BLK).font('Helvetica')
                   .text(String(qty), L + W * 0.56, y + 14, { width:W * 0.10, align:'center' })
                   .text('P' + unit.toLocaleString(), L + W * 0.66, y + 14, { width:W * 0.17, align:'right' });
                doc.fontSize(9).fillColor(BLK).font('Helvetica-Bold').text('P' + ls.toLocaleString(), L + W * 0.83, y + 14, { width:W * 0.17 - 4, align:'right' });
                doc.moveTo(L, y + 38).lineTo(R, y + 38).strokeColor('#e8e8e8').lineWidth(0.5).stroke();
                y += 38;
            });
            y += 14;

            sec('PAYMENT SUMMARY');
            const sx = L + W * 0.52, sw = W * 0.48;
            const srow = (lbl, val, bold, col) => {
                doc.fontSize(9).fillColor(SIL).font('Helvetica').text(lbl, sx, y, { width:sw * 0.55 });
                doc.fontSize(9).fillColor(col || BLK).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(val, sx + sw * 0.55, y, { width:sw * 0.45, align:'right' });
                y += 16;
            };
            srow('Subtotal', 'P' + subtotal.toLocaleString());
            srow('Shipping Fee', 'P' + shippingFee.toLocaleString());
            if (discount > 0) srow(vcode ? `Discount (${vcode})` : 'Discount', '-P' + discount.toLocaleString(), false, '#e74c3c');
            y += 4;
            doc.rect(sx - 8, y, sw + 8, 30).fill(LGT);
            doc.moveTo(sx - 8, y).lineTo(sx + sw, y).strokeColor(RED).lineWidth(2).stroke();
            doc.fontSize(11).fillColor(BLK).font('Helvetica-Bold').text('TOTAL', sx, y + 8, { width:sw * 0.55 });
            doc.fontSize(15).fillColor(RED).font('Helvetica-Bold').text('P' + total.toLocaleString(), sx + sw * 0.55, y + 7, { width:sw * 0.45, align:'right' });

            const fy = doc.page.height - 55;
            doc.rect(0, fy, PW, 55).fill(LGT);
            doc.moveTo(0, fy).lineTo(PW, fy).strokeColor('#e0e0e0').lineWidth(1).stroke();
            doc.fontSize(8).fillColor(SIL).font('Helvetica').text('Thank you for shopping with The Pit Wall!  ·  Auto-generated receipt  ·  © ' + new Date().getFullYear() + ' The Pit Wall', L, fy + 20, { align:'center', width:W });
            doc.end();
        } catch (err) { reject(err); }
    });
};

const STATUS_CFG = {
    Processing: { color:'#f39c12', label:'PROCESSING' },
    Confirmed:  { color:'#3498db', label:'CONFIRMED'  },
    Shipped:    { color:'#9b59b6', label:'SHIPPED'    },
    Delivered:  { color:'#2ecc71', label:'DELIVERED'  },
    Cancelled:  { color:'#e74c3c', label:'CANCELLED'  },
};

const SUBJECTS = (id) => ({
    Processing: `Order #${id} is Being Processed`,
    Confirmed:  `Order #${id} Confirmed`,
    Shipped:    `Order #${id} Has Been Shipped`,
    Delivered:  `Order #${id} Delivered`,
    Cancelled:  `Order #${id} Has Been Cancelled`,
});
const HEADINGS = {
    Processing: 'Your Order is Being Processed',
    Confirmed:  'Your Order Has Been Confirmed!',
    Shipped:    'Your Order is On Its Way!',
    Delivered:  'Your Order Has Been Delivered!',
    Cancelled:  'Your Order Has Been Cancelled',
};
const MESSAGES = {
    Processing: 'We have received your order and it is currently being processed. We will notify you once it has been confirmed.',
    Confirmed:  'Great news! Your order has been confirmed and is being prepared for shipment.',
    Shipped:    'Your order has been handed to our delivery partner and is on its way. Please be ready to receive your package.',
    Delivered:  'Your order has been successfully delivered. We hope you enjoy your purchase!',
    Cancelled:  'Your order has been cancelled. If you believe this is a mistake, please contact our support team.',
};

const sendOrderStatusEmail = async (toEmail, toName, orderId, status, orderData = null) => {
    const idShort = orderId.toString().slice(-6).toUpperCase();
    const cfg     = STATUS_CFG[status] || { color:'#2c3e50', label: status.toUpperCase() };

    // ── Unwrap Mongoose doc → plain object ────────────────
    const raw = orderData
        ? (typeof orderData.toObject === 'function' ? orderData.toObject() : orderData)
        : {};

    const ship     = raw.shippingInfo  || {};
    const pay      = raw.paymentInfo   || {};
    const items    = Array.isArray(raw.orderItems) ? raw.orderItems : [];
    const subtotal = Number(raw.subtotal)       || 0;
    const sfee     = Number(raw.shippingFee)    || 0;
    const disc     = Number(raw.discountAmount) || 0;
    const total    = Number(raw.totalPrice)     || 0;
    const vcode    = (raw.voucher && raw.voucher.code) ? raw.voucher.code : '';
    const payMeth  = pay.method || 'N/A';
    const dateStr  = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

    // ── Item rows ─────────────────────────────────────────
    const itemRowsHtml = items.length > 0
        ? items.map((item, i) => {
            const unit = Number(item.productPrice) || 0;
            const qty  = Number(item.quantity) || 1;
            const ls   = unit * qty;
            const bg   = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
            return `<tr style="background:${bg};">
              <td style="padding:14px 12px;border-bottom:1px solid #eeeeee;">
                <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">${item.productName || 'N/A'}</div>
                <div style="font-size:12px;color:#888;">Color: <strong>${item.color || 'N/A'}</strong></div>
              </td>
              <td style="padding:14px 10px;border-bottom:1px solid #eeeeee;text-align:center;font-size:14px;font-weight:600;color:#1a1a1a;">${qty}</td>
              <td style="padding:14px 10px;border-bottom:1px solid #eeeeee;text-align:right;font-size:14px;color:#1a1a1a;white-space:nowrap;">&#8369;${unit.toLocaleString()}</td>
              <td style="padding:14px 10px;border-bottom:1px solid #eeeeee;text-align:right;font-size:14px;font-weight:700;color:#E10600;white-space:nowrap;">&#8369;${ls.toLocaleString()}</td>
            </tr>`;
          }).join('')
        : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#888;font-size:13px;">No items found</td></tr>`;

    const discRowHtml = disc > 0
        ? `<tr><td style="padding:7px 0;color:#888;font-size:13px;">${vcode ? `Discount (${vcode})` : 'Discount'}</td><td style="padding:7px 0;text-align:right;color:#E10600;font-size:13px;font-weight:700;">-&#8369;${disc.toLocaleString()}</td></tr>`
        : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#e8e8e8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e8;padding:32px 0;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.15);">

  <!-- HEADER -->
  <tr><td style="background:#0f0f0f;padding:30px 40px 22px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:8px;">THE PIT WALL</div>
    <div style="font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:4px;margin-top:6px;">ORDER NOTIFICATION</div>
  </td></tr>
  <tr><td style="background:#E10600;height:5px;font-size:5px;line-height:5px;">&nbsp;</td></tr>

  <!-- STATUS BADGE -->
  <tr><td style="padding:28px 40px 0;text-align:center;">
    <div style="display:inline-block;background:${cfg.color};color:#fff;padding:11px 34px;border-radius:30px;font-size:12px;font-weight:800;letter-spacing:3px;">${cfg.label}</div>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="padding:22px 40px 20px;">
    <div style="font-size:22px;font-weight:900;color:#1a1a1a;margin-bottom:10px;">${HEADINGS[status] || 'Order Update'}</div>
    <div style="font-size:15px;color:#444;margin-bottom:6px;">Hi <strong>${toName}</strong>,</div>
    <div style="font-size:14px;color:#666;line-height:1.8;">${MESSAGES[status] || ''}</div>
  </td></tr>

  <!-- ORDER ID STRIP -->
  <tr><td style="padding:0 40px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:8px;border-left:5px solid #E10600;">
      <tr>
        <td style="padding:14px 18px;">
          <div style="font-size:10px;color:#888;letter-spacing:2px;margin-bottom:3px;">ORDER ID</div>
          <div style="font-size:18px;font-weight:900;color:#1a1a1a;letter-spacing:2px;">#ORD-${idShort}</div>
        </td>
        <td style="padding:14px 18px;text-align:center;">
          <div style="font-size:10px;color:#888;letter-spacing:2px;margin-bottom:3px;">DATE</div>
          <div style="font-size:13px;font-weight:600;color:#1a1a1a;">${dateStr}</div>
        </td>
        <td style="padding:14px 18px;text-align:right;">
          <div style="font-size:10px;color:#888;letter-spacing:2px;margin-bottom:3px;">STATUS</div>
          <div style="font-size:13px;font-weight:800;color:${cfg.color};">${status}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- DELIVERY INFORMATION -->
  <tr><td style="padding:0 40px 24px;">
    <div style="font-size:10px;font-weight:800;color:#E10600;letter-spacing:3px;padding-bottom:8px;border-bottom:2px solid #E10600;margin-bottom:14px;">DELIVERY INFORMATION</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="55%" style="vertical-align:top;padding-right:24px;">
          <div style="font-size:10px;color:#aaa;letter-spacing:1px;margin-bottom:6px;">SHIP TO</div>
          <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">${(ship.firstName || '') + ' ' + (ship.lastName || '')}</div>
          <div style="font-size:13px;color:#555;margin-bottom:2px;">${ship.phoneNumber || 'N/A'}</div>
          <div style="font-size:13px;color:#555;">${(ship.address || 'N/A') + ', ' + (ship.zipCode || '')}</div>
        </td>
        <td width="45%" style="vertical-align:top;padding-left:24px;border-left:1px solid #eeeeee;">
          <div style="font-size:10px;color:#aaa;letter-spacing:1px;margin-bottom:6px;">PAYMENT METHOD</div>
          <div style="font-size:15px;font-weight:700;color:#1a1a1a;">${payMeth}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ORDER ITEMS -->
  <tr><td style="padding:0 40px 0;">
    <div style="font-size:10px;font-weight:800;color:#E10600;letter-spacing:3px;padding-bottom:8px;border-bottom:2px solid #E10600;margin-bottom:14px;">ORDER ITEMS</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #eeeeee;">
      <thead>
        <tr style="background:#1a1a1a;">
          <th style="padding:12px 12px;text-align:left;color:#fff;font-size:11px;letter-spacing:1px;">PRODUCT</th>
          <th style="padding:12px 10px;text-align:center;color:#fff;font-size:11px;letter-spacing:1px;width:50px;">QTY</th>
          <th style="padding:12px 10px;text-align:right;color:#fff;font-size:11px;letter-spacing:1px;width:95px;">UNIT PRICE</th>
          <th style="padding:12px 10px;text-align:right;color:#fff;font-size:11px;letter-spacing:1px;width:95px;">SUBTOTAL</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml}</tbody>
    </table>
  </td></tr>

  <!-- PAYMENT SUMMARY -->
  <tr><td style="padding:20px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td width="42%"></td>
      <td width="58%">
        <div style="font-size:10px;font-weight:800;color:#E10600;letter-spacing:3px;padding-bottom:8px;border-bottom:2px solid #E10600;margin-bottom:12px;">PAYMENT SUMMARY</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:7px 0;color:#888;font-size:13px;">Subtotal</td>
            <td style="padding:7px 0;text-align:right;font-size:13px;color:#1a1a1a;">&#8369;${subtotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#888;font-size:13px;">Shipping Fee</td>
            <td style="padding:7px 0;text-align:right;font-size:13px;color:#1a1a1a;">&#8369;${sfee.toLocaleString()}</td>
          </tr>
          ${discRowHtml}
          <tr><td colspan="2"><div style="border-top:2px solid #E10600;margin:10px 0;"></div></td></tr>
          <tr>
            <td style="padding:8px 0;font-size:16px;font-weight:900;color:#1a1a1a;">TOTAL</td>
            <td style="padding:8px 0;text-align:right;font-size:22px;font-weight:900;color:#E10600;">&#8369;${total.toLocaleString()}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- PDF NOTE -->
  <tr><td style="padding:0 40px 24px;">
    <div style="background:#fff8f0;border:1px solid #ffe0c0;border-radius:6px;padding:12px 16px;font-size:12px;color:#888;">
      📎 A full PDF receipt is attached to this email for your records.
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#f5f5f5;padding:18px 40px;text-align:center;border-top:1px solid #eeeeee;">
    <div style="color:#aaa;font-size:11px;">© ${new Date().getFullYear()} The Pit Wall. All rights reserved.</div>
    <div style="color:#bbb;font-size:11px;margin-top:4px;">This is an automated email — please do not reply.</div>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

    // ── PDF attachment ────────────────────────────────────
    const attachments = [];
    try {
        const pdfBuf = await generateReceiptPDF(raw, toName, status);
        attachments.push({
            filename:    `PitWall_Receipt_${idShort}.pdf`,
            content:     pdfBuf,
            contentType: 'application/pdf',
        });
        console.log(`PDF attached for #${idShort}`);
    } catch (pdfErr) {
        console.error('PDF generation failed (non-blocking):', pdfErr.message);
    }

    await transporter.sendMail({
        from:        `"${process.env.SMTP_FROM_NAME || 'PitWall Support'}" <${process.env.SMTP_FROM_EMAIL || 'pitwall@noreply.com'}>`,
        to:          toEmail,
        subject:     SUBJECTS(idShort)[status] || `Order #${idShort} Update`,
        html,
        attachments,
    });

    console.log(`Email sent to ${toEmail} — #${idShort} (${status})`);
};

module.exports = { sendOrderStatusEmail };