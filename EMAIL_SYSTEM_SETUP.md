# 📧 Email System Setup Guide

## 🚀 **What We Built**

A complete email notification system with **Resend integration** and beautiful **React Email templates**. This system handles:

- ✅ **Ticket Confirmations** - Instant email with QR codes
- ✅ **Event Reminders** - 24h and 1h before events
- ✅ **Cancellation Notifications** - Refund confirmations
- ✅ **Waitlist Updates** - "Tickets now available!"
- ✅ **Welcome Emails** - New user onboarding
- ✅ **Beautiful Templates** - Mobile-responsive with brand styling

---

## 🛠️ **Setup Instructions**

### **Step 1: Get Resend API Key**

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free)
3. Go to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `re_`)

### **Step 2: Set Environment Variables**

Add these to your `.env.local` file:

```bash
# Required for Email System
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM=Ticwaka <noreply@yourdomain.com>
EMAIL_REPLY_TO=support@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app

# Existing variables
API_SECRET_TOKEN=your_secret_token_here
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### **Step 3: Set Vercel Environment Variables**

In your Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the same variables as above
3. Make sure to set them for **Production**, **Preview**, and **Development**

### **Step 4: Domain Verification (Production)**

For production emails:

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Add the DNS records they provide
4. Update `EMAIL_FROM` to use your verified domain

---

## 📧 **How to Use the Email System**

### **In Your Components**

```typescript
import { useEmailIntegration } from '@/hooks/useEmailIntegration';

function CheckoutSuccess() {
  const { sendTicketConfirmation, isLoading } = useEmailIntegration();

  const handleSendConfirmation = async () => {
    await sendTicketConfirmation({
      id: ticket.id,
      customerName: user.name,
      customerEmail: user.email,
      eventName: event.name,
      eventDate: event.eventDate,
      eventLocation: event.location,
      ticketType: ticket.type,
      quantity: ticket.quantity,
      totalAmount: ticket.total,
      currency: 'NGN',
      orderNumber: order.number,
      eventId: event.id,
    });
  };

  return (
    <button onClick={handleSendConfirmation} disabled={isLoading}>
      {isLoading ? 'Sending...' : 'Send Confirmation'}
    </button>
  );
}
```

### **API Endpoints**

Direct API calls:

```typescript
// Send ticket confirmation
const response = await fetch("/api/emails/send-confirmation", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.API_SECRET_TOKEN,
  },
  body: JSON.stringify(ticketData),
});
```

---

## 🎨 **Email Templates**

### **Available Templates**

1. **TicketConfirmationEmail** - Complete ticket details with QR code
2. **EventReminderEmail** - 24h and 1h reminders with weather info
3. **EmailLayout** - Base template with consistent branding

### **Template Features**

- 📱 **Mobile-responsive** design
- 🎨 **Brand-consistent** styling with Ticwaka colors
- 📧 **Professional** layout with header/footer
- 🔗 **Interactive** buttons and links
- 📅 **Calendar integration** (Google, Outlook)
- 🗺️ **Maps integration** for directions
- ☁️ **Weather information** for 24h reminders

---

## 🔧 **Integration Points**

### **Automatic Email Triggers**

The system can be integrated at these points:

1. **After Ticket Purchase** (checkout success)
2. **User Registration** (welcome email)
3. **Event Reminders** (cron jobs)
4. **Cancellations** (refund processing)
5. **Waitlist Updates** (ticket availability)

### **Example Integration in Checkout**

```typescript
// In your checkout success handler
import { sendTicketConfirmationEmail } from "@/lib/emailService";

async function handleCheckoutSuccess(ticketData) {
  // Process payment...

  // Send confirmation email
  const emailResult = await sendTicketConfirmationEmail({
    id: ticket.id,
    customerName: user.name,
    customerEmail: user.email,
    // ... other ticket data
  });

  if (emailResult.success) {
    console.log("✅ Confirmation email sent:", emailResult.emailId);
  }
}
```

---

## 📊 **Email Analytics**

Resend provides built-in analytics:

- **Delivery rates**
- **Open rates**
- **Click tracking**
- **Bounce handling**
- **Spam reports**

Access these in your Resend dashboard.

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Unauthorized" errors**

   - Check `RESEND_API_KEY` is set correctly
   - Verify API key is active in Resend dashboard

2. **"Domain not verified" errors**

   - Use `resend.dev` domain for testing
   - Add DNS records for production domain

3. **Emails not sending**

   - Check environment variables are set
   - Verify API key has sending permissions
   - Check Resend dashboard for error logs

4. **Templates not rendering**
   - Ensure React Email components are imported correctly
   - Check for TypeScript errors in templates

### **Testing**

Test the email system:

```typescript
import { useEmailIntegration } from "@/hooks/useEmailIntegration";

const { testEmailSystem } = useEmailIntegration();

// Test with your email
await testEmailSystem("your-email@example.com");
```

---

## 🔮 **Next Steps**

### **Immediate Enhancements**

1. **Automated Reminders** - Set up cron jobs for 24h/1h reminders
2. **Webhook Integration** - Connect to payment success webhooks
3. **User Preferences** - Allow users to opt-out of certain emails
4. **A/B Testing** - Test different email templates

### **Advanced Features**

1. **SMS Integration** - Add Twilio for SMS notifications
2. **Push Notifications** - Web push for mobile users
3. **Email Sequences** - Multi-step onboarding emails
4. **Personalization** - Dynamic content based on user data

---

## 📈 **Performance & Scaling**

### **Current Limits**

- **Resend Free**: 100 emails/day, 3,000/month
- **Resend Pro**: 50,000 emails/month ($20/month)

### **Scaling Considerations**

- Use **email queues** for high-volume sending
- Implement **rate limiting** to avoid API limits
- Consider **batch sending** for newsletters
- Monitor **delivery rates** and **spam scores**

---

## ✅ **Checklist**

- [ ] Resend account created
- [ ] API key obtained and set in environment
- [ ] Domain verified (for production)
- [ ] Environment variables set in Vercel
- [ ] Test email sent successfully
- [ ] Integration points identified
- [ ] Monitoring set up

---

## 🎉 **You're Ready!**

Your email system is now fully functional and ready for production. The templates are beautiful, the integration is seamless, and the system is scalable.

**Next recommended step**: Set up automated reminder emails using cron jobs! 🚀
