import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import 'batch_event.dart';
import 'batch_state.dart';

class BatchBloc extends Bloc<BatchEvent, BatchState> {
  final ApiClient _apiClient;

  BatchBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(BatchInitial()) {
    on<LoadBatches>(_onLoad);
    on<CreateBatch>(_onCreate);
    on<UpdateBatch>(_onUpdate);
    on<DeleteBatch>(_onDelete);
    on<TransferStudent>(_onTransfer);
  }

  Future<void> _onLoad(LoadBatches event, Emitter<BatchState> emit) async {
    emit(BatchLoading());
    try {
      final response = await _apiClient.getBatches();
      if (response.statusCode == 200 && response.data != null) {
        final batches = (response.data as List)
            .map((j) => BatchModel.fromJson(j))
            .toList();
        emit(BatchLoaded(batches));
      } else {
        emit(BatchError(response.data?['message'] ?? 'Failed to load batches.'));
      }
    } catch (e) {
      emit(const BatchError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreate(CreateBatch event, Emitter<BatchState> emit) async {
    emit(BatchLoading());
    try {
      final response = await _apiClient.createBatch(event.data);
      if (response.statusCode == 201) {
        emit(const BatchOperationSuccess('Batch created successfully.'));
        add(LoadBatches());
      } else {
        emit(BatchError(response.data?['message'] ?? 'Failed to create batch.'));
      }
    } catch (e) {
      emit(const BatchError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdate(UpdateBatch event, Emitter<BatchState> emit) async {
    emit(BatchLoading());
    try {
      final response = await _apiClient.updateBatch(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const BatchOperationSuccess('Batch updated successfully.'));
        add(LoadBatches());
      } else {
        emit(BatchError(response.data?['message'] ?? 'Failed to update batch.'));
      }
    } catch (e) {
      emit(const BatchError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDelete(DeleteBatch event, Emitter<BatchState> emit) async {
    emit(BatchLoading());
    try {
      final response = await _apiClient.deleteBatch(event.id);
      if (response.statusCode == 200) {
        emit(const BatchOperationSuccess('Batch deleted successfully.'));
        add(LoadBatches());
      } else {
        emit(BatchError(response.data?['message'] ?? 'Failed to delete batch.'));
      }
    } catch (e) {
      emit(const BatchError('Connection error. Please try again.'));
    }
  }

  Future<void> _onTransfer(TransferStudent event, Emitter<BatchState> emit) async {
    emit(BatchLoading());
    try {
      final response = await _apiClient.transferStudent(
        studentId: event.studentId,
        fromBatchId: event.fromBatchId,
        toBatchId: event.toBatchId,
      );
      if (response.statusCode == 200) {
        emit(const BatchOperationSuccess('Student transferred successfully.'));
        add(LoadBatches());
      } else {
        emit(BatchError(response.data?['message'] ?? 'Failed to transfer student.'));
      }
    } catch (e) {
      emit(const BatchError('Connection error. Please try again.'));
    }
  }
}
