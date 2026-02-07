import 'package:equatable/equatable.dart';

import '../../../data/models/salary_model.dart';
import '../../../data/models/salary_payment_model.dart';

abstract class SalaryState extends Equatable {
  const SalaryState();

  @override
  List<Object?> get props => [];
}

class SalaryInitial extends SalaryState {}

class SalaryLoading extends SalaryState {}

class SalariesLoaded extends SalaryState {
  final List<SalaryModel> salaries;
  const SalariesLoaded(this.salaries);

  @override
  List<Object?> get props => [salaries];
}

class SalaryPaymentsLoaded extends SalaryState {
  final List<SalaryPaymentModel> payments;
  const SalaryPaymentsLoaded(this.payments);

  @override
  List<Object?> get props => [payments];
}

class SalaryOperationSuccess extends SalaryState {
  final String message;
  const SalaryOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class SalaryError extends SalaryState {
  final String message;
  const SalaryError(this.message);

  @override
  List<Object?> get props => [message];
}
