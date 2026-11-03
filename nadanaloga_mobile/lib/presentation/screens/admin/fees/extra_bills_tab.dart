import 'package:flutter/material.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/utils/fee_format.dart';
import '../../../../di/injection_container.dart';
import 'extra_bill_detail_screen.dart';
import 'extra_bill_form_screen.dart';

/// One extra bill (GET /api/fee-charges): a one-off charge such as a costume
/// or exam fee billed to chosen students, or an item families order.
class ExtraBill {
  final Map<String, dynamic> raw;
  const ExtraBill(this.raw);

  static double _n(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  static int _i(dynamic v) => v is int ? v : int.tryParse('$v') ?? 0;

  int get id => _i(raw['id']);
  String get title => '${raw['title'] ?? 'Bill'}';
  String get category => '${raw['category'] ?? 'Other'}';
  String get description => '${raw['description'] ?? ''}'.trim();
  double get amount => _n(raw['amount']);
  String? get dueDate => raw['due_date'] as String?;
  bool get orderable => raw['mode'] == 'orderable';
  bool get closed => raw['status'] == 'closed';
  String get audienceLabel => '${raw['audience_label'] ?? ''}';
  int get bills => _i(raw['bills']);
  int get paid => _i(raw['paid']);
  double get paidAmount => _n(raw['paid_amount']);
  double get dueAmount => _n(raw['due_amount']);
  String get createdBy => '${raw['created_by_name'] ?? ''}';
  String? get createdAt => raw['created_at'] as String?;

  List<Map<String, dynamic>> get options => ((raw['options'] as List?) ?? const [])
      .whereType<Map>()
      .map((m) => Map<String, dynamic>.from(m))
      .toList();

  /// "S, M, L ₹500" — each option, with its own price when it has one.
  String get optionsLabel => options.map((o) {
        final p = o['amount'];
        final price = p is num && p > 0 ? ' ${FeeFormat.rupees(p)}' : '';
        return '${o['label']}$price';
      }).join(', ');
}

/// Small rounded label used on the extra-bill screens.
class BillChip extends StatelessWidget {
  final String text;
  final Color color;
  final IconData? icon;
  const BillChip(this.text, {super.key, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 3),
          ],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.caption.copyWith(
                  color: color, fontWeight: FontWeight.w600, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}

Color categoryColor(String category) {
  switch (category) {
    case 'Costume':
      return AppColors.courseDance;
    case 'Grade exam fee':
      return AppColors.primary;
    case 'Event':
      return AppColors.courseVocal;
    case 'Book materials':
      return AppColors.courseVeena;
    case 'Uniform':
      return AppColors.courseViolin;
    default:
      return AppColors.textSecondary;
  }
}

/// Admin → Fee Management → "Extra bills": every one-off bill and item, with
/// how many students paid. The academy raises extra bills only from here.
class ExtraBillsTab extends StatefulWidget {
  const ExtraBillsTab({super.key});

  @override
  State<ExtraBillsTab> createState() => ExtraBillsTabState();
}

class ExtraBillsTabState extends State<ExtraBillsTab>
    with AutomaticKeepAliveClientMixin {
  final _api = sl<ApiClient>();
  List<ExtraBill> _bills = [];
  List<String> _categories = const [];
  bool _loading = true;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    reload();
  }

  Future<void> reload() async {
    if (_bills.isEmpty) setState(() => _loading = true);
    try {
      final r = await _api.getFeeCharges();
      if (!mounted) return;
      if (r.statusCode == 200 && r.data is Map) {
        final d = r.data as Map;
        setState(() {
          _error = null;
          _categories = ((d['categories'] as List?) ?? const []).map((e) => '$e').toList();
          _bills = ((d['charges'] as List?) ?? const [])
              .whereType<Map>()
              .map((m) => ExtraBill(Map<String, dynamic>.from(m)))
              .toList();
        });
      } else {
        setState(() => _error = (r.data is Map ? r.data['message'] : null) ?? 'Could not load extra bills.');
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load extra bills.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// The "New bill" button: open the form, then refresh.
  Future<void> newBill() async {
    final created = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => ExtraBillFormScreen(categories: _categories),
    ));
    if (created == true && mounted) reload();
  }

  Future<void> _open(ExtraBill b) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ExtraBillDetailScreen(chargeId: b.id, initial: b),
    ));
    if (mounted) reload();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null && _bills.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center, style: AppTextStyles.bodyMedium),
              const SizedBox(height: 8),
              TextButton(onPressed: reload, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: reload,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Costumes, exam fees, event fees, books and uniforms. Each student\'s part '
              'shows in the family\'s Fees and is paid like any other bill.',
              style: AppTextStyles.bodySmall,
            ),
          ),
          const SizedBox(height: 12),
          if (_bills.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                children: [
                  const Icon(Icons.receipt_long_outlined, size: 56, color: AppColors.textHint),
                  const SizedBox(height: 12),
                  const Text('No extra bills yet', style: AppTextStyles.labelLarge),
                  const SizedBox(height: 4),
                  Text('Tap "New bill" to bill students or offer an item.',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                ],
              ),
            )
          else
            for (final b in _bills) _card(b),
        ],
      ),
    );
  }

  Widget _card(ExtraBill b) {
    final cat = categoryColor(b.category);
    final unpaid = b.bills - b.paid;
    final String counts;
    if (b.bills == 0) {
      counts = b.orderable ? 'No orders yet' : 'No bills';
    } else {
      counts = '${b.paid} of ${b.bills} paid';
    }
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _open(b),
        child: Opacity(
          opacity: b.closed ? 0.7 : 1,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(b.title,
                          style: AppTextStyles.labelLarge,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      FeeFormat.priceRange(b.amount, b.options),
                      style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    BillChip(b.category, color: cat),
                    BillChip(b.orderable ? 'Order item' : 'Billed',
                        color: b.orderable ? AppColors.info : AppColors.success,
                        icon: b.orderable ? Icons.shopping_bag_outlined : Icons.receipt_long),
                    if (b.closed)
                      const BillChip('Closed', color: AppColors.textSecondary, icon: Icons.lock_outline),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.groups_outlined, size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(b.audienceLabel,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                    ),
                  ],
                ),
                if (b.orderable && b.options.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text('Options: ${b.optionsLabel}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
                  ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        [counts, if (b.dueDate != null) 'Due ${FeeFormat.date(b.dueDate)}'].join('  ·  '),
                        style: AppTextStyles.bodySmall,
                      ),
                    ),
                    if (unpaid > 0)
                      Text('${FeeFormat.rupees(b.dueAmount)} due',
                          style: AppTextStyles.labelLarge.copyWith(color: AppColors.warning, fontSize: 13))
                    else if (b.bills > 0)
                      Text('All paid',
                          style: AppTextStyles.labelLarge.copyWith(color: AppColors.success, fontSize: 13)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
