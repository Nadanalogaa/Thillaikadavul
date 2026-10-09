import 'package:flutter_test/flutter_test.dart';
import 'package:nadanaloga_mobile/core/utils/date_display.dart';

void main() {
  test('date-only strings keep their day', () {
    expect(formatDisplayDate('2026-12-14'), 'Mon, 14 Dec 2026');
  });
  test('times read like a person wrote them', () {
    expect(formatDisplayTime('17:00:00'), '5:00 PM');
    expect(formatDisplayTime('09:05'), '9:05 AM');
    expect(formatDisplayTime('00:30'), '12:30 AM');
    expect(formatDisplayTime(''), '');
  });
  test('date and time join with a dot', () {
    expect(formatDisplayDateTime('2026-11-08', '10:00'), 'Sun, 8 Nov 2026 · 10:00 AM');
    expect(formatDisplayDateTime(null, '10:00'), '10:00 AM');
  });
  test('unparseable values are shown as they came', () {
    expect(formatDisplayDate('soon'), 'soon');
  });
}
