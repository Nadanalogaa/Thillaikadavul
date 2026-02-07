import 'package:equatable/equatable.dart';

abstract class EventEvent extends Equatable {
  const EventEvent();

  @override
  List<Object?> get props => [];
}

class LoadEvents extends EventEvent {}

class CreateEvent extends EventEvent {
  final Map<String, dynamic> data;
  const CreateEvent(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateEvent extends EventEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateEvent({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteEvent extends EventEvent {
  final int id;
  const DeleteEvent(this.id);

  @override
  List<Object?> get props => [id];
}
