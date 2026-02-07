import 'package:equatable/equatable.dart';

abstract class BatchEvent extends Equatable {
  const BatchEvent();

  @override
  List<Object?> get props => [];
}

class LoadBatches extends BatchEvent {}

class CreateBatch extends BatchEvent {
  final Map<String, dynamic> data;
  const CreateBatch(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateBatch extends BatchEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateBatch({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteBatch extends BatchEvent {
  final int id;
  const DeleteBatch(this.id);

  @override
  List<Object?> get props => [id];
}

class TransferStudent extends BatchEvent {
  final int studentId;
  final int fromBatchId;
  final int toBatchId;
  const TransferStudent({
    required this.studentId,
    required this.fromBatchId,
    required this.toBatchId,
  });

  @override
  List<Object?> get props => [studentId, fromBatchId, toBatchId];
}
