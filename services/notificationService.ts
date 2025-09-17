import { supabase } from '../src/lib/supabase.js';
import type { User } from '../types';

export interface NotificationData {
  type: 'registration' | 'batch_allocation' | 'event' | 'material' | 'modification' | 'general';
  title: string;
  message: string;
  recipientId: string;
  relatedEntityId?: string;
  relatedEntityType?: 'batch' | 'event' | 'material' | 'user';
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
        subject: data.title,
        message: data.message,
        type: data.type,
        is_read: false,
        priority: data.priority || 'medium',
        related_entity_id: data.relatedEntityId,
        related_entity_type: data.relatedEntityType,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error creating database notification:', error);
      throw error;
    }
  }

  // Send email notification (placeholder for email service integration)
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

      // TODO: Integrate with actual email service (SendGrid, Nodemailer, etc.)
      console.log('EMAIL NOTIFICATION:', {
        to: userData.email,
        subject: data.title,
        body: data.message,
        recipientName: userData.name
      });

      // For now, just log. Later integrate with:
      // - SendGrid API
      // - Nodemailer 
      // - AWS SES
      // - Or any other email service
      
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
}

export const notificationService = new NotificationService();
export default notificationService;