import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/invoice_model.dart';
import '../../../../data/models/user_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/user_management/user_management_bloc.dart';
import '../../../bloc/user_management/user_management_event.dart';
import '../../../bloc/user_management/user_management_state.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';

class StudentListByCourseScreen extends StatefulWidget {
  final String courseName;

  const StudentListByCourseScreen({
    super.key,
    required this.courseName,
  });

  @override
  State<StudentListByCourseScreen> createState() => _StudentListByCourseScreenState();
}

class _StudentListByCourseScreenState extends State<StudentListByCourseScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _sortBy = 'name';
  bool _sortAscending = true;

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

  List<UserModel> _filterAndSortStudents(List<UserModel> students) {
    var filtered = widget.courseName.toLowerCase() == 'unassigned'
        ? students.where((s) => s.role == 'Student' && !s.isDeleted && s.courses.isEmpty).toList()
        : students
            .where((s) =>
                s.role == 'Student' &&
                !s.isDeleted &&
                s.courses.any((c) => c.toLowerCase() == widget.courseName.toLowerCase()))
            .toList();

    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((s) {
        return s.name.toLowerCase().contains(query) ||
            (s.fatherName?.toLowerCase().contains(query) ?? false) ||
            s.email.toLowerCase().contains(query) ||
            (s.contactNumber?.contains(query) ?? false) ||
            (s.userId?.toLowerCase().contains(query) ?? false);
      }).toList();
    }

    filtered.sort((a, b) {
      int comparison;
      switch (_sortBy) {
        case 'name':
          comparison = a.name.compareTo(b.name);
          break;
        case 'doj':
          comparison = (a.dateOfJoining ?? '').compareTo(b.dateOfJoining ?? '');
          break;
        case 'dob':
          comparison = (a.dob ?? '').compareTo(b.dob ?? '');
          break;
        default:
          comparison = a.name.compareTo(b.name);
      }
      return _sortAscending ? comparison : -comparison;
    });

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final isUnassigned = widget.courseName.toLowerCase() == 'unassigned';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(isUnassigned ? 'Unassigned Students' : widget.courseName),
        centerTitle: true,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            tooltip: 'Sort by',
            onSelected: (value) {
              setState(() {
                if (_sortBy == value) {
                  _sortAscending = !_sortAscending;
                } else {
                  _sortBy = value;
                  _sortAscending = true;
                }
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'name',
                child: Row(
                  children: [
                    Icon(
                      _sortBy == 'name'
                          ? (_sortAscending ? Icons.arrow_upward : Icons.arrow_downward)
                          : Icons.person,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('Name'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'doj',
                child: Row(
                  children: [
                    Icon(
                      _sortBy == 'doj'
                          ? (_sortAscending ? Icons.arrow_upward : Icons.arrow_downward)
                          : Icons.calendar_today,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('Date of Joining'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'dob',
                child: Row(
                  children: [
                    Icon(
                      _sortBy == 'dob'
                          ? (_sortAscending ? Icons.arrow_upward : Icons.arrow_downward)
                          : Icons.cake,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text('Date of Birth'),
                  ],
                ),
              ),
            ],
          ),
        ],
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
                hintText: 'Search by name, father name, email, phone...',
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
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
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

          // Student List
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
                final students = _filterAndSortStudents(users);

                if (students.isEmpty) {
                  return EmptyStateWidget(
                    icon: Icons.person_search,
                    title: _searchQuery.isNotEmpty ? 'No Results' : 'No Students',
                    subtitle: _searchQuery.isNotEmpty
                        ? 'Try a different search term'
                        : 'No students enrolled in this course',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<UserManagementBloc>().add(LoadUsers());
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    itemCount: students.length,
                    itemBuilder: (context, index) {
                      final student = students[index];
                      return _AccordionStudentCard(
                        student: student,
                        index: index,
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _AccordionStudentCard extends StatefulWidget {
  final UserModel student;
  final int index;

  const _AccordionStudentCard({
    required this.student,
    required this.index,
  });

  @override
  State<_AccordionStudentCard> createState() => _AccordionStudentCardState();
}

class _AccordionStudentCardState extends State<_AccordionStudentCard> {
  bool _isExpanded = false;

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  void _showMarkPaidSheet(BuildContext context, UserModel student) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _MarkPaidBottomSheet(
        student: student,
        onPaymentRecorded: () {
          // Refresh users to update any related data
          context.read<UserManagementBloc>().add(LoadUsers());
        },
      ),
    );
  }

  Future<void> _confirmDeleteStudent(BuildContext context, UserModel student) async {
    final confirmed = await ConfirmDialog.show(
      context,
      title: 'Delete Student',
      message: 'Are you sure you want to delete "${student.name}"? This will move the student to trash.',
      confirmLabel: 'Delete',
      confirmColor: AppColors.error,
    );

    if (confirmed == true && context.mounted) {
      context.read<UserManagementBloc>().add(DeleteUser(student.id));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${student.name} has been moved to trash'),
          backgroundColor: AppColors.success,
          action: SnackBarAction(
            label: 'Undo',
            textColor: Colors.white,
            onPressed: () {
              // TODO: Implement undo by restoring user
            },
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final student = widget.student;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _isExpanded ? AppColors.primary.withOpacity(0.3) : AppColors.divider.withOpacity(0.5),
        ),
      ),
      child: Column(
        children: [
          // Collapsed Header - Name, ID, Phone
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
                    backgroundColor: AppColors.studentAccent.withOpacity(0.1),
                    backgroundImage: student.photoUrl != null && student.photoUrl!.isNotEmpty
                        ? NetworkImage(student.photoUrl!)
                        : null,
                    child: student.photoUrl == null || student.photoUrl!.isEmpty
                        ? Text(
                            student.name.isNotEmpty ? student.name[0].toUpperCase() : '?',
                            style: AppTextStyles.labelLarge.copyWith(color: AppColors.studentAccent),
                          )
                        : null,
                  ),
                  const SizedBox(width: 10),

                  // Name & ID
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          student.name,
                          style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Row(
                          children: [
                            if (student.userId != null) ...[
                              Text(
                                student.userId!,
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 11,
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            Icon(Icons.phone, size: 12, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              student.contactNumber ?? '-',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.textSecondary,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: student.status == 'active'
                          ? AppColors.success.withOpacity(0.1)
                          : AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      student.status?.toUpperCase() ?? 'ACTIVE',
                      style: AppTextStyles.caption.copyWith(
                        color: student.status == 'active' ? AppColors.success : AppColors.warning,
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

                  // Details Grid
                  Row(
                    children: [
                      Expanded(child: _CompactInfoItem(icon: Icons.person_outline, label: 'Father', value: student.fatherName ?? '-')),
                      Expanded(child: _CompactInfoItem(icon: Icons.cake_outlined, label: 'DOB', value: _formatDate(student.dob))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(child: _CompactInfoItem(icon: Icons.calendar_today_outlined, label: 'Joined', value: _formatDate(student.dateOfJoining))),
                      Expanded(child: _CompactInfoItem(icon: Icons.email_outlined, label: 'Email', value: student.email)),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Action Buttons - Row 1
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/admin/drilldown/student/${student.id}'),
                          icon: const Icon(Icons.visibility, size: 14),
                          label: const Text('Details'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: BorderSide(color: AppColors.primary.withOpacity(0.5)),
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600, fontSize: 11),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/admin/drilldown/student/${student.id}?fees=true'),
                          icon: const Icon(Icons.receipt_long, size: 14),
                          label: const Text('Invoices'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.info,
                            side: BorderSide(color: AppColors.info.withOpacity(0.5)),
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600, fontSize: 11),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Mark Paid and Delete Buttons - Row
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          onPressed: () => _showMarkPaidSheet(context, student),
                          icon: const Icon(Icons.check_circle_outline, size: 16),
                          label: const Text('Mark as Paid'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
                            elevation: 0,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _confirmDeleteStudent(context, student),
                          icon: const Icon(Icons.delete_outline, size: 16),
                          label: const Text('Delete'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.error,
                            side: BorderSide(color: AppColors.error.withOpacity(0.5)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
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

class _CompactInfoItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _CompactInfoItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTextStyles.caption.copyWith(color: AppColors.textHint, fontSize: 9),
              ),
              Text(
                value,
                style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w500, fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// Mark Paid Bottom Sheet
class _MarkPaidBottomSheet extends StatefulWidget {
  final UserModel student;
  final VoidCallback onPaymentRecorded;

  const _MarkPaidBottomSheet({
    required this.student,
    required this.onPaymentRecorded,
  });

  @override
  State<_MarkPaidBottomSheet> createState() => _MarkPaidBottomSheetState();
}

class _MarkPaidBottomSheetState extends State<_MarkPaidBottomSheet> {
  List<InvoiceModel> _pendingInvoices = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPendingInvoices();
  }

  Future<void> _loadPendingInvoices() async {
    try {
      final response = await sl<ApiClient>().getInvoices();
      if (response.statusCode == 200) {
        final allInvoices = (response.data as List)
            .map((j) => InvoiceModel.fromJson(j))
            .toList();
        _pendingInvoices = allInvoices
            .where((inv) =>
                inv.studentId == widget.student.id &&
                (inv.status == 'pending' || inv.status == 'overdue'))
            .toList();
      }
    } catch (e) {
      _error = 'Failed to load invoices';
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.7,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.divider,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: AppColors.studentAccent.withOpacity(0.1),
                  child: Text(
                    widget.student.name.isNotEmpty ? widget.student.name[0].toUpperCase() : '?',
                    style: AppTextStyles.labelLarge.copyWith(color: AppColors.studentAccent),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.student.name,
                        style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        'Pending Fees',
                        style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Content
          Flexible(
            child: _loading
                ? const Center(child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ))
                : _error != null
                    ? Center(child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(_error!, style: TextStyle(color: AppColors.error)),
                      ))
                    : _pendingInvoices.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.check_circle, size: 48, color: AppColors.success),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No Pending Fees',
                                    style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'All fees are paid for this student',
                                    style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            shrinkWrap: true,
                            padding: const EdgeInsets.all(16),
                            itemCount: _pendingInvoices.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final invoice = _pendingInvoices[index];
                              return _PendingInvoiceCard(
                                invoice: invoice,
                                onMarkPaid: () => _showPaymentMethodSheet(invoice),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }

  void _showPaymentMethodSheet(InvoiceModel invoice) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _QuickPaymentSheet(
        invoice: invoice,
        onPaymentRecorded: () {
          Navigator.pop(ctx); // Close payment sheet
          widget.onPaymentRecorded();
          _loadPendingInvoices(); // Refresh list
        },
      ),
    );
  }
}

// Pending Invoice Card
class _PendingInvoiceCard extends StatelessWidget {
  final InvoiceModel invoice;
  final VoidCallback onMarkPaid;

  const _PendingInvoiceCard({
    required this.invoice,
    required this.onMarkPaid,
  });

  @override
  Widget build(BuildContext context) {
    final isOverdue = invoice.status == 'overdue';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isOverdue ? AppColors.error.withOpacity(0.05) : AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isOverdue ? AppColors.error.withOpacity(0.3) : AppColors.divider,
        ),
      ),
      child: Row(
        children: [
          // Invoice Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      invoice.courseName ?? 'Fee',
                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (isOverdue) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.error.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'OVERDUE',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.error,
                            fontWeight: FontWeight.w600,
                            fontSize: 9,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  invoice.billingPeriod ?? '',
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                ),
                if (invoice.dueDate != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Due: ${invoice.dueDate!.split('T').first}',
                    style: AppTextStyles.caption.copyWith(
                      color: isOverdue ? AppColors.error : AppColors.textSecondary,
                      fontSize: 10,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Amount & Button
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\u20B9${invoice.amount?.toStringAsFixed(0) ?? '0'}',
                style: AppTextStyles.h3.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              ElevatedButton(
                onPressed: onMarkPaid,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  minimumSize: Size.zero,
                  textStyle: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600),
                ),
                child: const Text('Mark Paid'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Quick Payment Sheet
class _QuickPaymentSheet extends StatefulWidget {
  final InvoiceModel invoice;
  final VoidCallback onPaymentRecorded;

  const _QuickPaymentSheet({
    required this.invoice,
    required this.onPaymentRecorded,
  });

  @override
  State<_QuickPaymentSheet> createState() => _QuickPaymentSheetState();
}

class _QuickPaymentSheetState extends State<_QuickPaymentSheet> {
  String _paymentMethod = 'Cash';
  final _transactionIdController = TextEditingController();
  DateTime _paymentDate = DateTime.now();
  bool _submitting = false;

  @override
  void dispose() {
    _transactionIdController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);

    try {
      final paymentData = {
        'payment_method': _paymentMethod,
        'payment_date': _paymentDate.toIso8601String(),
        if (_transactionIdController.text.trim().isNotEmpty)
          'transaction_id': _transactionIdController.text.trim(),
      };

      final response = await sl<ApiClient>().updateInvoice(
        widget.invoice.id,
        {
          'status': 'paid',
          'payment_details': paymentData,
        },
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Payment recorded successfully'),
              backgroundColor: AppColors.success,
            ),
          );
          widget.onPaymentRecorded();
        }
      } else {
        throw Exception('Failed to record payment');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }

    if (mounted) setState(() => _submitting = false);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _paymentDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _paymentDate = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.divider,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Title
          Text(
            'Record Payment',
            style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),

          // Invoice Summary
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.invoice.courseName ?? 'Fee',
                      style: AppTextStyles.labelLarge,
                    ),
                    Text(
                      widget.invoice.billingPeriod ?? '',
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
                Text(
                  '\u20B9${widget.invoice.amount?.toStringAsFixed(0) ?? '0'}',
                  style: AppTextStyles.h3.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.success,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Payment Method
          Text('Payment Method', style: AppTextStyles.labelLarge),
          const SizedBox(height: 8),
          Row(
            children: [
              _PaymentMethodChip(
                label: 'Cash',
                icon: Icons.money,
                isSelected: _paymentMethod == 'Cash',
                onTap: () => setState(() => _paymentMethod = 'Cash'),
              ),
              const SizedBox(width: 8),
              _PaymentMethodChip(
                label: 'UPI',
                icon: Icons.phone_android,
                isSelected: _paymentMethod == 'UPI',
                onTap: () => setState(() => _paymentMethod = 'UPI'),
              ),
              const SizedBox(width: 8),
              _PaymentMethodChip(
                label: 'Bank',
                icon: Icons.account_balance,
                isSelected: _paymentMethod == 'Bank',
                onTap: () => setState(() => _paymentMethod = 'Bank'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Transaction ID (for UPI and Bank)
          if (_paymentMethod != 'Cash') ...[
            TextField(
              controller: _transactionIdController,
              decoration: InputDecoration(
                labelText: _paymentMethod == 'UPI' ? 'UPI Transaction ID' : 'Bank Reference',
                hintText: 'Optional',
                prefixIcon: const Icon(Icons.tag, size: 20),
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Payment Date
          InkWell(
            onTap: _pickDate,
            borderRadius: BorderRadius.circular(8),
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: 'Payment Date',
                prefixIcon: const Icon(Icons.calendar_today, size: 20),
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(
                '${_paymentDate.day}/${_paymentDate.month}/${_paymentDate.year}',
                style: AppTextStyles.bodyMedium,
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Submit Button
          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: _submitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Confirm Payment'),
          ),
          SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
        ],
      ),
    );
  }
}

class _PaymentMethodChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodChip({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.success.withOpacity(0.1) : AppColors.background,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? AppColors.success : AppColors.divider,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected ? AppColors.success : AppColors.textSecondary,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: AppTextStyles.caption.copyWith(
                  color: isSelected ? AppColors.success : AppColors.textSecondary,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
