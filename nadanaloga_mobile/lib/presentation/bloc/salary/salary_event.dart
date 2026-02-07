import 'package:equatable/equatable.dart';

abstract class SalaryEvent extends Equatable {
  const SalaryEvent();

  @override
  List<Object?> get props => [];
}

class LoadSalaries extends SalaryEvent {}

class CreateSalary extends SalaryEvent {
  final Map<String, dynamic> data;
  const CreateSalary(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateSalary extends SalaryEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateSalary({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteSalary extends SalaryEvent {
  final int id;
  const DeleteSalary(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadSalaryPayments extends SalaryEvent {}

class RecordSalaryPayment extends SalaryEvent {
  final Map<String, dynamic> data;
  const RecordSalaryPayment(this.data);

  @override
  List<Object?> get props => [data];
}
