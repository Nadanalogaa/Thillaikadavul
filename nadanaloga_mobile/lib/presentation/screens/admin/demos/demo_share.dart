import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/demo_booking_model.dart';

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// "10 Sep 2026, 10:55 AM" — or null when the booking has no date.
String? formatBookedOn(DateTime? d) {
  if (d == null) return null;
  final hour = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final minute = d.minute.toString().padLeft(2, '0');
  final ampm = d.hour < 12 ? 'AM' : 'PM';
  final day = d.day.toString().padLeft(2, '0');
  return '$day ${_months[d.month - 1]} ${d.year}, $hour:$minute $ampm';
}

String _capitalize(String s) =>
    s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';

/// Plain text that reads well in WhatsApp (*bold* is WhatsApp markup).
String buildDemoShareText(List<DemoBookingModel> bookings) {
  final blocks = <String>['*Nadanaloga – Demo bookings (${bookings.length})*'];
  for (var i = 0; i < bookings.length; i++) {
    final b = bookings[i];
    final preferred = [b.preferredDate, b.preferredTime]
        .where((v) => v != null && v.isNotEmpty)
        .join(' ');
    final lines = <String>[
      '${i + 1}. *${b.studentName ?? 'Unknown'}*',
      if (b.course?.isNotEmpty == true) 'Course: ${b.course}',
      if (b.phone?.isNotEmpty == true) 'Phone: ${b.phone}',
      if (b.email?.isNotEmpty == true) 'Email: ${b.email}',
      if (b.parentName?.isNotEmpty == true) 'Parent: ${b.parentName}',
      if (b.country?.isNotEmpty == true) 'Country: ${b.country}',
      if (preferred.isNotEmpty) 'Preferred: $preferred',
      if (formatBookedOn(b.bookedAt) != null)
        'Booked on: ${formatBookedOn(b.bookedAt)}',
      'Status: ${_capitalize(b.status ?? 'pending')}',
      if (b.notes?.isNotEmpty == true) 'Message: ${b.notes}',
    ];
    blocks.add(lines.join('\n'));
  }
  return blocks.join('\n\n');
}

/// Bottom sheet: WhatsApp · Other apps · Copy, for one or many bookings.
Future<void> showDemoShareSheet(
    BuildContext context, List<DemoBookingModel> bookings) async {
  if (bookings.isEmpty) return;
  final text = buildDemoShareText(bookings);
  final messenger = ScaffoldMessenger.of(context);

  await showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text(
              bookings.length == 1
                  ? 'Share 1 booking'
                  : 'Share ${bookings.length} bookings',
              style: AppTextStyles.labelLarge,
            ),
          ),
          ListTile(
            leading: const CircleAvatar(
              backgroundColor: Color(0xFF25D366),
              child: Icon(Icons.chat, color: Colors.white),
            ),
            title: const Text('WhatsApp'),
            onTap: () async {
              Navigator.pop(sheetContext);
              final uri = Uri.parse(
                  'https://wa.me/?text=${Uri.encodeComponent(text)}');
              var ok = false;
              try {
                ok = await launchUrl(uri,
                    mode: LaunchMode.externalApplication);
              } catch (_) {}
              if (!ok) {
                messenger.showSnackBar(const SnackBar(
                  content: Text('Could not open WhatsApp.'),
                  backgroundColor: AppColors.error,
                ));
              }
            },
          ),
          ListTile(
            leading: const CircleAvatar(
              backgroundColor: AppColors.primary,
              child: Icon(Icons.share, color: Colors.white),
            ),
            title: const Text('Other apps'),
            subtitle: const Text('SMS, email, Telegram…'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await Share.share(text, subject: 'Demo bookings');
            },
          ),
          ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.grey.shade300,
              child: const Icon(Icons.copy, color: Colors.black87),
            ),
            title: const Text('Copy text'),
            onTap: () async {
              Navigator.pop(sheetContext);
              await Clipboard.setData(ClipboardData(text: text));
              messenger.showSnackBar(
                  const SnackBar(content: Text('Copied to clipboard')));
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
