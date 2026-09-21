import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/demo_booking_model.dart';
import '../../../../di/injection_container.dart';

// One-tap WhatsApp for demo bookings: the admin's own WhatsApp (the academy
// number) opens with the message typed in; nothing is sent by the server.
// Keep the texts in step with utils/demoWhatsApp.ts on the web.

const _academy = 'Nadanaloga Fine Arts Academy';
const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const whatsAppGreen = Color(0xFF25D366);

/// wa.me number (country code, digits only), or null when unusable.
String? whatsAppNumber(String? phone) {
  final digits = (phone ?? '').replaceAll(RegExp(r'\D'), '');
  if (digits.length == 10) return '91$digits';
  if (digits.length == 11 && digits.startsWith('0')) {
    return '91${digits.substring(1)}';
  }
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/// "Sun, 27 Sep 2026" from YYYY-MM-DD; anything else is shown as typed.
String formatDemoDate(String? value) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(value ?? '');
  if (m == null) return value ?? '';
  final d = DateTime(
      int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!));
  return '${_days[d.weekday - 1]}, ${d.day} ${_months[d.month - 1]} ${d.year}';
}

/// "5:00 PM" from HH:MM[:SS]; anything else is shown as typed.
String formatDemoTime(String? value) {
  final m = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(value ?? '');
  if (m == null) return value ?? '';
  final h = int.parse(m[1]!);
  return '${h % 12 == 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}';
}

String _name(DemoBookingModel b) =>
    (b.parentName?.isNotEmpty == true ? b.parentName : b.studentName) ??
    'there';
String _course(DemoBookingModel b) =>
    b.course?.isNotEmpty == true ? ' for ${b.course}' : '';

String ackMessage(DemoBookingModel b) =>
    'Hello ${_name(b)}, thank you for booking a demo class${_course(b)} at $_academy. '
    'We have received your request and our team will call you shortly to confirm the date and time.\n\n— $_academy';

String confirmMessage(DemoBookingModel b) {
  final date = formatDemoDate(b.scheduledDate ?? b.preferredDate);
  final time = formatDemoTime(b.scheduledTime ?? b.preferredTime);
  final when = date.isNotEmpty && time.isNotEmpty
      ? ' on $date at $time'
      : date.isNotEmpty
          ? ' on $date'
          : '';
  return 'Hello ${_name(b)}, your demo class${_course(b)} at $_academy is confirmed$when. '
      'We look forward to seeing you! Reply here if you have any questions.\n\n— $_academy';
}

/// Opens WhatsApp with the message and records it. Returns true when opened.
Future<bool> sendDemoWhatsApp(
    BuildContext context, DemoBookingModel booking, String kind) async {
  final messenger = ScaffoldMessenger.of(context);
  final number = whatsAppNumber(booking.phone);
  if (number == null) {
    messenger.showSnackBar(const SnackBar(
      content: Text('This booking has no usable phone number.'),
      backgroundColor: AppColors.error,
    ));
    return false;
  }
  final text = kind == 'confirm' ? confirmMessage(booking) : ackMessage(booking);
  final uri =
      Uri.parse('https://wa.me/$number?text=${Uri.encodeComponent(text)}');
  var opened = false;
  try {
    opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {}
  if (!opened) {
    messenger.showSnackBar(const SnackBar(
      content: Text('Could not open WhatsApp.'),
      backgroundColor: AppColors.error,
    ));
    return false;
  }
  try {
    await sl<ApiClient>().markDemoWhatsAppSent(booking.id, kind);
  } catch (_) {}
  return true;
}

/// "21 Sep, 11:40 AM" in the device's time zone.
String sentLabel(String? iso) {
  final d = iso == null ? null : DateTime.tryParse(iso)?.toLocal();
  if (d == null) return '';
  return '${d.day} ${_months[d.month - 1]}, ${formatDemoTime('${d.hour}:${d.minute.toString().padLeft(2, '0')}')}';
}
