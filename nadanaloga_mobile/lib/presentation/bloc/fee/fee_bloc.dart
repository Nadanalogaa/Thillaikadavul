import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/fee_structure_model.dart';
import '../../../data/models/invoice_model.dart';
import 'fee_event.dart';
import 'fee_state.dart';

class FeeBloc extends Bloc<FeeEvent, FeeState> {
  final ApiClient _apiClient;

  FeeBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(FeeInitial()) {
    on<LoadFeeStructures>(_onLoadStructures);
    on<CreateFeeStructure>(_onCreateStructure);
    on<UpdateFeeStructure>(_onUpdateStructure);
    on<DeleteFeeStructure>(_onDeleteStructure);
    on<LoadInvoices>(_onLoadInvoices);
    on<CreateInvoice>(_onCreateInvoice);
    on<RecordPayment>(_onRecordPayment);
  }

  Future<void> _onLoadStructures(
      LoadFeeStructures event, Emitter<FeeState> emit) async {
    emit(FeeLoading());
    try {
      final response = await _apiClient.getFeeStructures();
      if (response.statusCode == 200 && response.data != null) {
        final structures = (response.data as List)
            .map((j) => FeeStructureModel.fromJson(j))
            .toList();
        emit(FeeStructuresLoaded(structures));
      } else {
        emit(FeeError(
            response.data?['message'] ?? 'Failed to load fee structures.'));
      }
    } catch (e) {
      emit(const FeeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreateStructure(
      CreateFeeStructure event, Emitter<FeeState> emit) async {
    emit(FeeLoading());
    try {
      final response = await _apiClient.createFeeStructure(event.data);
      if (response.statusCode == 201) {
        emit(const FeeOperationSuccess('Fee structure created successfully.'));
        add(LoadFeeStructures());
      } else {
        emit(FeeError(
            response.data?['message'] ?? 'Failed to create fee structure.'));
      }
    } catch (e) {
      emit(const FeeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdateStructure(
      UpdateFeeStructure event, Emitter<FeeState> emit) async {
    emit(FeeLoading());
    try {
      final response =
          await _apiClient.updateFeeStructure(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const FeeOperationSuccess('Fee structure updated successfully.'));
        add(LoadFeeStructures());
      } else {
        emit(FeeError(
            response.data?['message'] ?? 'Failed to update fee structure.'));
      }
    } catch (e) {
      emit(const FeeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDeleteStructure(
      DeleteFeeStructure event, Emitter<FeeState> emit) async {
    emit(FeeLoading());
    try {
      final response = await _apiClient.deleteFeeStructure(event.id);
      if (response.statusCode == 200) {
        emit(const FeeOperationSuccess('Fee structure deleted successfully.'));
        add(LoadFeeStructures());
      } else {
        emit(FeeError(
            response.data?['message'] ?? 'Failed to delete fee structure.'));
      }
    } catch (e) {
      emit(const FeeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onLoadInvoices(
      LoadInvoices event, Emitter<FeeState> emit) async {
    emit(FeeLoading());
    try {
      final response = await _apiClient.getInvoices();
      if (response.statusCode == 200 && response.data != null) {
        final invoices = (response.data as List)
            .map((j) => InvoiceModel.fromJson(j))
            .toList();
        emit(InvoicesLoaded(invoices));
      } else {
        emit(FeeError(
            response.data?['message'] ?? 'Failed to load invoices.'));
      }
    } catch (e) {
      emit(const FeeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreateInvoice(
      CreateInvoice event, Emitter<FeeState> emit) async {
    emit(FeeLoading());
    try {
      final response = await _apiClient.createInvoice(event.data);
      if (response.statusCode == 201) {
        emit(const FeeOperationSuccess('Invoice created successfully.'));
        add(LoadInvoices());
      } else {
        emit(FeeError(
            response.data?['message'] ?? 'Failed to create invoice.'));
      }
    } catch (e) {
      emit(const FeeError('Connection error. Please try again.'));
    }
  }

  Future<void> _onRecordPayment(
      RecordPayment event, Emitter<FeeState> emit) async {
    emit(FeeLoading());
    try {
      final response = await _apiClient.updateInvoice(event.invoiceId, {
        'status': 'paid',
        'payment_details': event.paymentData,
      });
      if (response.statusCode == 200) {
        emit(const FeeOperationSuccess('Payment recorded successfully.'));
        add(LoadInvoices());
      } else {
        emit(FeeError(
            response.data?['message'] ?? 'Failed to record payment.'));
      }
    } catch (e) {
      emit(const FeeError('Connection error. Please try again.'));
    }
  }
}
