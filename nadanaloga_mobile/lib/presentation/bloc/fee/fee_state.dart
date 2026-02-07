import 'package:equatable/equatable.dart';

import '../../../data/models/fee_structure_model.dart';
import '../../../data/models/invoice_model.dart';

abstract class FeeState extends Equatable {
  const FeeState();

  @override
  List<Object?> get props => [];
}

class FeeInitial extends FeeState {}

class FeeLoading extends FeeState {}

class FeeStructuresLoaded extends FeeState {
  final List<FeeStructureModel> structures;
  const FeeStructuresLoaded(this.structures);

  @override
  List<Object?> get props => [structures];
}

class InvoicesLoaded extends FeeState {
  final List<InvoiceModel> invoices;
  const InvoicesLoaded(this.invoices);

  @override
  List<Object?> get props => [invoices];
}

class FeeOperationSuccess extends FeeState {
  final String message;
  const FeeOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class FeeError extends FeeState {
  final String message;
  const FeeError(this.message);

  @override
  List<Object?> get props => [message];
}
