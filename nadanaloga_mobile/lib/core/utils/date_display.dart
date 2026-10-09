// Dates for people, not for machines. The API returns DATE columns as full ISO
// timestamps (a date-only 2026-12-14 comes back as 2026-12-13T18:30:00.000Z in
// IST), so a raw string shows the wrong day — and a raw TIME shows "17:00:00".

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/// "Sun, 14 Dec 2026". Date-only strings are taken as local dates; full
/// timestamps are converted to the device's time zone first.
String formatDisplayDate(String? value) {
  final raw = (value ?? '').trim();
  if (raw.isEmpty) return '';
  final dateOnly = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(raw);
  DateTime? d;
  if (dateOnly != null) {
    d = DateTime(int.parse(dateOnly[1]!), int.parse(dateOnly[2]!), int.parse(dateOnly[3]!));
  } else {
    d = DateTime.tryParse(raw)?.toLocal();
  }
  if (d == null) return raw;
  return '${_days[d.weekday - 1]}, ${d.day} ${_months[d.month - 1]} ${d.year}';
}

/// "5:00 PM" from "17:00", "17:00:00" or a full timestamp.
String formatDisplayTime(String? value) {
  final raw = (value ?? '').trim();
  if (raw.isEmpty) return '';
  int? hour, minute;
  final hhmm = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(raw);
  if (hhmm != null) {
    hour = int.parse(hhmm[1]!);
    minute = int.parse(hhmm[2]!);
  } else {
    final d = DateTime.tryParse(raw)?.toLocal();
    if (d == null) return raw;
    hour = d.hour;
    minute = d.minute;
  }
  final h = hour % 12 == 0 ? 12 : hour % 12;
  return '$h:${minute.toString().padLeft(2, '0')} ${hour < 12 ? 'AM' : 'PM'}';
}

/// Date and time joined for a list row: "Sun, 14 Dec 2026 · 5:00 PM".
String formatDisplayDateTime(String? date, String? time) =>
    [formatDisplayDate(date), formatDisplayTime(time)]
        .where((s) => s.isNotEmpty)
        .join(' · ');
