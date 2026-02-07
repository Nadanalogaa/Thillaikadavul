import 'package:equatable/equatable.dart';

abstract class LocationEvent extends Equatable {
  const LocationEvent();

  @override
  List<Object?> get props => [];
}

class LoadLocations extends LocationEvent {}

class CreateLocation extends LocationEvent {
  final Map<String, dynamic> data;
  const CreateLocation(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateLocation extends LocationEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateLocation({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteLocation extends LocationEvent {
  final int id;
  const DeleteLocation(this.id);

  @override
  List<Object?> get props => [id];
}
