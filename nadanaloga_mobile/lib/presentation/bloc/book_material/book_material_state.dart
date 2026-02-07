import 'package:equatable/equatable.dart';

import '../../../data/models/book_material_model.dart';

abstract class BookMaterialState extends Equatable {
  const BookMaterialState();

  @override
  List<Object?> get props => [];
}

class BookMaterialInitial extends BookMaterialState {}

class BookMaterialLoading extends BookMaterialState {}

class BookMaterialsLoaded extends BookMaterialState {
  final List<BookMaterialModel> bookMaterials;
  const BookMaterialsLoaded(this.bookMaterials);

  @override
  List<Object?> get props => [bookMaterials];
}

class BookMaterialOperationSuccess extends BookMaterialState {
  final String message;
  const BookMaterialOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class BookMaterialError extends BookMaterialState {
  final String message;
  const BookMaterialError(this.message);

  @override
  List<Object?> get props => [message];
}
