import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/user_model.dart';
import '../../../bloc/user_management/user_management_bloc.dart';
import '../../../bloc/user_management/user_management_event.dart';
import '../../../bloc/user_management/user_management_state.dart';
import '../../../widgets/empty_state_widget.dart';

class TeachersDrilldownScreen extends StatefulWidget {
  const TeachersDrilldownScreen({super.key});

  @override
  State<TeachersDrilldownScreen> createState() => _TeachersDrilldownScreenState();
}

class _TeachersDrilldownScreenState extends State<TeachersDrilldownScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    context.read<UserManagementBloc>().add(LoadUsers());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Teachers'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Compact Search Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name, email, phone, expertise...',
                hintStyle: AppTextStyles.bodySmall.copyWith(color: AppColors.textHint),
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.divider),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: AppColors.divider),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.teacherAccent, width: 1.5),
                ),
                filled: true,
                fillColor: AppColors.background,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                isDense: true,
              ),
              style: AppTextStyles.bodyMedium,
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),

          // Teachers List
          Expanded(
            child: BlocBuilder<UserManagementBloc, UserManagementState>(
              builder: (context, state) {
                if (state is UserManagementLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is UserManagementError) {
                  return Center(child: Text('Error: ${state.message}'));
                }

                final users = state is UserManagementLoaded ? state.users : <UserModel>[];
                var teachers = users.where((u) => u.role == 'Teacher' && !u.isDeleted).toList();

                // Apply search
                if (_searchQuery.isNotEmpty) {
                  final query = _searchQuery.toLowerCase();
                  teachers = teachers.where((t) {
                    return t.name.toLowerCase().contains(query) ||
                        t.email.toLowerCase().contains(query) ||
                        (t.contactNumber?.contains(query) ?? false) ||
                        t.courseExpertise.any((c) => c.toLowerCase().contains(query));
                  }).toList();
                }

                if (teachers.isEmpty) {
                  return EmptyStateWidget(
                    icon: Icons.person_search,
                    title: _searchQuery.isNotEmpty ? 'No Results' : 'No Teachers',
                    subtitle: _searchQuery.isNotEmpty
                        ? 'Try a different search term'
                        : 'No teachers found',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<UserManagementBloc>().add(LoadUsers());
                  },
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    children: [
                      // Compact Summary
                      _CompactSummaryCard(totalTeachers: teachers.length)
                          .animate()
                          .fadeIn(duration: 300.ms),
                      const SizedBox(height: 12),

                      // Teachers List with Accordion
                      ...teachers.asMap().entries.map((entry) {
                        return _AccordionTeacherCard(
                          teacher: entry.value,
                          index: entry.key,
                        );
                      }),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.small(
        onPressed: () => context.push('/admin/users/add'),
        backgroundColor: AppColors.teacherAccent,
        child: const Icon(Icons.person_add, size: 20),
      ).animate().scale(delay: 300.ms, duration: 200.ms),
    );
  }
}

class _CompactSummaryCard extends StatelessWidget {
  final int totalTeachers;

  const _CompactSummaryCard({required this.totalTeachers});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.teacherAccent, AppColors.teacherAccent.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.person, color: Colors.white, size: 24),
          const SizedBox(width: 12),
          Text(
            '$totalTeachers',
            style: AppTextStyles.h2.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 8),
          Text('Teachers', style: AppTextStyles.bodySmall.copyWith(color: Colors.white70)),
        ],
      ),
    );
  }
}

class _AccordionTeacherCard extends StatefulWidget {
  final UserModel teacher;
  final int index;

  const _AccordionTeacherCard({
    required this.teacher,
    required this.index,
  });

  @override
  State<_AccordionTeacherCard> createState() => _AccordionTeacherCardState();
}

class _AccordionTeacherCardState extends State<_AccordionTeacherCard> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final teacher = widget.teacher;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _isExpanded ? AppColors.teacherAccent.withOpacity(0.3) : AppColors.divider.withOpacity(0.5),
        ),
      ),
      child: Column(
        children: [
          // Collapsed Header - Name, ID/Expertise, Phone
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            borderRadius: BorderRadius.vertical(
              top: const Radius.circular(12),
              bottom: Radius.circular(_isExpanded ? 0 : 12),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  // Avatar
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.teacherAccent.withOpacity(0.1),
                    backgroundImage: teacher.photoUrl != null && teacher.photoUrl!.isNotEmpty
                        ? NetworkImage(teacher.photoUrl!)
                        : null,
                    child: teacher.photoUrl == null || teacher.photoUrl!.isEmpty
                        ? Text(
                            teacher.name.isNotEmpty ? teacher.name[0].toUpperCase() : '?',
                            style: AppTextStyles.labelLarge.copyWith(color: AppColors.teacherAccent),
                          )
                        : null,
                  ),
                  const SizedBox(width: 10),

                  // Name & Expertise
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          teacher.name,
                          style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Row(
                          children: [
                            if (teacher.courseExpertise.isNotEmpty) ...[
                              Icon(Icons.star, size: 12, color: AppColors.teacherAccent),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  teacher.courseExpertise.join(', '),
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.teacherAccent,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 11,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ] else ...[
                              Icon(Icons.phone, size: 12, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                teacher.contactNumber ?? '-',
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.textSecondary,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Employment Type Badge
                  if (teacher.employmentType != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.info.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        teacher.employmentType!,
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.info,
                          fontWeight: FontWeight.w600,
                          fontSize: 9,
                        ),
                      ),
                    ),
                  const SizedBox(width: 4),

                  // Expand Arrow
                  AnimatedRotation(
                    turns: _isExpanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.keyboard_arrow_down,
                      color: AppColors.textSecondary,
                      size: 24,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Expanded Details
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Container(
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
              ),
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Column(
                children: [
                  const Divider(height: 1),
                  const SizedBox(height: 10),

                  // Details
                  _CompactInfoRow(icon: Icons.email_outlined, label: 'Email', value: teacher.email),
                  const SizedBox(height: 6),
                  _CompactInfoRow(icon: Icons.phone_outlined, label: 'Phone', value: teacher.contactNumber ?? '-'),
                  if (teacher.courseExpertise.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    _CompactInfoRow(
                      icon: Icons.school_outlined,
                      label: 'Expertise',
                      value: teacher.courseExpertise.join(', '),
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/admin/users/${teacher.id}'),
                      icon: const Icon(Icons.visibility, size: 16),
                      label: const Text('View Full Profile'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.teacherAccent,
                        side: BorderSide(color: AppColors.teacherAccent.withOpacity(0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            crossFadeState: _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    ).animate(delay: Duration(milliseconds: 30 * widget.index)).fadeIn(duration: 200.ms);
  }
}

class _CompactInfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _CompactInfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        SizedBox(
          width: 60,
          child: Text(
            label,
            style: AppTextStyles.caption.copyWith(color: AppColors.textHint, fontSize: 10),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w500, fontSize: 12),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
