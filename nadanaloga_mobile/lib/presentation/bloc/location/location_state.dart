import 'package:equatable/equatable.dart';

import '../../../data/models/location_model.dart';

abstract class LocationState extends Equatable {
  const LocationState();

  @override
  List<Object?> get props => [];
}

class LocationInitial extends LocationState {}

class LocationLoading extends LocationState {}

class LocationLoaded extends LocationState {
  final List<LocationModel> locations;
  const LocationLoaded(this.locations);

  @override
  List<Object?> get props => [locations];
}

class LocationOperationSuccess extends LocationState {
  final String message;
  const LocationOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class LocationError extends LocationState {
  final String message;
  const LocationError(this.message);

  @override
  List<Object?> get props => [message];
}
