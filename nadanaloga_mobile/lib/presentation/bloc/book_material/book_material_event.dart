import 'package:equatable/equatable.dart';

abstract class BookMaterialEvent extends Equatable {
  const BookMaterialEvent();

  @override
  List<Object?> get props => [];
}

class LoadBookMaterials extends BookMaterialEvent {}

class CreateBookMaterial extends BookMaterialEvent {
  final Map<String, dynamic> data;
  const CreateBookMaterial(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateBookMaterial extends BookMaterialEvent {
  final int id;
  final Map<String, dynamic> data;
  const UpdateBookMaterial({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteBookMaterial extends BookMaterialEvent {
  final int id;
  const DeleteBookMaterial(this.id);

  @override
  List<Object?> get props => [id];
}
