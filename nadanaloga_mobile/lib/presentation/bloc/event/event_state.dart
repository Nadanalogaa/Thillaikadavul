import 'package:equatable/equatable.dart';

import '../../../data/models/event_model.dart';

abstract class EventState extends Equatable {
  const EventState();

  @override
  List<Object?> get props => [];
}

class EventInitial extends EventState {}

class EventLoading extends EventState {}

class EventsLoaded extends EventState {
  final List<EventModel> events;
  const EventsLoaded(this.events);

  @override
  List<Object?> get props => [events];
}

class EventOperationSuccess extends EventState {
  final String message;
  const EventOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class EventError extends EventState {
  final String message;
  const EventError(this.message);

  @override
  List<Object?> get props => [message];
}
