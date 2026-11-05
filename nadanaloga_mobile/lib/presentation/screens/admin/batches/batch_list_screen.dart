import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/batch_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/batch/batch_bloc.dart';
import '../../../bloc/batch/batch_event.dart';
import '../../../bloc/batch/batch_state.dart';
import '../../../widgets/batch_views.dart';
import '../../../widgets/confirm_dialog.dart';
import '../../../widgets/empty_state_widget.dart';
import '../insights/not_in_batch_banner.dart';
import '../../../../core/utils/admin_role.dart';

/// Every batch, as cards grouped by course or as one table. Teacher, class
/// times and student count are the highlighted facts on both.
class BatchListScreen extends StatefulWidget {
  const BatchListScreen({super.key});

  @override
  State<BatchListScreen> createState() => _BatchListScreenState();
}

class _BatchListScreenState extends State<BatchListScreen> {
  final _searchController = TextEditingController();
  String _search = '';

  /// Selected course; null = all courses. Batches without a course use -1.
  int? _courseFilter;

  /// Last batches shown, kept while the bloc reloads or reports an error so
  /// the screen doesn't blank out.
  List<BatchModel>? _cache;

  /// Student id → name, so the search can find a batch by a student in it.
  Map<int, String> _studentNames = const {};

  static const _noCourse = -1;

  final _notInBatchKey = GlobalKey<NotInBatchBannerState>();

