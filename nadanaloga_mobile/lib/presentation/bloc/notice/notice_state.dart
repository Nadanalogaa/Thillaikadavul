import 'package:equatable/equatable.dart';

import '../../../data/models/notice_model.dart';

abstract class NoticeState extends Equatable {
  const NoticeState();

  @override
  List<Object?> get props => [];
}

class NoticeInitial extends NoticeState {}

class NoticeLoading extends NoticeState {}

class NoticesLoaded extends NoticeState {
  final List<NoticeModel> notices;
  const NoticesLoaded(this.notices);

  @override
  List<Object?> get props => [notices];
}

class NoticeOperationSuccess extends NoticeState {
  final String message;
  const NoticeOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class NoticeError extends NoticeState {
  final String message;
  const NoticeError(this.message);

  @override
  List<Object?> get props => [message];
}
