import 'package:equatable/equatable.dart';

import '../../../data/models/batch_model.dart';

abstract class BatchState extends Equatable {
  const BatchState();

  @override
  List<Object?> get props => [];
}

class BatchInitial extends BatchState {}

class BatchLoading extends BatchState {}

class BatchLoaded extends BatchState {
  final List<BatchModel> batches;
  const BatchLoaded(this.batches);

  @override
  List<Object?> get props => [batches];
}

class BatchOperationSuccess extends BatchState {
  final String message;
  const BatchOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class BatchError extends BatchState {
  final String message;
  const BatchError(this.message);

  @override
  List<Object?> get props => [message];
}