  @override
  void initState() {
    super.initState();
    final state = context.read<BatchBloc>().state;
    if (state is BatchLoaded) _cache = state.batches;
    _loadStudentNames();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadStudentNames() async {
    try {
      final r = await sl<ApiClient>().getUsers(role: 'Student');
      if (r.statusCode == 200 && r.data is List && mounted) {
        final names = <int, String>{};
        for (final u in (r.data as List).whereType<Map>()) {
          final id = u['id'];
          final name = u['name'];
          if (id is int && name is String) names[id] = name;
        }
        setState(() => _studentNames = names);
      }
    } catch (_) {
      // Search still works on batch and teacher names.
    }
  }

  Future<void> _refresh() async {
    final bloc = context.read<BatchBloc>();
    bloc.add(LoadBatches());
    await bloc.stream
        .firstWhere((s) => s is BatchLoaded || s is BatchError)
        .timeout(const Duration(seconds: 20), onTimeout: () => BatchInitial());
  }

  int _courseKey(BatchModel b) => b.courseId ?? _noCourse;

  String _courseName(BatchModel b) =>
      (b.courseName ?? '').trim().isNotEmpty ? b.courseName!.trim() : 'No course';

  List<BatchModel> _filtered(List<BatchModel> all) {
    final q = _search.trim().toLowerCase();
    final list = all.where((b) {
      if (_courseFilter != null && _courseKey(b) != _courseFilter) return false;
      if (q.isEmpty) return true;
      bool has(String? s) => (s ?? '').toLowerCase().contains(q);
      if (has(b.batchName) ||
          has(b.teacherName) ||
          has(b.courseName) ||
          has(b.studio)) {
        return true;
      }
      return b.studentIds.any((id) => has(_studentNames[id]));
    }).toList();
    list.sort((a, b) {
      final c = _courseName(a).toLowerCase().compareTo(_courseName(b).toLowerCase());
      if (c != 0) return c;
      return a.batchName.toLowerCase().compareTo(b.batchName.toLowerCase());
    });
    return list;
  }

  Future<void> _openBatch(BatchModel b) async {
    await context.push('/admin/batches/${b.id}');
    // The detail screen may have moved, added or removed students.
    if (mounted) context.read<BatchBloc>().add(LoadBatches());
  }

  Future<void> _addBatch() async {
    final created = await context.push<bool>('/admin/batches/add');
    if (created == true && mounted) {
      context.read<BatchBloc>().add(LoadBatches());
    }
  }

  Future<void> _editBatch(BatchModel b) async {
    final saved = await context.push<bool>('/admin/batches/${b.id}/edit');
    if (saved == true && mounted) {
      context.read<BatchBloc>().add(LoadBatches());
    }
  }

  Future<void> _deleteBatch(BatchModel b) async {
    final count = batchStudentCount(b);
    final confirmed = await ConfirmDialog.show(
      context,
      title: 'Delete batch',
      message: count > 0
          ? 'Delete "${b.batchName}"? Its $count ${count == 1 ? 'student' : 'students'} will no longer be in any batch for this class.'
          : 'Delete "${b.batchName}"?',
      confirmLabel: 'Delete',
      confirmColor: AppColors.error,
    );
    if (confirmed == true && mounted) {
      context.read<BatchBloc>().add(DeleteBatch(b.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Batches'),
        automaticallyImplyLeading: Navigator.of(context).canPop(),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: Center(child: BatchViewToggle()),
          ),
        ],
      ),
      body: BlocConsumer<BatchBloc, BatchState>(
        listener: (context, state) {
          if (state is BatchLoaded) {
            setState(() => _cache = state.batches);
            // Batch membership may have changed; refresh the "not in a
            // batch" count with it.
            _notInBatchKey.currentState?.reload();
          } else if (state is BatchOperationSuccess) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.message)));
          } else if (state is BatchError && _cache != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                  content: Text(state.message),
                  backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          final batches = state is BatchLoaded ? state.batches : _cache;
          if (batches == null) {
            if (state is BatchError) {
              return EmptyStateWidget(
                icon: Icons.cloud_off_outlined,
                title: 'Could not load batches',
                subtitle: state.message,
                actionLabel: 'Retry',
                onAction: () => context.read<BatchBloc>().add(LoadBatches()),
              );
            }
            return const Center(child: CircularProgressIndicator());
          }
          if (batches.isEmpty) {
            return EmptyStateWidget(
              icon: Icons.group_work_outlined,
              title: 'No batches yet',
              subtitle: 'Create your first batch.',
              actionLabel: 'Create Batch',
              onAction: _addBatch,
            );
          }
          return Column(
            children: [
              if (state is BatchLoading) const LinearProgressIndicator(minHeight: 2),
              NotInBatchBanner(key: _notInBatchKey),
              _buildFilters(batches),
              Expanded(
                child: ValueListenableBuilder<BatchViewMode>(
                  valueListenable: BatchViewPreference.mode,
                  builder: (context, mode, _) =>
                      _buildBody(batches, _filtered(batches), mode),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addBatch,
        icon: const Icon(Icons.add),
        label: const Text('New batch'),
      ),
    );
  }

  Widget _buildFilters(List<BatchModel> all) {
    final courses = <int, String>{};
    final counts = <int, int>{};
    for (final b in all) {
      courses[_courseKey(b)] = _courseName(b);
      counts[_courseKey(b)] = (counts[_courseKey(b)] ?? 0) + 1;
    }
    final keys = courses.keys.toList()
      ..sort((a, b) {
        if (a == _noCourse) return 1;
        if (b == _noCourse) return -1;
        return courses[a]!.toLowerCase().compareTo(courses[b]!.toLowerCase());
      });
    if (_courseFilter != null && !courses.containsKey(_courseFilter)) {
      _courseFilter = null;
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
          child: TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Search batch, teacher or student',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _search.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _search = '');
                      },
                    )
                  : null,
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
        ),
        if (keys.length > 1)
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              children: [
                ChoiceChip(
                  label: Text('All courses (${all.length})'),
                  selected: _courseFilter == null,
                  onSelected: (_) => setState(() => _courseFilter = null),
                ),
                for (final k in keys) ...[
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: Text('${courses[k]} (${counts[k]})'),
                    selected: _courseFilter == k,
                    onSelected: (_) => setState(
                        () => _courseFilter = _courseFilter == k ? null : k),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildBody(
      List<BatchModel> all, List<BatchModel> list, BatchViewMode mode) {
    final children = <Widget>[_summary(list)];

    if (list.isEmpty) {
      children.add(const Padding(
        padding: EdgeInsets.only(top: 24),
        child: EmptyStateWidget(
          icon: Icons.search_off,
          title: 'No matching batches',
          subtitle: 'Try a different search or course.',
        ),
      ));
    } else if (mode == BatchViewMode.table) {
      children.add(BatchTable(batches: list, onTap: _openBatch));
    } else {
      // Grid: one section per course, in list order (already sorted).
      final groups = <int, List<BatchModel>>{};
      for (final b in list) {
        groups.putIfAbsent(_courseKey(b), () => []).add(b);
      }
      for (final entry in groups.entries) {
        children.add(_courseHeader(_courseName(entry.value.first), entry.value));
        children.add(BatchCardGrid(children: [
          for (final b in entry.value)
            BatchGridCard(
              batch: b,
              onTap: () => _openBatch(b),
              trailing: _cardMenu(b),
            ),
        ]));
        children.add(const SizedBox(height: 20));
      }
    }

    return RefreshIndicator(
      onRefresh: () async {
        _loadStudentNames();
        await _refresh();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
        children: children,
      ),
    );
  }

  Widget _summary(List<BatchModel> list) {
    final students = <int>{for (final b in list) ...b.studentIds}.length;
    final noTeacher = list.where((b) => !batchHasTeacher(b)).length;
    Widget stat(IconData icon, String value, String label, Color color) {
      return Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(value,
                        style: AppTextStyles.h4.copyWith(
                            color: color,
                            fontWeight: FontWeight.w700,
                            fontSize: 17,
                            height: 1.1)),
                    Text(label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption.copyWith(fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 14),
      child: Row(
        children: [
          stat(Icons.group_work_rounded, '${list.length}', 'Batches',
              AppColors.primary),
          const SizedBox(width: 8),
          stat(Icons.people_alt_rounded, '$students', 'Students',
              BatchPalette.students),
          const SizedBox(width: 8),
          stat(
              Icons.person_off_outlined,
              '$noTeacher',
              'No teacher',
              noTeacher > 0 ? BatchPalette.unassigned : BatchPalette.teacher),
        ],
      ),
    );
  }

  Widget _courseHeader(String name, List<BatchModel> batches) {
    final students = <int>{for (final b in batches) ...b.studentIds}.length;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 22,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.h4
                    .copyWith(fontSize: 17, fontWeight: FontWeight.w700)),
          ),
          Text(
            '${batches.length} ${batches.length == 1 ? 'batch' : 'batches'} · $students students',
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }

  Widget _cardMenu(BatchModel b) {
    return PopupMenuButton<String>(
      tooltip: 'More',
      icon: const Icon(Icons.more_vert, size: 20),
      onSelected: (v) {
        if (v == 'edit') _editBatch(b);
        if (v == 'delete') _deleteBatch(b);
      },
      itemBuilder: (_) => [
        const PopupMenuItem(value: 'edit', child: Text('Edit batch')),
        if (isSuperAdminOf(context))
          const PopupMenuItem(
          value: 'delete',
          child: Text('Delete', style: TextStyle(color: AppColors.error)),
        ),
      ],
    );
  }
}
