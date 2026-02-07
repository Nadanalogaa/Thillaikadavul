import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/notice_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/notice/notice_bloc.dart';
import '../../../bloc/notice/notice_event.dart';
import '../../../bloc/notice/notice_state.dart';

class NoticeFormScreen extends StatefulWidget {
  final int? noticeId;

  const NoticeFormScreen({super.key, this.noticeId});

  bool get isEditing => noticeId != null;

  @override
  State<NoticeFormScreen> createState() => _NoticeFormScreenState();
}

class _NoticeFormScreenState extends State<NoticeFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  String? _selectedCategory;
  String? _selectedPriority;
  bool _loading = false;

  static const _categories = ['General', 'Academic', 'Administrative', 'Urgent'];
  static const _priorities = ['Low', 'Medium', 'High'];

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) _loadNotice();
  }

  Future<void> _loadNotice() async {
    setState(() => _loading = true);
    try {
      final response = await sl<ApiClient>().getNotices();
      if (response.statusCode == 200) {
        final notices = (response.data as List)
            .map((j) => NoticeModel.fromJson(j))
            .toList();
        final notice =
            notices.where((n) => n.id == widget.noticeId).firstOrNull;
        if (notice != null) {
          _titleController.text = notice.title;
          _contentController.text = notice.content ?? '';
          _selectedCategory = notice.category;
          _selectedPriority = notice.priority;
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final data = {
      'title': _titleController.text.trim(),
      'content': _contentController.text.trim().isEmpty
          ? null
          : _contentController.text.trim(),
      'category': _selectedCategory,
      'priority': _selectedPriority,
    };

    if (widget.isEditing) {
      context
          .read<NoticeBloc>()
          .add(UpdateNotice(id: widget.noticeId!, data: data));
    } else {
      context.read<NoticeBloc>().add(CreateNotice(data));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<NoticeBloc, NoticeState>(
      listener: (context, state) {
        if (state is NoticeOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop(true);
        } else if (state is NoticeError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditing ? 'Edit Notice' : 'Add Notice'),
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
                          prefixIcon: Icon(Icons.title),
                        ),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _contentController,
                        decoration: const InputDecoration(
                          labelText: 'Content *',
                          prefixIcon: Icon(Icons.notes),
                          alignLabelWithHint: true,
                        ),
                        maxLines: 5,
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        decoration: const InputDecoration(
                          labelText: 'Category',
                          prefixIcon: Icon(Icons.category),
                        ),
                        items: _categories
                            .map((c) =>
                                DropdownMenuItem(value: c, child: Text(c)))
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _selectedCategory = v),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: _selectedPriority,
                        decoration: const InputDecoration(
                          labelText: 'Priority',
                          prefixIcon: Icon(Icons.flag),
                        ),
                        items: _priorities
                            .map((p) =>
                                DropdownMenuItem(value: p, child: Text(p)))
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _selectedPriority = v),
                      ),
                      const SizedBox(height: 24),
                      BlocBuilder<NoticeBloc, NoticeState>(
                        builder: (context, state) {
                          final isLoading = state is NoticeLoading;
                          return FilledButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : Text(widget.isEditing ? 'Save' : 'Create'),
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
