import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/demo_booking_model.dart';
import 'demo_booking_event.dart';
import 'demo_booking_state.dart';

class DemoBookingBloc extends Bloc<DemoBookingEvent, DemoBookingState> {
  final ApiClient _apiClient;

  DemoBookingBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(DemoBookingInitial()) {
    on<LoadDemoBookings>(_onLoad);
    on<CreateDemoBooking>(_onCreate);
    on<UpdateDemoBooking>(_onUpdate);
    on<DeleteDemoBooking>(_onDelete);
  }

  Future<void> _onLoad(LoadDemoBookings event, Emitter<DemoBookingState> emit) async {
    emit(DemoBookingLoading());
    try {
      final response = await _apiClient.getDemoBookings();
      if (response.statusCode == 200 && response.data != null) {
        final demoBookings = (response.data as List)
            .map((j) => DemoBookingModel.fromJson(j))
            .toList();
        emit(DemoBookingsLoaded(demoBookings));
      } else {
        emit(DemoBookingError(response.data?['message'] ?? 'Failed to load demo bookings.'));
      }
    } catch (e) {
      emit(const DemoBookingError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreate(CreateDemoBooking event, Emitter<DemoBookingState> emit) async {
    emit(DemoBookingLoading());
    try {
      final response = await _apiClient.createDemoBooking(event.data);
      if (response.statusCode == 201) {
        emit(const DemoBookingOperationSuccess('Demo booking created successfully.'));
        add(LoadDemoBookings());
      } else {
        emit(DemoBookingError(response.data?['message'] ?? 'Failed to create demo booking.'));
      }
    } catch (e) {
      emit(const DemoBookingError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdate(UpdateDemoBooking event, Emitter<DemoBookingState> emit) async {
    emit(DemoBookingLoading());
    try {
      final response = await _apiClient.updateDemoBooking(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const DemoBookingOperationSuccess('Demo booking updated successfully.'));
        add(LoadDemoBookings());
      } else {
        emit(DemoBookingError(response.data?['message'] ?? 'Failed to update demo booking.'));
      }
    } catch (e) {
      emit(const DemoBookingError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDelete(DeleteDemoBooking event, Emitter<DemoBookingState> emit) async {
    emit(DemoBookingLoading());
    try {
      final response = await _apiClient.deleteDemoBooking(event.id);
      if (response.statusCode == 200) {
        emit(const DemoBookingOperationSuccess('Demo booking deleted successfully.'));
        add(LoadDemoBookings());
      } else {
        emit(DemoBookingError(response.data?['message'] ?? 'Failed to delete demo booking.'));
      }
    } catch (e) {
      emit(const DemoBookingError('Connection error. Please try again.'));
    }
  }
}
