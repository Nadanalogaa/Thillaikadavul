import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/event_model.dart';
import 'event_event.dart';
import 'event_state.dart';

class EventBloc extends Bloc<EventEvent, EventState> {
  final ApiClient _apiClient;

  EventBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(EventInitial()) {
    on<LoadEvents>(_onLoadEvents);
    on<CreateEvent>(_onCreateEvent);
    on<UpdateEvent>(_onUpdateEvent);
    on<DeleteEvent>(_onDeleteEvent);
  }

  Future<void> _onLoadEvents(
      LoadEvents event, Emitter<EventState> emit) async {
    emit(EventLoading());
    try {
      final response = await _apiClient.getEvents();
      if (response.statusCode == 200 && response.data != null) {
        final events = (response.data as List)
            .map((j) => EventModel.fromJson(j))
            .toList();
        emit(EventsLoaded(events));
      } else {
        emit(EventError(
            response.data?['message'] ?? 'Failed to load events.'));
      }
    } catch (e) {
      emit(const EventError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreateEvent(
      CreateEvent event, Emitter<EventState> emit) async {
    emit(EventLoading());
    try {
      final response = await _apiClient.createEvent(event.data);
      if (response.statusCode == 201) {
        emit(const EventOperationSuccess(
            'Event created successfully.'));
        add(LoadEvents());
      } else {
        emit(EventError(
            response.data?['message'] ?? 'Failed to create event.'));
      }
    } catch (e) {
      emit(const EventError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdateEvent(
      UpdateEvent event, Emitter<EventState> emit) async {
    emit(EventLoading());
    try {
      final response = await _apiClient.updateEvent(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const EventOperationSuccess(
            'Event updated successfully.'));
        add(LoadEvents());
      } else {
        emit(EventError(
            response.data?['message'] ?? 'Failed to update event.'));
      }
    } catch (e) {
      emit(const EventError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDeleteEvent(
      DeleteEvent event, Emitter<EventState> emit) async {
    emit(EventLoading());
    try {
      final response = await _apiClient.deleteEvent(event.id);
      if (response.statusCode == 200) {
        emit(const EventOperationSuccess(
            'Event deleted successfully.'));
        add(LoadEvents());
      } else {
        emit(EventError(
            response.data?['message'] ?? 'Failed to delete event.'));
      }
    } catch (e) {
      emit(const EventError('Connection error. Please try again.'));
    }
  }
}
