import 'package:equatable/equatable.dart';

abstract class NoticeEvent extends Equatable {
  const NoticeEvent();

  @override
  List<Object?> get props => [];
}

class LoadNotices extends NoticeEvent {}

class CreateNotice extends NoticeEvent {
  final Map<String, dynamic> data;
  const CreateNotice(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateNotice extends NoticeEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateNotice({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteNotice extends NoticeEvent {
  final int id;
  const DeleteNotice(this.id);

  @override
  List<Object?> get props => [id];
}
