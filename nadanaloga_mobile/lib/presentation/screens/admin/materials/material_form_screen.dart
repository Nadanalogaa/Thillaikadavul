import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/book_material_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/book_material/book_material_bloc.dart';
import '../../../bloc/book_material/book_material_event.dart';
import '../../../bloc/book_material/book_material_state.dart';

class MaterialFormScreen extends StatefulWidget {
  final int? materialId;

  const MaterialFormScreen({super.key, this.materialId});

  bool get isEditing => materialId != null;

  @override
  State<MaterialFormScreen> createState() => _MaterialFormScreenState();
}

class _MaterialFormScreenState extends State<MaterialFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _courseController = TextEditingController();
  final _fileUrlController = TextEditingController();
  String? _selectedFileType;
  bool _loading = false;

  static const List<String> _fileTypes = [
    'PDF',
    'Video',
    'Audio',
    'Document',
    'Image',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) _loadMaterial();
  }

  Future<void> _loadMaterial() async {
    setState(() => _loading = true);
    try {
      final response = await sl<ApiClient>().getBookMaterials();
      if (response.statusCode == 200) {
        final materials = (response.data as List)
            .map((j) => BookMaterialModel.fromJson(j))
            .toList();
        final material =
            materials.where((m) => m.id == widget.materialId).firstOrNull;
        if (material != null) {
          _titleController.text = material.title;
          _descriptionController.text = material.description ?? '';
          _courseController.text = material.course ?? '';
          _fileUrlController.text = material.fileUrl ?? '';
          _selectedFileType = _fileTypes.cast<String?>().firstWhere(
            (t) =>
                t?.toLowerCase() == material.fileType?.toLowerCase(),
            orElse: () => null,
          );
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _courseController.dispose();
    _fileUrlController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final data = <String, dynamic>{
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      'course': _courseController.text.trim().isEmpty
          ? null
          : _courseController.text.trim(),
      'file_url': _fileUrlController.text.trim().isEmpty
          ? null
          : _fileUrlController.text.trim(),
      'file_type': _selectedFileType?.toLowerCase(),
    };

    if (widget.isEditing) {
      context
          .read<BookMaterialBloc>()
          .add(UpdateBookMaterial(id: widget.materialId!, data: data));
    } else {
      context.read<BookMaterialBloc>().add(CreateBookMaterial(data));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<BookMaterialBloc, BookMaterialState>(
      listener: (context, state) {
        if (state is BookMaterialOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop(true);
        } else if (state is BookMaterialError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title:
              Text(widget.isEditing ? 'Edit Material' : 'Add Material'),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Title *',
                          prefixIcon: Icon(Icons.auto_stories),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Required'
                            : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          prefixIcon: Icon(Icons.description),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _courseController,
                        decoration: const InputDecoration(
                          labelText: 'Course',
                          prefixIcon: Icon(Icons.menu_book),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _fileUrlController,
                        decoration: const InputDecoration(
                          labelText: 'File URL',
                          hintText: 'https://...',
                          prefixIcon: Icon(Icons.link),
                        ),
                        keyboardType: TextInputType.url,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: _selectedFileType,
                        decoration: const InputDecoration(
                          labelText: 'File Type',
                          prefixIcon: Icon(Icons.insert_drive_file),
                        ),
                        items: _fileTypes
                            .map((type) => DropdownMenuItem(
                                  value: type,
                                  child: Text(type),
                                ))
                            .toList(),
                        onChanged: (value) {
                          setState(() => _selectedFileType = value);
                        },
                      ),
                      const SizedBox(height: 24),
                      BlocBuilder<BookMaterialBloc, BookMaterialState>(
                        builder: (context, state) {
                          final isLoading = state is BookMaterialLoading;
                          return FilledButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : Text(widget.isEditing
                                    ? 'Save'
                                    : 'Create'),
                          );
                        },
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}
