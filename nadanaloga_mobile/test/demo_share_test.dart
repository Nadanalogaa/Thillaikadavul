import 'package:flutter_test/flutter_test.dart';
import 'package:nadanaloga_mobile/data/models/demo_booking_model.dart';
import 'package:nadanaloga_mobile/presentation/screens/admin/demos/demo_share.dart';

void main() {
  test('formatBookedOn', () {
    expect(formatBookedOn(DateTime(2026, 9, 10, 10, 55)), '10 Sep 2026, 10:55 AM');
    expect(formatBookedOn(DateTime(2026, 1, 3, 0, 5)), '03 Jan 2026, 12:05 AM');
    expect(formatBookedOn(DateTime(2026, 1, 3, 12, 0)), '03 Jan 2026, 12:00 PM');
    expect(formatBookedOn(null), null);
  });
  test('share text', () {
    final b = DemoBookingModel.fromJson({
      'id': 1, 'student_name': 'Asha', 'phone': '9876543210', 'course': 'Bharatham',
      'status': 'pending', 'created_at': '2026-09-10T05:25:46.875Z', 'notes': 'Weekend please',
    });
    final text = buildDemoShareText([b]);
    print(text);
    expect(text, contains('*Asha*'));
    expect(text, contains('Booked on: '));
    expect(text, contains('Status: Pending'));
  });
}
