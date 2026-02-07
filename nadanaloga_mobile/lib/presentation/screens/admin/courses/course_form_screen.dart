import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/course_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/course/course_bloc.dart';
import '../../../bloc/course/course_event.dart';
import '../../../bloc/course/course_state.dart';

class CourseFormScreen extends StatefulWidget {
  final int? courseId;

  const CourseFormScreen({super.key, this.courseId});

  bool get isEditing => courseId != null;

  @override
  State<CourseFormScreen> createState() => _CourseFormScreenState();
}

class _CourseFormScreenState extends State<CourseFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _loading = false;
  bool _uploading = false;

  // Icon state
  File? _selectedIconFile;
  String? _existingIconUrl;
  String? _uploadedIconUrl;

  @override
  void initState() {
    super.initState();
    if (widget.isEditing) _loadCourse();
  }

  Future<void> _loadCourse() async {
    setState(() => _loading = true);
    try {
      final response = await sl<ApiClient>().getCourses();
      if (response.statusCode == 200) {
        final courses = (response.data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
        final course =
            courses.where((c) => c.id == widget.courseId).firstOrNull;
        if (course != null) {
          _nameController.text = course.name;
          _descriptionController.text = course.description ?? '';
          _existingIconUrl = course.icon;
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickIcon() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['svg', 'png', 'jpg', 'jpeg'],
        allowMultiple: false,
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedIconFile = File(result.files.single.path!);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking file: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<String?> _uploadIcon() async {
    if (_selectedIconFile == null) return _existingIconUrl;

    setState(() => _uploading = true);

    try {
      final response = await sl<ApiClient>().uploadIcon(_selectedIconFile!.path);

      if (response.statusCode == 200) {
        final data = response.data;
        _uploadedIconUrl = data['url'] ?? data['path'];
        return _uploadedIconUrl;
      } else {
        throw Exception(response.data['message'] ?? 'Upload failed');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error uploading icon: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return null;
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _removeIcon() {
    setState(() {
      _selectedIconFile = null;
      _existingIconUrl = null;
      _uploadedIconUrl = null;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    // Upload icon first if a new file was selected
    String? iconUrl = _existingIconUrl;
    if (_selectedIconFile != null) {
      iconUrl = await _uploadIcon();
      if (iconUrl == null && _selectedIconFile != null) {
        // Upload failed, don't proceed
        return;
      }
    }

    final data = {
      'name': _nameController.text.trim(),
      'description': _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      'icon': iconUrl,
    };

    if (widget.isEditing) {
      context
          .read<CourseBloc>()
          .add(UpdateCourse(id: widget.courseId!, data: data));
    } else {
      context.read<CourseBloc>().add(CreateCourse(data));
    }
  }

  IconData _getDefaultIcon(String courseName) {
    final name = courseName.toLowerCase();
    if (name.contains('bharatanatyam') || name.contains('dance')) {
      return Icons.accessibility_new;
    } else if (name.contains('vocal') || name.contains('singing')) {
      return Icons.mic;
    } else if (name.contains('veena')) {
      return Icons.piano;
    } else if (name.contains('violin')) {
      return Icons.music_note;
    } else if (name.contains('mridangam') || name.contains('drum')) {
      return Icons.speaker;
    } else if (name.contains('flute')) {
      return Icons.air;
    }
    return Icons.school;
  }

  bool get _hasIcon =>
      _selectedIconFile != null ||
      (_existingIconUrl != null && _existingIconUrl!.isNotEmpty);

  @override
  Widget build(BuildContext context) {
    final courseName = _nameController.text.trim();
    final courseColor = courseName.isNotEmpty
        ? AppColors.getCourseColor(courseName)
        : AppColors.primary;
    final courseGradient = courseName.isNotEmpty
        ? AppColors.getCourseGradient(courseName)
        : [AppColors.primary, AppColors.primaryLight];

    return BlocListener<CourseBloc, CourseState>(
      listener: (context, state) {
        if (state is CourseOperationSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.message),
            backgroundColor: AppColors.success,
          ));
          context.pop(true);
        } else if (state is CourseError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditing ? 'Edit Course' : 'Add Course'),
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
                      // Course Preview Card
                      _buildPreviewCard(courseColor, courseGradient),
                      const SizedBox(height: 24),

                      // Course Name
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: 'Course Name *',
                          prefixIcon: Icon(Icons.menu_book),
                          hintText: 'e.g., Bharatanatyam, Vocal, Violin',
                        ),
                        onChanged: (_) => setState(() {}),
                        validator: (v) =>
                            (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),

                      // Description
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          prefixIcon: Icon(Icons.description),
                          hintText: 'Brief description of the course',
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 24),

                      // Icon Section
                      _buildIconSection(courseColor),
                      const SizedBox(height: 24),

                      // Submit Button
                      BlocBuilder<CourseBloc, CourseState>(
                        builder: (context, state) {
                          final isLoading =
                              state is CourseLoading || _uploading;
                          return FilledButton.icon(
                            onPressed: isLoading ? null : _submit,
                            icon: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : Icon(widget.isEditing
                                    ? Icons.save
                                    : Icons.add),
                            label: Text(_uploading
                                ? 'Uploading...'
                                : widget.isEditing
                                    ? 'Save Changes'
                                    : 'Create Course'),
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

  Widget _buildPreviewCard(Color courseColor, List<Color> courseGradient) {
    final courseName = _nameController.text.trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Preview',
          style: AppTextStyles.labelLarge.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: courseGradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: courseColor.withValues(alpha: 0.35),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Icon
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.25),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: _buildPreviewIcon(courseColor),
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Name
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          courseName.isEmpty ? 'Course Name' : courseName,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Selected indicator
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: courseColor.withValues(alpha: 0.3),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.check,
                      size: 14,
                      color: courseColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Text(
            'This is how the course will appear in the app',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewIcon(Color courseColor) {
    final courseName = _nameController.text.trim();

    // Show selected file
    if (_selectedIconFile != null) {
      final ext = _selectedIconFile!.path.toLowerCase();
      if (ext.endsWith('.svg')) {
        return SvgPicture.file(
          _selectedIconFile!,
          width: 28,
          height: 28,
          colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
        );
      } else {
        return ClipOval(
          child: Image.file(
            _selectedIconFile!,
            width: 28,
            height: 28,
            fit: BoxFit.cover,
          ),
        );
      }
    }

    // Show existing icon
    if (_existingIconUrl != null && _existingIconUrl!.isNotEmpty) {
      if (_existingIconUrl!.toLowerCase().endsWith('.svg')) {
        return SvgPicture.network(
          _existingIconUrl!,
          width: 28,
          height: 28,
          colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
          placeholderBuilder: (context) => Icon(
            _getDefaultIcon(courseName),
            size: 28,
            color: Colors.white,
          ),
        );
      } else {
        return ClipOval(
          child: Image.network(
            _existingIconUrl!,
            width: 28,
            height: 28,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Icon(
              _getDefaultIcon(courseName),
              size: 28,
              color: Colors.white,
            ),
          ),
        );
      }
    }

    // Default icon
    return Icon(
      _getDefaultIcon(courseName),
      size: 28,
      color: Colors.white,
    );
  }

  Widget _buildIconSection(Color courseColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Course Icon',
          style: AppTextStyles.labelLarge.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Upload a custom icon (SVG, PNG, or JPG) or use the default icon',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 12),

        // Icon picker card
        InkWell(
          onTap: _pickIcon,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _hasIcon
                    ? courseColor.withValues(alpha: 0.3)
                    : AppColors.divider,
                width: _hasIcon ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                // Icon preview
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        courseColor.withValues(alpha: 0.2),
                        courseColor.withValues(alpha: 0.1),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: _buildIconPreview(courseColor),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _hasIcon ? 'Custom Icon' : 'No Icon Selected',
                        style: AppTextStyles.labelLarge.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _hasIcon
                            ? 'Tap to change icon'
                            : 'Tap to upload an icon file',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_hasIcon)
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: _removeIcon,
                    color: AppColors.error,
                  )
                else
                  Icon(
                    Icons.upload_file,
                    color: courseColor,
                  ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 12),

        // Info box
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.info.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: AppColors.info.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.info_outline,
                size: 20,
                color: AppColors.info,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Supported formats: SVG, PNG, JPG (max 2MB). SVG recommended for best quality.',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildIconPreview(Color courseColor) {
    final courseName = _nameController.text.trim();

    // Show selected file
    if (_selectedIconFile != null) {
      final ext = _selectedIconFile!.path.toLowerCase();
      if (ext.endsWith('.svg')) {
        return SvgPicture.file(
          _selectedIconFile!,
          width: 28,
          height: 28,
          colorFilter: ColorFilter.mode(courseColor, BlendMode.srcIn),
        );
      } else {
        return ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Image.file(
            _selectedIconFile!,
            width: 28,
            height: 28,
            fit: BoxFit.cover,
          ),
        );
      }
    }

    // Show existing icon
    if (_existingIconUrl != null && _existingIconUrl!.isNotEmpty) {
      if (_existingIconUrl!.toLowerCase().endsWith('.svg')) {
        return SvgPicture.network(
          _existingIconUrl!,
          width: 28,
          height: 28,
          colorFilter: ColorFilter.mode(courseColor, BlendMode.srcIn),
          placeholderBuilder: (context) => Icon(
            _getDefaultIcon(courseName),
            size: 28,
            color: courseColor,
          ),
        );
      } else {
        return ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: Image.network(
            _existingIconUrl!,
            width: 28,
            height: 28,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Icon(
              _getDefaultIcon(courseName),
              size: 28,
              color: courseColor,
            ),
          ),
        );
      }
    }

    // Default icon
    return Icon(
      _getDefaultIcon(courseName),
      size: 28,
      color: courseColor,
    );
  }
}
