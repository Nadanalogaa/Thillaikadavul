import { supabase } from '../src/lib/supabase.js';
import type { User } from '../types';

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

  // Send email notification via backend API
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

      // Call backend email endpoint
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: userData.email,
          subject: data.title,
          body: data.message,
          recipientName: userData.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }

      const result = await response.json();
      console.log('Notification sent successfully:', data.title);

    } catch (error) {
      console.error('Error sending email notification:', error);
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
  async notifyBatchAllocation(studentId: string, batchName: string, courseName: string, teacherName: string, timing: string, adminId?: string): Promise<void> {
    const notifications: NotificationData[] = [
      // Notify student/parent
      {
        type: 'batch_allocation',
        title: 'Batch Allocation Confirmed',
        message: `${studentId} has been allocated to batch "${batchName}" for ${courseName}. Teacher: ${teacherName}. Schedule: ${timing}`,
        recipientId: studentId,
        emailRequired: true,
        priority: 'high'
      }
    ];

    // Send notifications
    for (const notification of notifications) {
      await this.sendNotification(notification);
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
  private async sendCustomerDemoBookingEmail(notificationData: any, demoBookingData: any): Promise<void> {
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