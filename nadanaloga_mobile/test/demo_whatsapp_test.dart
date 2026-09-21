import 'package:flutter_test/flutter_test.dart';
import 'package:nadanaloga_mobile/data/models/demo_booking_model.dart';
import 'package:nadanaloga_mobile/presentation/screens/admin/demos/demo_whatsapp.dart';

void main() {
  test('phone numbers become wa.me numbers', () {
    expect(whatsAppNumber('9092908888'), '919092908888');
    expect(whatsAppNumber('+91 90929 08888'), '919092908888');
    expect(whatsAppNumber('09092908888'), '919092908888');
    expect(whatsAppNumber('+1 415 555 0100'), '14155550100');
    expect(whatsAppNumber('12345'), isNull);
    expect(whatsAppNumber(null), isNull);
  });

  test('messages match the web texts', () {
    final b = DemoBookingModel.fromJson({
      'id': 1, 'student_name': 'Mathan', 'course': 'Bharatham', 'phone': '9092908888',
      'status': 'confirmed', 'scheduled_date': '2026-09-27', 'scheduled_time': '17:00',
    });
    expect(ackMessage(b), startsWith('Hello Mathan, thank you for booking a demo class for Bharatham at Nadanaloga Fine Arts Academy.'));
    expect(confirmMessage(b), contains('is confirmed on Sun, 27 Sep 2026 at 5:00 PM.'));
  });
}
