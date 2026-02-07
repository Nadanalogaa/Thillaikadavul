import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/batch/batch_bloc.dart';
import '../../../bloc/batch/batch_event.dart';
import '../../../bloc/batch/batch_state.dart';
import '../../../widgets/confirm_dialog.dart';
import 'student_picker_sheet.dart';
import 'transfer_student_sheet.dart';

class BatchDetailScreen extends StatefulWidget {
  final int batchId;
  const BatchDetailScreen({super.key, required this.batchId});

  @override
  State<BatchDetailScreen> createState() => _BatchDetailScreenState();
}

class _BatchDetailScreenState extends State<BatchDetailScreen> {
  Map<String, dynamic>? _details;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() => _loading = true);
    try {
      final response = await sl<ApiClient>().getBatchDetails(widget.batchId);
      if (response.statusCode == 200 && response.data != null) {
        setState(() {
          _details = response.data;
          _loading = false;
        });
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<BatchBloc, BatchState>(
      listener: (context, state) {
        if (state is BatchOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          _loadDetails();
        } else if (state is BatchError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_details?['batch_name'] ?? 'Batch Details'),
          actions: [
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () =>
                  context.push('/admin/batches/${widget.batchId}/edit'),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _details == null
                ? const Center(child: Text('Batch not found'))
                : RefreshIndicator(
                    onRefresh: _loadDetails,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Batch info card
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_details!['batch_name'] ?? '',
                                      style: AppTextStyles.h3),
                                  const SizedBox(height: 12),
                                  _InfoTile(
                                    icon: Icons.menu_book,
                                    label: 'Course',
                                    value: _details!['course_name'] ?? 'Not assigned',
                                  ),
                                  _InfoTile(
                                    icon: Icons.person,
                                    label: 'Teacher',
                                    value: _details!['teacher_name'] ?? 'Not assigned',
                                  ),
                                  _InfoTile(
                                    icon: Icons.location_on,
                                    label: 'Location',
                                    value: _details!['location_name'] ?? 'Online',
                                  ),
                                  if (_details!['mode'] != null)
                                    _InfoTile(
                                      icon: Icons.computer,
                                      label: 'Mode',
                                      value: _details!['mode'],
                                    ),
                                  if (_details!['start_date'] != null)
                                    _InfoTile(
                                      icon: Icons.calendar_today,
                                      label: 'Start Date',
                                      value: _details!['start_date'].toString().split('T').first,
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Students section
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Students (${(_details!['students'] as List?)?.length ?? 0})',
                                style: AppTextStyles.h4,
                              ),
                              FilledButton.icon(
                                onPressed: () => _showStudentPicker(context),
                                icon: const Icon(Icons.person_add, size: 18),
                                label: const Text('Add'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          _buildStudentList(),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _buildStudentList() {
    final students = _details?['students'] as List? ?? [];
    if (students.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: Text(
              'No students enrolled yet',
              style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary),
            ),
          ),
        ),
      );
    }

    return Column(
      children: students.map<Widget>((s) {
        return Card(
          margin: const EdgeInsets.only(bottom: 6),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.studentAccent,
              child: Text(
                (s['name'] ?? '?')[0].toUpperCase(),
                style: const TextStyle(color: Colors.white),
              ),
            ),
            title: Text(s['name'] ?? '', style: AppTextStyles.labelLarge),
            subtitle: Text(
              s['user_id'] ?? s['email'] ?? '',
              style: AppTextStyles.caption,
            ),
            trailing: PopupMenuButton<String>(
              onSelected: (action) async {
                if (action == 'transfer') {
                  _showTransferSheet(context, s['id'], s['name']);
                } else if (action == 'remove') {
                  final confirmed = await ConfirmDialog.show(
                    context,
                    title: 'Remove Student',
                    message: 'Remove ${s['name']} from this batch?',
                    confirmLabel: 'Remove',
                    confirmColor: AppColors.error,
                  );
                  if (confirmed == true && mounted) {
                    _removeStudent(s['id']);
                  }
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'transfer', child: Text('Transfer')),
                PopupMenuItem(
                  value: 'remove',
                  child: Text('Remove', style: TextStyle(color: AppColors.error)),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  void _removeStudent(int studentId) async {
    final currentIds = List<int>.from(_details?['student_ids'] ?? []);
    currentIds.remove(studentId);
    context.read<BatchBloc>().add(UpdateBatch(
      id: widget.batchId,
      data: {..._details!['batch_name'] != null ? {'batch_name': _details!['batch_name']} : {}, 'student_ids': currentIds},
    ));
  }

  void _showStudentPicker(BuildContext context) async {
    final currentIds = List<int>.from(_details?['student_ids'] ?? []);
    final selectedIds = await showModalBottomSheet<List<int>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => StudentPickerSheet(excludeIds: currentIds),
    );
    if (selectedIds != null && selectedIds.isNotEmpty && mounted) {
      final newIds = [...currentIds, ...selectedIds];
      context.read<BatchBloc>().add(UpdateBatch(
        id: widget.batchId,
        data: {'batch_name': _details!['batch_name'], 'student_ids': newIds},
      ));
    }
  }

  void _showTransferSheet(BuildContext context, int studentId, String studentName) async {
    final toBatchId = await showModalBottomSheet<int>(
      context: context,
      builder: (_) => TransferStudentSheet(
        studentName: studentName,
        currentBatchId: widget.batchId,
        courseId: _details?['course_id'] as int?,
      ),
    );
    if (toBatchId != null && mounted) {
      context.read<BatchBloc>().add(TransferStudent(
        studentId: studentId,
        fromBatchId: widget.batchId,
        toBatchId: toBatchId,
      ));
    }
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 10),
          Text('$label: ', style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w500)),
          Expanded(child: Text(value, style: AppTextStyles.bodyMedium)),
        ],
      ),
    );
  }
}
