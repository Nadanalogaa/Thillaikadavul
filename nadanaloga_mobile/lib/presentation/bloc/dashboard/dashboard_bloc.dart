import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/admin_stats_model.dart';
import 'dashboard_event.dart';
import 'dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final ApiClient _apiClient;

  DashboardBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(DashboardInitial()) {
    on<LoadDashboardStats>(_onLoadStats);
    on<RefreshDashboardStats>(_onRefreshStats);
  }

  Future<void> _onLoadStats(
    LoadDashboardStats event,
    Emitter<DashboardState> emit,
  ) async {
    emit(DashboardLoading());
    await _fetchStats(emit);
  }

  Future<void> _onRefreshStats(
    RefreshDashboardStats event,
    Emitter<DashboardState> emit,
  ) async {
    await _fetchStats(emit);
  }

  Future<void> _fetchStats(Emitter<DashboardState> emit) async {
    try {
      final response = await _apiClient.getAdminStats();
      if (response.statusCode == 200 && response.data != null) {
        final stats = AdminStatsModel.fromJson(response.data);
        emit(DashboardLoaded(stats));
      } else {
        final message = response.data?['message'] ?? 'Failed to load stats.';
        emit(DashboardError(message));
      }
    } catch (e) {
      emit(const DashboardError('Connection error. Please try again.'));
    }
  }
}
