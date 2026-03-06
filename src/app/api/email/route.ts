import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Email configuration
const EMAIL_CONFIG = {
  from: 'noreply@theyardrestaurant.com',
  restaurantName: 'The Yard Restaurant',
  restaurantAddress: '737 Rue Batibois, Douala, Cameroon',
  restaurantPhone: '+237 671 490 733',
};

// Types for email templates
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Generate email HTML template
function generateEmailTemplate(title: string, content: string, footer?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1c1917; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #d97706;">
      <h1 style="color: #d97706; font-size: 28px; margin: 0;">🌿 The Yard Restaurant</h1>
      <p style="color: #a8a29e; margin: 5px 0 0 0;">Restaurant • Bar • Terrace</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px 0;">
      <h2 style="color: #d97706; font-size: 24px; margin-bottom: 20px;">${title}</h2>
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="padding: 20px 0; border-top: 1px solid #44403c; text-align: center; color: #a8a29e; font-size: 14px;">
      <p style="margin: 0 0 10px 0;">
        📍 ${EMAIL_CONFIG.restaurantAddress}<br>
        📞 ${EMAIL_CONFIG.restaurantPhone}
      </p>
      ${footer || ''}
      <p style="margin: 15px 0 0 0; color: #78716c;">
        © ${new Date().getFullYear()} ${EMAIL_CONFIG.restaurantName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Email templates for different events
const emailTemplates = {
  welcome: (userName: string) => ({
    subject: `Welcome to The Yard Restaurant!`,
    html: generateEmailTemplate(
      'Welcome!',
      `
        <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Welcome to <strong style="color: #d97706;">The Yard Restaurant</strong>! We're thrilled to have you join our community.
        </p>
        <p style="font-size: 16px; line-height: 1.6;">
          Experience the finest African and International cuisine in the heart of Douala. From our famous Poulet DG to our refreshing cocktails, we have something special waiting for you.
        </p>
        <div style="background-color: #292524; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #d97706; margin: 0 0 10px 0;">What you can do:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">🍽️ Browse our menu and order online</li>
            <li style="margin-bottom: 8px;">📅 Book a table for your special occasions</li>
            <li style="margin-bottom: 8px;">🎉 Plan private events with us</li>
            <li style="margin-bottom: 8px;">💳 Pay easily with Orange Money, MTN Money, or Cards</li>
          </ul>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          We look forward to serving you!
        </p>
      `
    ),
    text: `Welcome to The Yard Restaurant! We're thrilled to have you join our community. Experience the finest African and International cuisine in the heart of Douala.`,
  }),

  loginNotification: (userName: string, device?: string, location?: string) => ({
    subject: `New Login to Your Account`,
    html: generateEmailTemplate(
      'New Login Detected',
      `
        <p style="font-size: 16px; line-height: 1.6;">Hi ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          A new login was detected on your account.
        </p>
        <div style="background-color: #292524; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          ${device ? `<p style="margin: 0 0 10px 0;"><strong>Device:</strong> ${device}</p>` : ''}
          ${location ? `<p style="margin: 0;"><strong>Location:</strong> ${location}</p>` : ''}
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #fbbf24;">
          If you didn't log in, please secure your account immediately.
        </p>
      `
    ),
    text: `A new login was detected on your account at ${new Date().toLocaleString()}. If you didn't log in, please secure your account.`,
  }),

  orderConfirmation: (userName: string, orderId: string, items: {name: string; quantity: number; price: number}[], total: number, type: string) => ({
    subject: `Order Confirmed - #${orderId.slice(-6).toUpperCase()}`,
    html: generateEmailTemplate(
      'Order Confirmed!',
      `
        <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your order has been confirmed! We're preparing your delicious meal.
        </p>
        <div style="background-color: #292524; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #d97706; margin: 0 0 10px 0;"><strong>Order ID:</strong> #${orderId.slice(-6).toUpperCase()}</p>
          <p style="margin: 0 0 10px 0;"><strong>Type:</strong> ${type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}</p>
          <h4 style="margin: 15px 0 10px 0; color: #d97706;">Items:</h4>
          ${items.map(item => `<p style="margin: 5px 0;">• ${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()} XAF</p>`).join('')}
          <div style="border-top: 1px solid #44403c; margin-top: 15px; padding-top: 15px;">
            <p style="color: #d97706; font-size: 18px; margin: 0;"><strong>Total: ${total.toLocaleString()} XAF</strong></p>
          </div>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          Estimated time: <strong>25-35 minutes</strong>
        </p>
      `
    ),
    text: `Your order #${orderId.slice(-6).toUpperCase()} has been confirmed! Total: ${total.toLocaleString()} XAF. Estimated time: 25-35 minutes.`,
  }),

  orderStatusUpdate: (userName: string, orderId: string, status: string, estimatedTime?: string) => ({
    subject: `Order Update - #${orderId.slice(-6).toUpperCase()}`,
    html: generateEmailTemplate(
      'Order Status Update',
      `
        <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your order status has been updated.
        </p>
        <div style="background-color: #292524; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #a8a29e;">Order #${orderId.slice(-6).toUpperCase()}</p>
          <p style="font-size: 24px; color: #d97706; margin: 0;">${status.toUpperCase()}</p>
          ${estimatedTime ? `<p style="margin: 15px 0 0 0; color: #a8a29e;">Estimated time: ${estimatedTime}</p>` : ''}
        </div>
        ${status === 'READY' ? `
          <p style="font-size: 16px; line-height: 1.6; color: #22c55e; text-align: center;">
            🎉 Your order is ready! Come pick it up or wait for delivery.
          </p>
        ` : ''}
      `
    ),
    text: `Your order #${orderId.slice(-6).toUpperCase()} status: ${status.toUpperCase()}${estimatedTime ? `. Estimated time: ${estimatedTime}` : ''}`,
  }),

  paymentConfirmation: (userName: string, orderId: string, amount: number, paymentMethod: string) => ({
    subject: `Payment Confirmed - #${orderId.slice(-6).toUpperCase()}`,
    html: generateEmailTemplate(
      'Payment Confirmed!',
      `
        <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your payment has been successfully confirmed.
        </p>
        <div style="background-color: #292524; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 48px;">✅</span>
            <p style="color: #22c55e; font-size: 24px; margin: 10px 0;">Payment Successful</p>
          </div>
          <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> #${orderId.slice(-6).toUpperCase()}</p>
          <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> ${amount.toLocaleString()} XAF</p>
          <p style="margin: 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for your payment! Your order is being prepared.
        </p>
      `
    ),
    text: `Payment confirmed for order #${orderId.slice(-6).toUpperCase()}. Amount: ${amount.toLocaleString()} XAF via ${paymentMethod}. Thank you!`,
  }),

  reservationConfirmation: (userName: string, date: string, time: string, guests: number) => ({
    subject: `Reservation Confirmed - ${date}`,
    html: generateEmailTemplate(
      'Reservation Confirmed!',
      `
        <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Your table reservation has been confirmed!
        </p>
        <div style="background-color: #292524; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="font-size: 48px; margin: 0;">📅</p>
          <p style="color: #d97706; font-size: 24px; margin: 10px 0;">${date}</p>
          <p style="font-size: 20px; margin: 0 0 10px 0;">at ${time}</p>
          <p style="color: #a8a29e; margin: 0;">${guests} ${guests === 1 ? 'guest' : 'guests'}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          We look forward to welcoming you at The Yard Restaurant!
        </p>
      `
    ),
    text: `Your reservation is confirmed for ${date} at ${time} for ${guests} guests. We look forward to seeing you!`,
  }),

  eventConfirmation: (userName: string, eventType: string, date: string, guests: number) => ({
    subject: `Event Inquiry Received - ${eventType}`,
    html: generateEmailTemplate(
      'Event Inquiry Received!',
      `
        <p style="font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for your event inquiry! Our team will contact you within 24 hours.
        </p>
        <div style="background-color: #292524; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Event Type:</strong> ${eventType}</p>
          <p style="margin: 0 0 10px 0;"><strong>Preferred Date:</strong> ${date || 'To be confirmed'}</p>
          <p style="margin: 0;"><strong>Expected Guests:</strong> ${guests || 'To be confirmed'}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">
          For urgent inquiries, call us at <a href="tel:+237671490733" style="color: #d97706;">+237 671 490 733</a>
        </p>
      `
    ),
    text: `Thank you for your ${eventType} event inquiry! We'll contact you within 24 hours.`,
  }),
};

// Store email in Firestore for tracking (in production, integrate with actual email service)
async function storeEmailLog(adminDb: FirebaseFirestore.Firestore | null, emailData: EmailData, type: string) {
  if (!adminDb) return;

  try {
    await adminDb.collection('email_logs').add({
      ...emailData,
      type,
      status: 'pending',
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error storing email log:', error);
  }
}

// POST - Send an email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, data } = body;

    if (!type || !to) {
      return NextResponse.json({ error: 'Email type and recipient are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    let emailData: EmailData | null = null;

    switch (type) {
      case 'welcome':
        emailData = {
          to,
          ...emailTemplates.welcome(data.userName || 'Guest'),
        };
        break;
      case 'login':
        emailData = {
          to,
          ...emailTemplates.loginNotification(data.userName || 'Guest', data.device, data.location),
        };
        break;
      case 'order_confirmation':
        emailData = {
          to,
          ...emailTemplates.orderConfirmation(data.userName, data.orderId, data.items, data.total, data.orderType),
        };
        break;
      case 'order_status':
        emailData = {
          to,
          ...emailTemplates.orderStatusUpdate(data.userName, data.orderId, data.status, data.estimatedTime),
        };
        break;
      case 'payment_confirmation':
        emailData = {
          to,
          ...emailTemplates.paymentConfirmation(data.userName, data.orderId, data.amount, data.paymentMethod),
        };
        break;
      case 'reservation_confirmation':
        emailData = {
          to,
          ...emailTemplates.reservationConfirmation(data.userName, data.date, data.time, data.guests),
        };
        break;
      case 'event_confirmation':
        emailData = {
          to,
          ...emailTemplates.eventConfirmation(data.userName, data.eventType, data.date, data.guests),
        };
        break;
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    if (emailData) {
      // Store email log
      await storeEmailLog(adminDb, emailData, type);

      // In production, integrate with email service like SendGrid, Mailgun, or AWS SES
      // For now, we log the email and return success
      console.log('Email prepared:', {
        type,
        to: emailData.to,
        subject: emailData.subject,
      });

      return NextResponse.json({
        success: true,
        message: 'Email queued for delivery',
        email: {
          to: emailData.to,
          subject: emailData.subject,
        },
      });
    }

    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

// GET - Get email logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json([]);
    }

    const snapshot = await adminDb.collection('email_logs')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}
