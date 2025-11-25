import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmation(order, files) {
  if (!resend) {
    console.log('⚠️  Email disabled (no RESEND_API_KEY) - Would send order confirmation');
    return true;
  }

  const filesHtml = files.map(f => `<li>${f.original_filename} (${(f.file_size / 1024 / 1024).toFixed(2)} MB)</li>`).join('');

  try {
    const { data, error } = await resend.emails.send({
      from: 'OlaVoices Audio Cleanup <cleanup@olavoices.com>',
      to: [order.customer_email],
      subject: `Order Confirmation - #${order.id.slice(0, 8)}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Hi ${order.customer_name},</p>
        <p>We've received your audio files and they're now in the processing queue.</p>

        <h3>Order Details:</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.id}</li>
          <li><strong>Files:</strong> ${files.length}</li>
          <li><strong>Expected Delivery:</strong> ${order.deadline || '24-48 hours'}</li>
        </ul>

        <h3>Files Received:</h3>
        <ul>${filesHtml}</ul>

        <p><strong>What happens next?</strong></p>
        <ol>
          <li>We'll process your audio using professional tools</li>
          <li>You'll receive an email when your files are ready (usually within 24 hours)</li>
          <li>Review a preview sample</li>
          <li>Make payment to download the full files</li>
        </ol>

        <p>If you have any questions, just reply to this email.</p>

        <p>Best regards,<br>OlaVoices Audio Cleanup</p>
      `
    });

    if (error) {
      console.error('❌ Email error:', error);
      return false;
    }

    console.log('✅ Order confirmation email sent:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error);
    return false;
  }
}

/**
 * Send notification to admin about new order
 */
export async function notifyAdminNewOrder(order, files) {
  if (!resend) {
    console.log('⚠️  Email disabled (no RESEND_API_KEY) - Would send admin notification');
    return true;
  }

  const filesHtml = files.map(f => `<li>${f.original_filename} (${(f.file_size / 1024 / 1024).toFixed(2)} MB)</li>`).join('');

  try {
    const { data, error} = await resend.emails.send({
      from: 'OlaVoices System <system@olavoices.com>',
      to: [process.env.ADMIN_EMAIL || 'hello@olavoices.com'],
      subject: `🎙️ New Audio Cleanup Order - #${order.id.slice(0, 8)}`,
      html: `
        <h2>New Order Received!</h2>

        <h3>Customer:</h3>
        <ul>
          <li><strong>Name:</strong> ${order.customer_name}</li>
          <li><strong>Email:</strong> ${order.customer_email}</li>
          <li><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</li>
        </ul>

        <h3>Order Details:</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.id}</li>
          <li><strong>Files:</strong> ${files.length}</li>
          <li><strong>Format:</strong> ${order.delivery_format}</li>
          <li><strong>Loudness:</strong> ${order.loudness_target}</li>
          <li><strong>Breath Level:</strong> ${order.breath_level}</li>
          <li><strong>Deadline:</strong> ${order.deadline}</li>
          <li><strong>Price:</strong> €${order.total_price}</li>
        </ul>

        <h3>Files to Process:</h3>
        <ul>${filesHtml}</ul>

        ${order.notes ? `<p><strong>Customer Notes:</strong><br>${order.notes}</p>` : ''}

        <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin/orders/${order.id}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Order in Admin Panel</a></p>
      `
    });

    if (error) {
      console.error('❌ Admin notification error:', error);
      return false;
    }

    console.log('✅ Admin notification sent:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    return false;
  }
}

/**
 * Send files ready notification to customer
 */
export async function sendFilesReadyNotification(order, previewUrl) {
  if (!resend) {
    console.log('⚠️  Email disabled (no RESEND_API_KEY) - Would send files ready notification');
    return true;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'OlaVoices Audio Cleanup <cleanup@olavoices.com>',
      to: [order.customer_email],
      subject: `Your Audio Files Are Ready! - #${order.id.slice(0, 8)}`,
      html: `
        <h2>Your cleaned audio files are ready!</h2>
        <p>Hi ${order.customer_name},</p>
        <p>Great news! We've finished processing your audio files.</p>

        <h3>What's Next:</h3>
        <ol>
          <li><strong>Listen to the preview</strong> - Check the quality of our work</li>
          <li><strong>Make payment (€${order.total_price})</strong> - Secure checkout via Stripe</li>
          <li><strong>Download your files</strong> - Get your professional, broadcast-ready audio</li>
        </ol>

        <p style="margin: 30px 0;">
          <a href="${process.env.BASE_URL || 'http://localhost:3000'}/order/${order.id}/preview"
             style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Listen to Preview & Download
          </a>
        </p>

        <p><strong>Order Details:</strong></p>
        <ul>
          <li>Order ID: ${order.id}</li>
          <li>Files: ${order.delivery_format}</li>
          <li>Total: €${order.total_price}</li>
        </ul>

        <p>Your download link will be active for 7 days after payment.</p>

        <p>Questions? Just reply to this email!</p>

        <p>Best regards,<br>OlaVoices Audio Cleanup</p>
      `
    });

    if (error) {
      console.error('❌ Files ready email error:', error);
      return false;
    }

    console.log('✅ Files ready notification sent:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send files ready notification:', error);
    return false;
  }
}

/**
 * Send payment confirmation and download link
 */
export async function sendPaymentConfirmation(order, downloadUrl) {
  if (!resend) {
    console.log('⚠️  Email disabled (no RESEND_API_KEY) - Would send payment confirmation');
    return true;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'OlaVoices Audio Cleanup <cleanup@olavoices.com>',
      to: [order.customer_email],
      subject: `Payment Received - Download Your Files - #${order.id.slice(0, 8)}`,
      html: `
        <h2>Thank you for your payment!</h2>
        <p>Hi ${order.customer_name},</p>
        <p>Your payment of <strong>€${order.total_price}</strong> has been received.</p>

        <p style="margin: 30px 0;">
          <a href="${downloadUrl}"
             style="background: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Download Your Files
          </a>
        </p>

        <p><strong>Important:</strong></p>
        <ul>
          <li>This download link expires in 7 days</li>
          <li>You can download up to 3 times</li>
          <li>Save your files to a secure location</li>
        </ul>

        <p>Need help or have questions? Just reply to this email.</p>

        <p>We'd love your feedback! How was your experience?</p>

        <p>Best regards,<br>OlaVoices Audio Cleanup</p>
      `
    });

    if (error) {
      console.error('❌ Payment confirmation error:', error);
      return false;
    }

    console.log('✅ Payment confirmation sent:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send payment confirmation:', error);
    return false;
  }
}
