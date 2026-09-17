/// Formatting helpers for the fees screens: Indian rupee grouping and dates
/// shown in IST regardless of the device / browser time zone.
class FeeFormat {
  FeeFormat._();

  static const _monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  static const _monthsLong = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  static const _ist = Duration(hours: 5, minutes: 30);

  /// ₹1,35,000 — Indian digit grouping, no decimals.
  static String rupees(num? value) {
    final n = (value ?? 0).round();
    final negative = n < 0;
    final digits = n.abs().toString();
    String grouped;
    if (digits.length <= 3) {
      grouped = digits;
    } else {
      final last3 = digits.substring(digits.length - 3);
      var rest = digits.substring(0, digits.length - 3);
      final parts = <String>[];
      while (rest.length > 2) {
        parts.insert(0, rest.substring(rest.length - 2));
        rest = rest.substring(0, rest.length - 2);
      }
      if (rest.isNotEmpty) parts.insert(0, rest);
      grouped = '${parts.join(',')},$last3';
    }
    return '${negative ? '-' : ''}₹$grouped';
  }

  /// "Now" as a wall-clock DateTime in IST (fields are IST; the object is UTC).
  static DateTime nowIst() => DateTime.now().toUtc().add(_ist);

  /// "September 2026" — the billing period label the server uses.
  static String periodLabel(DateTime d) => '${_monthsLong[d.month - 1]} ${d.year}';

  /// The current month and the previous [count - 1] months, newest first.
  static List<String> recentPeriods({int count = 12}) {
    final now = nowIst();
    return [
      for (var i = 0; i < count; i++)
        periodLabel(DateTime.utc(now.year, now.month - i, 1)),
    ];
  }

  /// Parse a server timestamp and shift it to IST wall-clock time. Strings
  /// without a zone are treated as UTC.
  static DateTime? _toIst(String? iso) {
    if (iso == null || iso.isEmpty) return null;
    var s = iso.trim();
    final hasTime = s.contains('T') || s.contains(' ');
    final hasZone = RegExp(r'(Z|[+-]\d\d:?\d\d)$').hasMatch(s);
    if (hasTime && !hasZone) s = '${s.replaceFirst(' ', 'T')}Z';
    final parsed = DateTime.tryParse(s);
    if (parsed == null) return null;
    return parsed.toUtc().add(_ist);
  }

  static String _time(DateTime d) {
    final h12 = d.hour % 12 == 0 ? 12 : d.hour % 12;
    final mm = d.minute.toString().padLeft(2, '0');
    return '$h12:$mm ${d.hour < 12 ? 'am' : 'pm'}';
  }

  /// "17 Sep 2026, 10:42 am" (IST).
  static String dateTimeIst(String? iso) {
    final d = _toIst(iso);
    if (d == null) return iso ?? '';
    return '${d.day} ${_monthsShort[d.month - 1]} ${d.year}, ${_time(d)}';
  }

  /// "17 Sep, 10:42 am" (IST).
  static String shortDateTimeIst(String? iso) {
    final d = _toIst(iso);
    if (d == null) return iso ?? '';
    return '${d.day} ${_monthsShort[d.month - 1]}, ${_time(d)}';
  }

  /// "16 Sep" from a plain "YYYY-MM-DD" date (no time-zone shift).
  static String shortDate(String? ymd) {
    if (ymd == null || ymd.isEmpty) return '';
    final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(ymd);
    if (m == null) return ymd;
    final month = int.parse(m.group(2)!);
    final day = int.parse(m.group(3)!);
    if (month < 1 || month > 12) return ymd;
    return '$day ${_monthsShort[month - 1]}';
  }

  /// Friendly name for a stored payment method.
  static String method(String? m) {
    final v = (m ?? '').trim();
    switch (v.toLowerCase()) {
      case 'razorpay':
        return 'Online';
      case 'cash':
        return 'Cash';
      default:
        return v;
    }
  }
}
