import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/course_model.dart';
import '../../../bloc/course/course_bloc.dart';
import '../../../bloc/course/course_event.dart';
import '../../../bloc/course/course_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class CourseListScreen extends StatelessWidget {
  const CourseListScreen({super.key});

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Courses')),
      body: BlocConsumer<CourseBloc, CourseState>(
        listener: (context, state) {
          if (state is CourseOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.success,
                ));
          } else if (state is CourseError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is CourseLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is CourseLoaded) {
            if (state.courses.isEmpty) {
              return EmptyStateWidget(
                icon: Icons.menu_book_outlined,
                title: 'No courses yet',
                subtitle: 'Add your first course.',
                actionLabel: 'Add Course',
                onAction: () async {
                  final created =
                      await context.push<bool>('/admin/courses/add');
                  if (created == true && context.mounted) {
                    context.read<CourseBloc>().add(LoadCourses());
                  }
                },
              );
            }
            return RefreshIndicator(
              onRefresh: () async =>
                  context.read<CourseBloc>().add(LoadCourses()),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.courses.length,
                itemBuilder: (context, index) {
                  final course = state.courses[index];
                  return _CourseCard(
                    course: course,
                    defaultIcon: _getDefaultIcon(course.name),
                    onEdit: () async {
                      final updated = await context
                          .push<bool>('/admin/courses/${course.id}/edit');
                      if (updated == true && context.mounted) {
                        context.read<CourseBloc>().add(LoadCourses());
                      }
                    },
                    onDelete: () async {
                      final confirmed = await ConfirmDialog.show(
                        context,
                        title: 'Delete Course',
                        message:
                            'Are you sure you want to delete "${course.name}"?',
                        confirmLabel: 'Delete',
                        confirmColor: AppColors.error,
                      );
                      if (confirmed == true && context.mounted) {
                        context
                            .read<CourseBloc>()
                            .add(DeleteCourse(course.id));
                      }
                    },
                  );
                },
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await context.push<bool>('/admin/courses/add');
          if (created == true && context.mounted) {
            context.read<CourseBloc>().add(LoadCourses());
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('Add Course'),
      ),
    );
  }
}

class _CourseCard extends StatefulWidget {
  final CourseModel course;
  final IconData defaultIcon;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _CourseCard({
    required this.course,
    required this.defaultIcon,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  State<_CourseCard> createState() => _CourseCardState();
}

class _CourseCardState extends State<_CourseCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final courseColor = AppColors.getCourseColor(widget.course.name);
    final courseGradient = AppColors.getCourseGradient(widget.course.name);
    final hasCustomIcon = widget.course.icon != null &&
        widget.course.icon!.isNotEmpty &&
        widget.course.icon!.toLowerCase().endsWith('.svg');

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onEdit,
      child: AnimatedScale(
        scale: _isPressed ? 0.98 : 1.0,
        duration: const Duration(milliseconds: 100),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _isPressed
                  ? courseColor.withValues(alpha: 0.4)
                  : courseColor.withValues(alpha: 0.15),
              width: 1.5,
            ),
            boxShadow: _isPressed
                ? [
                    BoxShadow(
                      color: courseColor.withValues(alpha: 0.25),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: courseColor.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
          ),
          child: Row(
            children: [
              // Left gradient strip with icon
              Container(
                width: 80,
                height: 90,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: courseGradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(14),
                    bottomLeft: Radius.circular(14),
                  ),
                ),
                child: Center(
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: hasCustomIcon
                          ? SvgPicture.network(
                              widget.course.icon!,
                              width: 24,
                              height: 24,
                              colorFilter: const ColorFilter.mode(
                                Colors.white,
                                BlendMode.srcIn,
                              ),
                              placeholderBuilder: (context) => Icon(
                                widget.defaultIcon,
                                color: Colors.white,
                                size: 24,
                              ),
                            )
                          : Icon(
                              widget.defaultIcon,
                              color: Colors.white,
                              size: 24,
                            ),
                    ),
                  ),
                ),
              ),

              // Course details
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              widget.course.name,
                              style: AppTextStyles.labelLarge.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (hasCustomIcon)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.info.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.image_outlined,
                                    size: 12,
                                    color: AppColors.info,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Custom Icon',
                                    style: AppTextStyles.caption.copyWith(
                                      color: AppColors.info,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      if (widget.course.description != null &&
                          widget.course.description!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          widget.course.description!,
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 8),
                      // Action buttons
                      Row(
                        children: [
                          _ActionChip(
                            icon: Icons.edit_outlined,
                            label: 'Edit',
                            color: courseColor,
                            onTap: widget.onEdit,
                          ),
                          const SizedBox(width: 8),
                          _ActionChip(
                            icon: Icons.delete_outline,
                            label: 'Delete',
                            color: AppColors.error,
                            onTap: widget.onDelete,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: color.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: AppTextStyles.caption.copyWith(
                color: color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
