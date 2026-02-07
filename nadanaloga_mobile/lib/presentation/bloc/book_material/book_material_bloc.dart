import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_client.dart';
import '../../../data/models/book_material_model.dart';
import 'book_material_event.dart';
import 'book_material_state.dart';

class BookMaterialBloc extends Bloc<BookMaterialEvent, BookMaterialState> {
  final ApiClient _apiClient;

  BookMaterialBloc({required ApiClient apiClient})
      : _apiClient = apiClient,
        super(BookMaterialInitial()) {
    on<LoadBookMaterials>(_onLoadBookMaterials);
    on<CreateBookMaterial>(_onCreateBookMaterial);
    on<UpdateBookMaterial>(_onUpdateBookMaterial);
    on<DeleteBookMaterial>(_onDeleteBookMaterial);
  }

  Future<void> _onLoadBookMaterials(
      LoadBookMaterials event, Emitter<BookMaterialState> emit) async {
    emit(BookMaterialLoading());
    try {
      final response = await _apiClient.getBookMaterials();
      if (response.statusCode == 200 && response.data != null) {
        final bookMaterials = (response.data as List)
            .map((j) => BookMaterialModel.fromJson(j))
            .toList();
        emit(BookMaterialsLoaded(bookMaterials));
      } else {
        emit(BookMaterialError(
            response.data?['message'] ?? 'Failed to load book materials.'));
      }
    } catch (e) {
      emit(const BookMaterialError('Connection error. Please try again.'));
    }
  }

  Future<void> _onCreateBookMaterial(
      CreateBookMaterial event, Emitter<BookMaterialState> emit) async {
    emit(BookMaterialLoading());
    try {
      final response = await _apiClient.createBookMaterial(event.data);
      if (response.statusCode == 201) {
        emit(const BookMaterialOperationSuccess(
            'Book material created successfully.'));
        add(LoadBookMaterials());
      } else {
        emit(BookMaterialError(
            response.data?['message'] ?? 'Failed to create book material.'));
      }
    } catch (e) {
      emit(const BookMaterialError('Connection error. Please try again.'));
    }
  }

  Future<void> _onUpdateBookMaterial(
      UpdateBookMaterial event, Emitter<BookMaterialState> emit) async {
    emit(BookMaterialLoading());
    try {
      final response =
          await _apiClient.updateBookMaterial(event.id, event.data);
      if (response.statusCode == 200) {
        emit(const BookMaterialOperationSuccess(
            'Book material updated successfully.'));
        add(LoadBookMaterials());
      } else {
        emit(BookMaterialError(
            response.data?['message'] ?? 'Failed to update book material.'));
      }
    } catch (e) {
      emit(const BookMaterialError('Connection error. Please try again.'));
    }
  }

  Future<void> _onDeleteBookMaterial(
      DeleteBookMaterial event, Emitter<BookMaterialState> emit) async {
    emit(BookMaterialLoading());
    try {
      final response = await _apiClient.deleteBookMaterial(event.id);
      if (response.statusCode == 200) {
        emit(const BookMaterialOperationSuccess(
            'Book material deleted successfully.'));
        add(LoadBookMaterials());
      } else {
        emit(BookMaterialError(
            response.data?['message'] ?? 'Failed to delete book material.'));
      }
    } catch (e) {
      emit(const BookMaterialError('Connection error. Please try again.'));
    }
  }
}
