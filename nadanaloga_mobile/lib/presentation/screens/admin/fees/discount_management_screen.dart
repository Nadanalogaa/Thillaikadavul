import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../data/models/course_model.dart';
import '../../../../data/models/student_discount_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../widgets/confirm_dialog.dart';

class DiscountManagementScreen extends StatefulWidget {
  const DiscountManagementScreen({super.key});

  @override
  State<DiscountManagementScreen> createState() =>
      _DiscountManagementScreenState();
}

class _DiscountManagementScreenState extends State<DiscountManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Discount Management'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Course Discounts'),
            Tab(text: 'Batch Discounts'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _CourseDiscountsTab(),
          _BatchDiscountsTab(),
        ],
      ),
    );
  }
}

// Course Discounts Tab
class _CourseDiscountsTab extends StatefulWidget {
  const _CourseDiscountsTab();

  @override
  State<_CourseDiscountsTab> createState() => _CourseDiscountsTabState();
}

class _CourseDiscountsTabState extends State<_CourseDiscountsTab> {
  final _formKey = GlobalKey<FormState>();
  final _discountController = TextEditingController();
  final _reasonController = TextEditingController();

  List<CourseModel> _courses = [];
  List<UserModel> _students = [];
  List<StudentDiscountModel> _discounts = [];
  int? _selectedCourseId;
  List<int> _selectedStudentIds = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _discountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = sl<ApiClient>();
      final results = await Future.wait([
        api.getCourses(),
        api.getUsers(role: 'Student'),
        api.getStudentDiscounts(discountType: 'course'),
      ]);

      if (!mounted) return;

