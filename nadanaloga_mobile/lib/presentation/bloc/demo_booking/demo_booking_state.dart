import 'package:equatable/equatable.dart';

import '../../../data/models/demo_booking_model.dart';

abstract class DemoBookingState extends Equatable {
  const DemoBookingState();

  @override
  List<Object?> get props => [];
}

class DemoBookingInitial extends DemoBookingState {}

class DemoBookingLoading extends DemoBookingState {}

class DemoBookingsLoaded extends DemoBookingState {
  final List<DemoBookingModel> demoBookings;
  const DemoBookingsLoaded(this.demoBookings);

  @override
  List<Object?> get props => [demoBookings];
}

class DemoBookingOperationSuccess extends DemoBookingState {
  final String message;
  const DemoBookingOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class DemoBookingError extends DemoBookingState {
  final String message;
  const DemoBookingError(this.message);

  @override
  List<Object?> get props => [message];
}
