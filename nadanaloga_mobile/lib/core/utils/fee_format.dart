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

  /// The family's currency symbol from GET /api/household/fees: ₹ for Indian
  /// families, their own symbol ($, £, …) for an overseas family.
  static String symbolOf(Map<String, dynamic>? fees) {
    final s = fees?['currency_symbol'];
    return s is String && s.isNotEmpty ? s : '₹';
  }

  /// An amount in the family's currency: rupees as before (Indian grouping, no
  /// decimals); other currencies with plain grouping and cents when needed.
  static String money(String symbol, num? value) {
    if (symbol == '₹') return rupees(value);
    final v = value ?? 0;
    final negative = v < 0;
    final abs = v.abs();
    final whole = abs.floor();
    final cents = ((abs - whole) * 100).round();
    final digits = whole.toString();
    final buf = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buf.write(',');
      buf.write(digits[i]);
    }
    final frac = cents == 0 ? '' : '.${cents.toString().padLeft(2, '0')}';
    return '${negative ? '-' : ''}$symbol$buf$frac';
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

  /// "20 Nov 2026" from a plain date or a server timestamp (timestamps are
  /// shifted to IST, so a due date stored as IST midnight shows its own day).
  static String date(String? value) {
    if (value == null || value.isEmpty) return '';
    final plain = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(value);
    if (plain != null) {
      final month = int.parse(plain.group(2)!);
      if (month < 1 || month > 12) return value;
      return '${int.parse(plain.group(3)!)} ${_monthsShort[month - 1]} ${plain.group(1)}';
    }
    final d = _toIst(value);
    if (d == null) return value;
    return '${d.day} ${_monthsShort[d.month - 1]} ${d.year}';
  }

  /// Price of an extra-bill item: "₹450", or "₹450–₹500" when its options
  /// (sizes…) have their own prices. An option without a price costs [base].
  static String priceRange(num base, List<dynamic> options) {
    final prices = <num>[
      for (final o in options)
        if (o is Map) (o['amount'] is num && (o['amount'] as num) > 0) ? o['amount'] as num : base,
    ];
    if (prices.isEmpty) return rupees(base);
    prices.sort();
    return prices.first == prices.last
        ? rupees(prices.first)
        : '${rupees(prices.first)}–${rupees(prices.last)}';
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