      if (results[0].statusCode == 200) {
        _courses = (results[0].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
      }

      if (results[1].statusCode == 200) {
        _students = (results[1].data as List)
            .map((j) => UserModel.fromJson(j))
            .toList();
      }

      if (results[2].statusCode == 200) {
        _discounts = (results[2].data as List)
            .map((j) => StudentDiscountModel.fromJson(j))
            .toList();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _createDiscounts() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCourseId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a course')),
      );
      return;
    }
    if (_selectedStudentIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one student')),
      );
      return;
    }

    final discount = double.tryParse(_discountController.text);
    if (discount == null || discount <= 0 || discount > 100) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please enter a valid discount between 0 and 100')),
      );
      return;
    }

    try {
      final api = sl<ApiClient>();
      for (final studentId in _selectedStudentIds) {
        await api.createStudentDiscount({
          'student_id': studentId,
          'discount_type': 'course',
          'course_id': _selectedCourseId,
          'discount_percentage': discount,
          'reason': _reasonController.text.trim(),
        });
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'Successfully created ${_selectedStudentIds.length} discounts')),
      );

      // Reset form
      _selectedCourseId = null;
      _selectedStudentIds.clear();
      _discountController.clear();
      _reasonController.clear();

      // Reload discounts
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating discounts: $e')),
      );
    }
  }

  Future<void> _deleteDiscount(int id) async {
    try {
      await sl<ApiClient>().deleteStudentDiscount(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Discount deleted successfully')),
      );
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error deleting discount: $e')),
      );
    }
  }

  String _getCourseName(int courseId) {
    try {
      return _courses.firstWhere((c) => c.id == courseId).name;
    } catch (_) {
      return 'Course #$courseId';
    }
  }

  String _getStudentName(int studentId) {
    try {
      return _students.firstWhere((s) => s.id == studentId).name;
    } catch (_) {
      return 'Student #$studentId';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Create Discount Form
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Create Course Discount',
                          style: AppTextStyles.h4.copyWith(fontSize: 16)),
                      const SizedBox(height: 16),

                      // Course Selection
                      DropdownButtonFormField<int>(
                        value: _selectedCourseId,
                        decoration: const InputDecoration(
                          labelText: 'Course *',
                          prefixIcon: Icon(Icons.school),
                        ),
                        items: _courses
                            .map((c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text(c.name),
                                ))
                            .toList(),
                        onChanged: (v) => setState(() => _selectedCourseId = v),
                      ),
                      const SizedBox(height: 16),

                      // Student Multi-Selection
                      Text('Students *', style: AppTextStyles.labelLarge),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Selected: ${_selectedStudentIds.length}/${_students.length}',
                                  style: AppTextStyles.caption,
                                ),
                                const Spacer(),
                                TextButton(
                                  onPressed: () {
                                    setState(() {
                                      if (_selectedStudentIds.length ==
                                          _students.length) {
                                        _selectedStudentIds.clear();
                                      } else {
                                        _selectedStudentIds =
                                            _students.map((s) => s.id).toList();
                                      }
                                    });
                                  },
                                  child: Text(_selectedStudentIds.length ==
                                          _students.length
                                      ? 'Deselect All'
                                      : 'Select All'),
                                ),
                              ],
                            ),
                            const Divider(),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxHeight: 200),
                              child: ListView.builder(
                                shrinkWrap: true,
                                itemCount: _students.length,
                                itemBuilder: (context, index) {
                                  final student = _students[index];
                                  final isSelected =
                                      _selectedStudentIds.contains(student.id);
                                  return CheckboxListTile(
                                    dense: true,
                                    title: Text(student.name,
                                        style: AppTextStyles.bodySmall),
                                    value: isSelected,
                                    onChanged: (selected) {
                                      setState(() {
                                        if (selected == true) {
                                          _selectedStudentIds.add(student.id);
                                        } else {
                                          _selectedStudentIds
                                              .remove(student.id);
                                        }
                                      });
                                    },
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Discount Percentage
                      TextFormField(
                        controller: _discountController,
                        decoration: const InputDecoration(
                          labelText: 'Discount Percentage *',
                          suffixText: '%',
                          prefixIcon: Icon(Icons.percent),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Required';
                          final num = double.tryParse(v);
                          if (num == null || num <= 0 || num > 100) {
                            return 'Enter 0-100';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Reason
                      TextFormField(
                        controller: _reasonController,
                        decoration: const InputDecoration(
                          labelText: 'Reason (optional)',
                          prefixIcon: Icon(Icons.note),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 16),

                      // Submit Button
                      FilledButton.icon(
                        onPressed: _createDiscounts,
                        icon: const Icon(Icons.add),
                        label: const Text('Create Discounts'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Existing Discounts List
            Text('Active Course Discounts (${_discounts.length})',
                style: AppTextStyles.h4.copyWith(fontSize: 16)),
            const SizedBox(height: 12),

            if (_discounts.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(
                    child: Text(
                      'No course discounts created yet',
                      style: AppTextStyles.caption,
                    ),
                  ),
                ),
              )
            else
              ..._discounts.map((discount) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.success.withValues(alpha: 0.15),
                      child: Text(
                        '${discount.discountPercentage.toStringAsFixed(0)}%',
                        style: const TextStyle(
                          color: AppColors.success,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    title: Text(_getStudentName(discount.studentId)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getCourseName(discount.courseId),
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.primary),
                        ),
                        if (discount.reason != null &&
                            discount.reason!.isNotEmpty)
                          Text(discount.reason!,
                              style: AppTextStyles.caption),
                      ],
                    ),
                    trailing: IconButton(
                      icon:
                          const Icon(Icons.delete_outline, color: AppColors.error),
                      onPressed: () async {
                        final confirmed = await ConfirmDialog.show(
                          context,
                          title: 'Delete Discount',
                          message: 'Remove this discount?',
                          confirmLabel: 'Delete',
                          confirmColor: AppColors.error,
                        );
                        if (confirmed == true && mounted) {
                          _deleteDiscount(discount.id);
                        }
                      },
                    ),
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }
}

// Batch Discounts Tab
class _BatchDiscountsTab extends StatefulWidget {
  const _BatchDiscountsTab();

  @override
  State<_BatchDiscountsTab> createState() => _BatchDiscountsTabState();
}

class _BatchDiscountsTabState extends State<_BatchDiscountsTab> {
  final _formKey = GlobalKey<FormState>();
  final _discountController = TextEditingController();
  final _reasonController = TextEditingController();

  List<CourseModel> _courses = [];
  List<BatchModel> _allBatches = [];
  List<BatchModel> _courseBatches = [];
  List<UserModel> _students = [];
  List<StudentDiscountModel> _discounts = [];
  int? _selectedCourseId;
  int? _selectedBatchId;
  List<int> _selectedStudentIds = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _discountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final api = sl<ApiClient>();
      final results = await Future.wait([
        api.getCourses(),
        api.getBatches(),
        api.getUsers(role: 'Student'),
        api.getStudentDiscounts(discountType: 'batch'),
      ]);

      if (!mounted) return;

      if (results[0].statusCode == 200) {
        _courses = (results[0].data as List)
            .map((j) => CourseModel.fromJson(j))
            .toList();
      }

      if (results[1].statusCode == 200) {
        _allBatches = (results[1].data as List)
            .map((j) => BatchModel.fromJson(j))
            .toList();
      }

      if (results[2].statusCode == 200) {
        _students = (results[2].data as List)
            .map((j) => UserModel.fromJson(j))
            .toList();
      }

      if (results[3].statusCode == 200) {
        _discounts = (results[3].data as List)
            .map((j) => StudentDiscountModel.fromJson(j))
            .toList();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  void _filterBatchesByCourse(int courseId) {
    setState(() {
      _courseBatches =
          _allBatches.where((b) => b.courseId == courseId).toList();
      _selectedBatchId = null;
    });
  }

  Future<void> _createDiscounts() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCourseId == null || _selectedBatchId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select course and batch')),
      );
      return;
    }
    if (_selectedStudentIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one student')),
      );
      return;
    }

    final discount = double.tryParse(_discountController.text);
    if (discount == null || discount <= 0 || discount > 100) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please enter a valid discount between 0 and 100')),
      );
      return;
    }

    try {
      final api = sl<ApiClient>();
      for (final studentId in _selectedStudentIds) {
        await api.createStudentDiscount({
          'student_id': studentId,
          'discount_type': 'batch',
          'course_id': _selectedCourseId,
          'batch_id': _selectedBatchId,
          'discount_percentage': discount,
          'reason': _reasonController.text.trim(),
        });
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(
                'Successfully created ${_selectedStudentIds.length} discounts')),
      );

      // Reset form
      _selectedCourseId = null;
      _selectedBatchId = null;
      _selectedStudentIds.clear();
      _discountController.clear();
      _reasonController.clear();
      _courseBatches.clear();

      // Reload discounts
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating discounts: $e')),
      );
    }
  }

  Future<void> _deleteDiscount(int id) async {
    try {
      await sl<ApiClient>().deleteStudentDiscount(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Discount deleted successfully')),
      );
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error deleting discount: $e')),
      );
    }
  }

  String _getCourseName(int courseId) {
    try {
      return _courses.firstWhere((c) => c.id == courseId).name;
    } catch (_) {
      return 'Course #$courseId';
    }
  }

  String _getBatchName(int batchId) {
    try {
      return _allBatches.firstWhere((b) => b.id == batchId).batchName;
    } catch (_) {
      return 'Batch #$batchId';
    }
  }

  String _getStudentName(int studentId) {
    try {
      return _students.firstWhere((s) => s.id == studentId).name;
    } catch (_) {
      return 'Student #$studentId';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Create Discount Form
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Create Batch Discount',
                          style: AppTextStyles.h4.copyWith(fontSize: 16)),
                      const SizedBox(height: 16),

                      // Course Selection
                      DropdownButtonFormField<int>(
                        value: _selectedCourseId,
                        decoration: const InputDecoration(
                          labelText: 'Course *',
                          prefixIcon: Icon(Icons.school),
                        ),
                        items: _courses
                            .map((c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text(c.name),
                                ))
                            .toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() => _selectedCourseId = v);
                            _filterBatchesByCourse(v);
                          }
                        },
                      ),
                      const SizedBox(height: 16),

                      // Batch Selection
                      if (_selectedCourseId != null) ...[
                        DropdownButtonFormField<int>(
                          value: _selectedBatchId,
                          decoration: const InputDecoration(
                            labelText: 'Batch *',
                            prefixIcon: Icon(Icons.group_work),
                          ),
                          items: _courseBatches
                              .map((b) => DropdownMenuItem(
                                    value: b.id,
                                    child: Text(b.batchName),
                                  ))
                              .toList(),
                          onChanged: (v) =>
                              setState(() => _selectedBatchId = v),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Student Multi-Selection (similar to course tab)
                      Text('Students *', style: AppTextStyles.labelLarge),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Selected: ${_selectedStudentIds.length}/${_students.length}',
                                  style: AppTextStyles.caption,
                                ),
                                const Spacer(),
                                TextButton(
                                  onPressed: () {
                                    setState(() {
                                      if (_selectedStudentIds.length ==
                                          _students.length) {
                                        _selectedStudentIds.clear();
                                      } else {
                                        _selectedStudentIds =
                                            _students.map((s) => s.id).toList();
                                      }
                                    });
                                  },
                                  child: Text(_selectedStudentIds.length ==
                                          _students.length
                                      ? 'Deselect All'
                                      : 'Select All'),
                                ),
                              ],
                            ),
                            const Divider(),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxHeight: 200),
                              child: ListView.builder(
                                shrinkWrap: true,
                                itemCount: _students.length,
                                itemBuilder: (context, index) {
                                  final student = _students[index];
                                  final isSelected =
                                      _selectedStudentIds.contains(student.id);
                                  return CheckboxListTile(
                                    dense: true,
                                    title: Text(student.name,
                                        style: AppTextStyles.bodySmall),
                                    value: isSelected,
                                    onChanged: (selected) {
                                      setState(() {
                                        if (selected == true) {
                                          _selectedStudentIds.add(student.id);
                                        } else {
                                          _selectedStudentIds
                                              .remove(student.id);
                                        }
                                      });
                                    },
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Discount Percentage
                      TextFormField(
                        controller: _discountController,
                        decoration: const InputDecoration(
                          labelText: 'Discount Percentage *',
                          suffixText: '%',
                          prefixIcon: Icon(Icons.percent),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Required';
                          final num = double.tryParse(v);
                          if (num == null || num <= 0 || num > 100) {
                            return 'Enter 0-100';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Reason
                      TextFormField(
                        controller: _reasonController,
                        decoration: const InputDecoration(
                          labelText: 'Reason (optional)',
                          prefixIcon: Icon(Icons.note),
                        ),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 16),

                      // Submit Button
                      FilledButton.icon(
                        onPressed: _createDiscounts,
                        icon: const Icon(Icons.add),
                        label: const Text('Create Discounts'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Existing Discounts List
            Text('Active Batch Discounts (${_discounts.length})',
                style: AppTextStyles.h4.copyWith(fontSize: 16)),
            const SizedBox(height: 12),

            if (_discounts.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(
                    child: Text(
                      'No batch discounts created yet',
                      style: AppTextStyles.caption,
                    ),
                  ),
                ),
              )
            else
              ..._discounts.map((discount) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.warning.withValues(alpha: 0.15),
                      child: Text(
                        '${discount.discountPercentage.toStringAsFixed(0)}%',
                        style: const TextStyle(
                          color: AppColors.warning,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    title: Text(_getStudentName(discount.studentId)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_getCourseName(discount.courseId)} - ${_getBatchName(discount.batchId!)}',
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.primary),
                        ),
                        if (discount.reason != null &&
                            discount.reason!.isNotEmpty)
                          Text(discount.reason!,
                              style: AppTextStyles.caption),
                      ],
                    ),
                    trailing: IconButton(
                      icon:
                          const Icon(Icons.delete_outline, color: AppColors.error),
                      onPressed: () async {
                        final confirmed = await ConfirmDialog.show(
                          context,
                          title: 'Delete Discount',
                          message: 'Remove this discount?',
                          confirmLabel: 'Delete',
                          confirmColor: AppColors.error,
                        );
                        if (confirmed == true && mounted) {
                          _deleteDiscount(discount.id);
                        }
                      },
                    ),
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }
}
