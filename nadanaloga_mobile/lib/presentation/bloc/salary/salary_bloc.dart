import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/salary_model.dart';
import '../../../data/models/salary_payment_model.dart';
import 'salary_event.dart';
import 'salary_state.dart';

class SalaryBloc extends Bloc<SalaryEvent, SalaryState> {
  final ApiClient _apiClient;

  SalaryBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(SalaryInitial()) {
    on<LoadSalaries>(_onLoadSalaries);
    on<CreateSalary>(_onCreateSalary);
    on<UpdateSalary>(_onUpdateSalary);
    on<DeleteSalary>(_onDeleteSalary);
    on<LoadSalaryPayments>(_onLoadPayments);
    on<RecordSalaryPayment>(_onRecordPayment);
  }

  Future<void> _onLoadSalaries(
      LoadSalaries event, Emitter<SalaryState> emit) async {
    emit(SalaryLoading());
    try {
      final response = await _apiClient.getSalaries();
      if (response.statusCode == 200 && response.data != null) {
        final salaries = (response.data as List)
            .map((j) => SalaryModel.fromJson(j))
            .toList();
        emit(SalariesLoaded(salaries));
      } else {
        emit(SalaryError(
            response.data?['message'] ?? 'Failed to load salaries.'));
      }
    } catch (e) {
      emit(const SalaryError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreateSalary(
      CreateSalary event, Emitter<SalaryState> emit) async {
    emit(SalaryLoading());
    try {
      final response = await _apiClient.createSalary(event.data);
      if (response.statusCode == 201) {
        emit(const SalaryOperationSuccess(
            'Salary config created successfully.'));
        add(LoadSalaries());
      } else {
        emit(SalaryError(
            response.data?['message'] ?? 'Failed to create salary config.'));
      }
    } catch (e) {
      emit(const SalaryError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdateSalary(
      UpdateSalary event, Emitter<SalaryState> emit) async {
    emit(SalaryLoading());
    try {
      final response = await _apiClient.updateSalary(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const SalaryOperationSuccess(
            'Salary config updated successfully.'));
        add(LoadSalaries());
      } else {
        emit(SalaryError(
            response.data?['message'] ?? 'Failed to update salary config.'));
      }
    } catch (e) {
      emit(const SalaryError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDeleteSalary(
      DeleteSalary event, Emitter<SalaryState> emit) async {
    emit(SalaryLoading());
    try {
      final response = await _apiClient.deleteSalary(event.id);
      if (response.statusCode == 200) {
        emit(const SalaryOperationSuccess(
            'Salary config deleted successfully.'));
        add(LoadSalaries());
      } else {
        emit(SalaryError(
            response.data?['message'] ?? 'Failed to delete salary config.'));
      }
    } catch (e) {
      emit(const SalaryError('Connection error. Please try again.'));
    }
  }

  Future<void> _onLoadPayments(
      LoadSalaryPayments event, Emitter<SalaryState> emit) async {
    emit(SalaryLoading());
    try {
      final response = await _apiClient.getSalaryPayments();
      if (response.statusCode == 200 && response.data != null) {
        final payments = (response.data as List)
            .map((j) => SalaryPaymentModel.fromJson(j))
            .toList();
        emit(SalaryPaymentsLoaded(payments));
      } else {
        emit(SalaryError(
            response.data?['message'] ?? 'Failed to load payments.'));
      }
    } catch (e) {
      emit(const SalaryError('Connection error. Please try again.'));
    }
  }

  Future<void> _onRecordPayment(
      RecordSalaryPayment event, Emitter<SalaryState> emit) async {
    emit(SalaryLoading());
    try {
      final response = await _apiClient.createSalaryPayment(event.data);
      if (response.statusCode == 201) {
        emit(const SalaryOperationSuccess(
            'Salary payment recorded successfully.'));
        add(LoadSalaryPayments());
      } else {
        emit(SalaryError(
            response.data?['message'] ?? 'Failed to record payment.'));
      }
    } catch (e) {
      emit(const SalaryError('Connection error. Please try again.'));
    }
  }
}
