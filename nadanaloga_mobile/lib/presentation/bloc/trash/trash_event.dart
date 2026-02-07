import 'package:equatable/equatable.dart';

abstract class TrashEvent extends Equatable {
  const TrashEvent();

  @override
  List<Object?> get props => [];
}

class LoadTrashedUsers extends TrashEvent {}

class RestoreUser extends TrashEvent {
  final int id;

  const RestoreUser(this.id);

  @override
  List<Object?> get props => [id];
}

class PermanentDeleteUser extends TrashEvent {
  final int id;

  const PermanentDeleteUser(this.id);

  @override
  List<Object?> get props => [id];
}
