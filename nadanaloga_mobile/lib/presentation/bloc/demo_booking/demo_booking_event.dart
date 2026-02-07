import 'package:equatable/equatable.dart';

abstract class DemoBookingEvent extends Equatable {
  const DemoBookingEvent();

  @override
  List<Object?> get props => [];
}

class LoadDemoBookings extends DemoBookingEvent {}

class CreateDemoBooking extends DemoBookingEvent {
  final Map<String, dynamic> data;
  const CreateDemoBooking(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateDemoBooking extends DemoBookingEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateDemoBooking({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteDemoBooking extends DemoBookingEvent {
  final int id;
  const DeleteDemoBooking(this.id);

  @override
  List<Object?> get props => [id];
}
