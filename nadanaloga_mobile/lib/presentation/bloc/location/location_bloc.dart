import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/location_model.dart';
import 'location_event.dart';
import 'location_state.dart';

class LocationBloc extends Bloc<LocationEvent, LocationState> {
  final ApiClient _apiClient;

  LocationBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(LocationInitial()) {
    on<LoadLocations>(_onLoad);
    on<CreateLocation>(_onCreate);
    on<UpdateLocation>(_onUpdate);
    on<DeleteLocation>(_onDelete);
  }

  Future<void> _onLoad(LoadLocations event, Emitter<LocationState> emit) async {
    emit(LocationLoading());
    try {
      final response = await _apiClient.getLocations();
      if (response.statusCode == 200 && response.data != null) {
        final locations = (response.data as List)
            .map((j) => LocationModel.fromJson(j))
            .toList();
        emit(LocationLoaded(locations));
      } else {
        emit(LocationError(response.data?['message'] ?? 'Failed to load locations.'));
      }
    } catch (e) {
      emit(const LocationError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreate(CreateLocation event, Emitter<LocationState> emit) async {
    emit(LocationLoading());
    try {
      final response = await _apiClient.createLocation(event.data);
      if (response.statusCode == 201) {
        emit(const LocationOperationSuccess('Location created successfully.'));
        add(LoadLocations());
      } else {
        emit(LocationError(response.data?['message'] ?? 'Failed to create location.'));
      }
    } catch (e) {
      emit(const LocationError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdate(UpdateLocation event, Emitter<LocationState> emit) async {
    emit(LocationLoading());
    try {
      final response = await _apiClient.updateLocation(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const LocationOperationSuccess('Location updated successfully.'));
        add(LoadLocations());
      } else {
        emit(LocationError(response.data?['message'] ?? 'Failed to update location.'));
      }
    } catch (e) {
      emit(const LocationError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDelete(DeleteLocation event, Emitter<LocationState> emit) async {
    emit(LocationLoading());
    try {
      final response = await _apiClient.deleteLocation(event.id);
      if (response.statusCode == 200) {
        emit(const LocationOperationSuccess('Location deleted successfully.'));
        add(LoadLocations());
      } else {
        emit(LocationError(response.data?['message'] ?? 'Failed to delete location.'));
      }
    } catch (e) {
      emit(const LocationError('Connection error. Please try again.'));
    }
  }
}
