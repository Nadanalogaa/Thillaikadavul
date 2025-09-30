import { supabase } from '../src/lib/supabase.js';
import type { User } from '../types';
import { sendEmailViaService, type EmailData } from '../utils/emailService';

export interface NotificationData {
  type: 'registration' | 'batch_allocation' | 'event' | 'material' | 'modification' | 'general' | 'demo_booking';
  title: string;
  message: string;
  recipientId: string;
  relatedEntityId?: string;
  relatedEntityType?: 'batch' | 'event' | 'material' | 'user' | 'demo_booking';
  priority?: 'low' | 'medium' | 'high';
  emailRequired?: boolean;
}

class NotificationService {
  // Send notification to database and optionally email
  async sendNotification(notificationData: NotificationData): Promise<void> {
    try {
      // 1. Create notification in database
      await this.createDatabaseNotification(notificationData);
      
      // 2. Send email if required
      if (notificationData.emailRequired) {
        await this.sendEmailNotification(notificationData);
      }
      
      console.log('Notification sent successfully:', notificationData.title);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Create notification record in database
  private async createDatabaseNotification(data: NotificationData): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: data.recipientId,
        recipient_id: data.recipientId,
        title: data.title,
        message: data.message,
        type: 'Info', // Database only accepts 'Info', 'Warning', 'Success', 'Error'
        is_read: false
      }]);

    if (error) {
      console.error('Error creating database notification:', error);
      throw error;
    }
  }

  // Send email notification via local email service
  private async sendEmailNotification(data: NotificationData): Promise<void> {
    try {
      // Get user email
      const { data: userData, error } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', data.recipientId)
        .single();

      if (error || !userData?.email) {
        console.error('Could not find user email for notification');
        return;
      }

      // Use local email service
      const emailData: EmailData = {
        to: userData.email,
        subject: data.title,
        body: data.message,
        recipientName: userData.name
      };

      const response = await sendEmailViaService(emailData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }

      console.log('Notification sent successfully:', data.title);

    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Send batch allocation email
  async sendBatchAllocationEmail(studentData: any, batchData: any): Promise<void> {
    try {
      const emailData: EmailData = {
        to: studentData.email,
        subject: `Batch Allocation Confirmed - ${batchData.courseName}`,
        body: `Dear ${studentData.name},

Congratulations! You have been allocated to the following batch:

📚 Course: ${batchData.courseName}
👥 Batch: ${batchData.name}
👨‍🏫 Teacher: ${batchData.teacherName}
📅 Schedule: ${batchData.schedule}
📍 Location: ${batchData.location}
🚀 Start Date: ${new Date(batchData.startDate).toLocaleDateString()}

We look forward to your participation!

Best regards,
Nadanaloga Academy Team`,
        recipientName: studentData.name
      };

      const response = await sendEmailViaService(emailData);

      if (response.ok) {
        console.log('Batch allocation email sent successfully');
      } else {
        console.error('Failed to send batch allocation email');
      }
    } catch (error) {
      console.error('Error sending batch allocation email:', error);
    }
  }

  // Send grade exam email
  async sendGradeExamEmail(studentData: any, examData: any): Promise<void> {
    try {
      const emailData: EmailData = {
        to: studentData.email,
        subject: `Exam Results - ${examData.courseName}`,
        body: `Dear ${studentData.name},

Your exam results are ready:

📝 Exam: ${examData.examName}
📚 Course: ${examData.courseName}
🎯 Grade: ${examData.grade}
📊 Score: ${examData.score}
📅 Date: ${new Date(examData.date).toLocaleDateString()}

Feedback:
${examData.feedback}

Keep up the great work!

Best regards,
Nadanaloga Academy Team`,
        recipientName: studentData.name
      };

      const response = await sendEmailViaService(emailData);

      if (response.ok) {
        console.log('Grade exam email sent successfully');
      } else {
        console.error('Failed to send grade exam email');
      }
    } catch (error) {
      console.error('Error sending grade exam email:', error);
    }
  }

  // Send book materials email
  async sendBookMaterialsEmail(studentData: any, materialData: any): Promise<void> {
    try {
      const emailData: EmailData = {
        to: studentData.email,
        subject: `New Study Material - ${materialData.title}`,
        body: `Dear ${studentData.name},

New study material has been shared with you:

📖 Title: ${materialData.title}
📚 Course: ${materialData.courseName}
📝 Description: ${materialData.description}
👨‍🏫 Shared by: ${materialData.sharedBy}
🔗 Download Link: ${materialData.downloadLink}

Happy learning!

Best regards,
Nadanaloga Academy Team`,
        recipientName: studentData.name
      };

      const response = await sendEmailViaService(emailData);

      if (response.ok) {
        console.log('Book materials email sent successfully');
      } else {
        console.error('Failed to send book materials email');
      }
    } catch (error) {
      console.error('Error sending book materials email:', error);
    }
  }

  // Send event email
  async sendEventEmail(studentData: any, eventData: any): Promise<void> {
    try {
      const emailData: EmailData = {
        to: studentData.email,
        subject: `Event Invitation - ${eventData.title}`,
        body: `Dear ${studentData.name},

You're invited to an upcoming event:

🎉 Event: ${eventData.title}
📝 Description: ${eventData.description}
📅 Date: ${new Date(eventData.date).toLocaleDateString()}
⏰ Time: ${eventData.time}
📍 Location: ${eventData.location}
📋 Registration Required: ${eventData.registrationRequired ? 'Yes' : 'No'}

We hope to see you there!

Best regards,
Nadanaloga Academy Team`,
        recipientName: studentData.name
      };

      const response = await sendEmailViaService(emailData);

      if (response.ok) {
        console.log('Event email sent successfully');
      } else {
        console.error('Failed to send event email');
      }
    } catch (error) {
      console.error('Error sending event email:', error);
    }
  }

  // Send notice email
  async sendNoticeEmail(studentData: any, noticeData: any): Promise<void> {
    try {
      const emailData: EmailData = {
        to: studentData.email,
        subject: `Important Notice - ${noticeData.title}`,
        body: `Dear ${studentData.name},

Important notice from Nadanaloga Academy:

📢 Title: ${noticeData.title}
📝 Content: ${noticeData.content}
🚨 Priority: ${noticeData.priority}
📅 Expires: ${noticeData.expiryDate ? new Date(noticeData.expiryDate).toLocaleDateString() : 'No expiry'}
👤 Issued by: ${noticeData.issuedBy}

Please take note of this information.

Best regards,
Nadanaloga Academy Team`,
        recipientName: studentData.name
      };

      const response = await sendEmailViaService(emailData);

      if (response.ok) {
        console.log('Notice email sent successfully');
      } else {
        console.error('Failed to send notice email');
      }
    } catch (error) {
      console.error('Error sending notice email:', error);
    }
  }

  // Send payment email
  async sendPaymentEmail(studentData: any, paymentData: any): Promise<void> {
    try {
      const emailData: EmailData = {
        to: studentData.email,
        subject: `Payment ${paymentData.status} - Nadanaloga Academy`,
        body: `Dear ${studentData.name},

Your payment details:

💳 Transaction ID: ${paymentData.transactionId}
💰 Amount: ${paymentData.amount}
📅 Date: ${new Date(paymentData.date).toLocaleDateString()}
📝 Description: ${paymentData.description}
✅ Status: ${paymentData.status}
${paymentData.invoiceLink ? `🧾 Invoice: ${paymentData.invoiceLink}` : ''}

Thank you for your payment!

Best regards,
Nadanaloga Academy Team`,
        recipientName: studentData.name
      };

      const response = await sendEmailViaService(emailData);

      if (response.ok) {
        console.log('Payment email sent successfully');
      } else {
        console.error('Failed to send payment email');
      }
    } catch (error) {
      console.error('Error sending payment email:', error);
    }
  }

  // Send profile update email
  async sendProfileUpdateEmail(studentData: any, updateData: any): Promise<void> {
    try {
      const emailData: EmailData = {
        to: studentData.email,
        subject: `Profile Updated - Nadanaloga Academy`,
        body: `Dear ${studentData.name},

Your profile has been updated:

📝 Updated Fields: ${updateData.updatedFields.join(', ')}
👤 Updated by: ${updateData.updatedBy}
📅 Date: ${new Date().toLocaleDateString()}

If you did not request this change, please contact us immediately.

Best regards,
Nadanaloga Academy Team`,
        recipientName: studentData.name
      };

      const response = await sendEmailViaService(emailData);

      if (response.ok) {
        console.log('Profile update email sent successfully');
      } else {
        console.error('Failed to send profile update email');
      }
    } catch (error) {
      console.error('Error sending profile update email:', error);
    }
  }

  // Student Registration Notifications
  async notifyStudentRegistration(studentData: User, adminId?: string): Promise<void> {
    const notifications: NotificationData[] = [
      // Notify student/parent
      {
        type: 'registration',
        title: 'Welcome to Nadanaloga Academy!',
        message: `Registration successful for ${studentData.name}. Your application is being reviewed by our admin team.`,
        recipientId: studentData.id,
        emailRequired: true,
        priority: 'high'
      }
    ];

    // Notify admin if provided
    if (adminId) {
      notifications.push({
        type: 'registration',
        title: 'New Student Registration',
        message: `New student ${studentData.name} has registered. Please review their application.`,
        recipientId: adminId,
        relatedEntityId: studentData.id,
        relatedEntityType: 'user',
        emailRequired: true,
        priority: 'medium'
      });
    }

    // Send all notifications
    for (const notification of notifications) {
      await this.sendNotification(notification);
    }
  }

  // Batch Allocation Notifications
  async notifyBatchAllocation(studentId: string, batchName: string, courseName: string, teacherName: string, timing: string, teacherId?: string): Promise<void> {
    try {
      // Get student info for email
      const { data: studentData, error: studentError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', studentId)
        .single();

      if (studentError || !studentData) {
        console.error('Could not find student for batch allocation notification');
        return;
      }

      const notifications: NotificationData[] = [
        // Notify student/parent
        {
          type: 'batch_allocation',
          title: 'Batch Allocation Confirmed',
          message: `You have been allocated to batch "${batchName}" for ${courseName}. Teacher: ${teacherName}. Schedule: ${timing}`,
          recipientId: studentId,
          emailRequired: true,
          priority: 'high'
        }
      ];

      // Notify admin (nadanaloga@gmail.com)
      const adminIds = await this.getAdminUsers();
      adminIds.forEach(adminId => {
        notifications.push({
          type: 'batch_allocation',
          title: 'Student Batch Assignment',
          message: `${studentData.name} has been assigned to batch "${batchName}" for ${courseName}. Teacher: ${teacherName}. Schedule: ${timing}`,
          recipientId: adminId,
          emailRequired: true,
          priority: 'medium'
        });
      });

      // Notify teacher if provided
      if (teacherId) {
        notifications.push({
          type: 'batch_allocation',
          title: 'New Student Assignment',
          message: `${studentData.name} has been assigned to your batch "${batchName}" for ${courseName}. Schedule: ${timing}`,
          recipientId: teacherId,
          emailRequired: true,
          priority: 'medium'
        });
      }

      // Send notifications
      for (const notification of notifications) {
        await this.sendNotification(notification);
      }

      // Also call the dedicated batch allocation email API for better formatting
      if (studentData.email) {
        await this.sendBatchAllocationEmail(studentData, {
          name: batchName,
          courseName: courseName,
          teacherName: teacherName,
          schedule: timing,
          location: 'To be announced',
          startDate: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error in notifyBatchAllocation:', error);
    }
  }

  // Event Notifications
  async notifyEvent(eventData: any, recipientIds: string[]): Promise<void> {
    const notifications: NotificationData[] = recipientIds.map(recipientId => ({
      type: 'event',
      title: `New Event: ${eventData.title}`,
      message: `${eventData.description}. Date: ${new Date(eventData.date).toLocaleDateString()}. Location: ${eventData.location || 'TBD'}`,
      recipientId,
      relatedEntityId: eventData.id,
      relatedEntityType: 'event',
      emailRequired: true,
      priority: eventData.priority || 'medium'
    }));

    for (const notification of notifications) {
      await this.sendNotification(notification);
    }
  }

  // Book Material Notifications
  async notifyBookMaterial(materialData: any, recipientIds: string[]): Promise<void> {
    const notifications: NotificationData[] = recipientIds.map(recipientId => ({
      type: 'material',
      title: `New Study Material: ${materialData.title}`,
      message: `New study material "${materialData.title}" has been shared with you. Subject: ${materialData.subject}`,
      recipientId,
      relatedEntityId: materialData.id,
      relatedEntityType: 'material',
      emailRequired: true,
      priority: 'medium'
    }));

    for (const notification of notifications) {
      await this.sendNotification(notification);
    }
  }

  // Profile/Data Modification Notifications
  async notifyProfileModification(studentId: string, modificationType: string, details: string): Promise<void> {
    await this.sendNotification({
      type: 'modification',
      title: 'Profile Updated',
      message: `Your ${modificationType} has been updated. ${details}`,
      recipientId: studentId,
      emailRequired: true,
      priority: 'low'
    });
  }

  // Batch notifications to multiple users
  async sendBatchNotifications(notifications: NotificationData[]): Promise<void> {
    for (const notification of notifications) {
      await this.sendNotification(notification);
    }
  }

  // Get admin users for notifications
  async getAdminUsers(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Admin');

      if (error) {
        console.error('Error getting admin users:', error);
        return [];
      }

      return data.map(user => user.id);
    } catch (error) {
      console.error('Error in getAdminUsers:', error);
      return [];
    }
  }

  // Get all students for batch notifications
  async getAllStudents(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'Student');

      if (error) {
        console.error('Error getting students:', error);
        return [];
      }

      return data.map(user => user.id);
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      return [];
    }
  }

  // Get students in specific batch
  async getStudentsInBatch(batchId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('schedule')
        .eq('id', batchId)
        .single();

      if (error || !data?.schedule) {
        return [];
      }

      const studentIds = new Set<string>();
      data.schedule.forEach((scheduleItem: any) => {
        if (scheduleItem.studentIds) {
          scheduleItem.studentIds.forEach((id: string) => studentIds.add(id));
        }
      });

      return Array.from(studentIds);
    } catch (error) {
      console.error('Error getting students in batch:', error);
      return [];
    }
  }

  // Demo Booking Notifications
  async notifyDemoBooking(demoBookingData: any): Promise<void> {
    try {
      // Get admin users to notify
      const adminIds = await this.getAdminUsers();

      const notifications: NotificationData[] = [];

      // Notify all admins about new demo booking
      adminIds.forEach(adminId => {
        notifications.push({
          type: 'demo_booking',
          title: 'New Demo Class Booking',
          message: `${demoBookingData.name} has requested a demo class for ${demoBookingData.courseName}. Email: ${demoBookingData.email}, Phone: ${demoBookingData.phoneNumber}`,
          recipientId: adminId,
          relatedEntityId: demoBookingData.id,
          relatedEntityType: 'demo_booking',
          emailRequired: true,
          priority: 'high'
        });
      });

      // Send confirmation email to customer (create a special notification for email service)
      // We'll use a dummy admin ID for the customer notification to trigger email
      if (adminIds.length > 0) {
        // Store customer email data in a special format for email service
        const customerEmailData = {
          type: 'demo_booking' as const,
          title: 'Demo Class Booking Confirmation',
          message: `Thank you ${demoBookingData.name}! We have received your demo class booking request for ${demoBookingData.courseName}. Our team will contact you within 24 hours to schedule your demo class.`,
          recipientId: 'customer-email-' + demoBookingData.id, // Special ID for customer emails
          relatedEntityId: demoBookingData.id,
          relatedEntityType: 'demo_booking' as const,
          emailRequired: true,
          priority: 'medium' as const,
          // Add customer email data for email service
          customerEmail: demoBookingData.email,
          customerName: demoBookingData.name
        };

        // Override email sending for customer notification
        await this.sendCustomerDemoBookingEmail(customerEmailData, demoBookingData);
      }

      // Send all admin notifications
      for (const notification of notifications) {
        await this.sendNotification(notification);
      }

      console.log('Demo booking notifications sent successfully');
    } catch (error) {
      console.error('Error sending demo booking notifications:', error);
    }
  }

  // Special email handler for demo booking customer confirmation
  private async sendCustomerDemoBookingEmail(_notificationData: any, demoBookingData: any): Promise<void> {
    try {
      // Create a notification record for tracking (optional)
      console.log('CUSTOMER DEMO BOOKING EMAIL:', {
        to: demoBookingData.email,
        subject: 'Demo Class Booking Confirmation - Nadanaloga Academy',
        body: `Dear ${demoBookingData.name},

Thank you for your interest in Nadanaloga Academy!

We have successfully received your demo class booking request with the following details:

📚 Course: ${demoBookingData.courseName}
👤 Name: ${demoBookingData.name}
📧 Email: ${demoBookingData.email}
📞 Phone: ${demoBookingData.phoneNumber}
🌍 Country: ${demoBookingData.country}
${demoBookingData.message ? `💬 Message: ${demoBookingData.message}` : ''}

What happens next?
✅ Our team will review your request
✅ We'll contact you within 24 hours to schedule your demo class
✅ You'll receive a calendar invitation with demo class details

If you have any questions in the meantime, feel free to contact us:
📧 Email: nadanalogaa@gmail.com
📞 Phone: [Your phone number]

We look forward to introducing you to the beautiful world of classical dance and arts!

Best regards,
Nadanaloga Academy Team

---
Where Tradition Meets Innovation in Classical Dance & Arts`,
        recipientName: demoBookingData.name,
        bookingDetails: demoBookingData
      });

      // TODO: Integrate with actual email service
      // This will be implemented when email service is connected
      
    } catch (error) {
      console.error('Error sending customer demo booking email:', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;