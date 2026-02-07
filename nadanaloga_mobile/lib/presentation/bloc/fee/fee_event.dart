import 'package:equatable/equatable.dart';

abstract class FeeEvent extends Equatable {
  const FeeEvent();

  @override
  List<Object?> get props => [];
}

class LoadFeeStructures extends FeeEvent {}

class CreateFeeStructure extends FeeEvent {
  final Map<String, dynamic> data;
  const CreateFeeStructure(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateFeeStructure extends FeeEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateFeeStructure({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteFeeStructure extends FeeEvent {
  final int id;
  const DeleteFeeStructure(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadInvoices extends FeeEvent {}

class CreateInvoice extends FeeEvent {
  final Map<String, dynamic> data;
  const CreateInvoice(this.data);

  @override
  List<Object?> get props => [data];
}

class RecordPayment extends FeeEvent {
  final int invoiceId;
  final Map<String, dynamic> paymentData;
  const RecordPayment({required this.invoiceId, required this.paymentData});

  @override
  List<Object?> get props => [invoiceId, paymentData];
}
