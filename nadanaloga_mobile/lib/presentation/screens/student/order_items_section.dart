import 'package:flutter/material.dart';

import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_text_styles.dart';
import '../../../core/network/api_client.dart';
import '../../../core/utils/fee_format.dart';
import '../../../di/injection_container.dart';

double _n(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
int _i(dynamic v) => v is int ? v : int.tryParse('$v') ?? 0;

List<Map<String, dynamic>> _maps(dynamic v) => ((v as List?) ?? const [])
    .whereType<Map>()
    .map((m) => Map<String, dynamic>.from(m))
    .toList();

/// Price of one of an item: the option's own price, else the item's.
double _unitPrice(Map<String, dynamic> item, Map<String, dynamic>? option) {
  final double own = option == null ? 0 : _n(option['amount']);
  return own > 0 ? own : _n(item['amount']);
}

/// Fees → "Order items": things the academy offers (uniforms, books…) from
/// GET /api/fee-charges-orderable. Ordering one adds a bill for that student,
/// which is then paid like any other bill. Calls [onOrdered] after an order.
class OrderItemsSection extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final VoidCallback onOrdered;
  const OrderItemsSection({super.key, required this.items, required this.onOrdered});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.shopping_bag_outlined, size: 20, color: AppColors.studentAccent),
            const SizedBox(width: 6),
            Text('Order items', style: AppTextStyles.h4.copyWith(fontSize: 16)),
          ],
        ),
        Text('Uniforms, books and more from the academy. Your order is added to your bills.',
            style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
        const SizedBox(height: 10),
        for (final item in items) _ItemCard(item: item, onOrdered: onOrdered),
      ],
    );
  }
}

class _ItemCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final VoidCallback onOrdered;
  const _ItemCard({required this.item, required this.onOrdered});

  Future<void> _order(BuildContext context) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _OrderSheet(item: item),
    );
    if (ok == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Added to your bills — pay it under Fees'),
        backgroundColor: AppColors.success,
      ));
      onOrdered();
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = '${item['title'] ?? 'Item'}';
    final category = '${item['category'] ?? ''}'.trim();
    final description = '${item['description'] ?? ''}'.trim();
    final due = item['due_date'] as String?;
    final options = _maps(item['options']);
    final orders = _maps(item['orders']);
    final students = _maps(item['students']);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: AppColors.studentAccent.withValues(alpha: 0.18)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: AppTextStyles.labelLarge),
                      if (category.isNotEmpty)
                        Text(category,
                            style: AppTextStyles.caption.copyWith(color: AppColors.studentAccent)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(FeeFormat.priceRange(_n(item['amount']), options),
                    style: AppTextStyles.labelLarge.copyWith(color: AppColors.primary)),
              ],
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(description, style: AppTextStyles.bodySmall),
            ],
            if (options.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                'Options: ${options.map((o) => '${o['label']}').join(', ')}',
                style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
              ),
            ],
            if (due != null && due.isNotEmpty)
              Text('Pay by ${FeeFormat.date(due)}',
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            if (orders.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Your orders',
                        style: AppTextStyles.caption.copyWith(fontWeight: FontWeight.w600)),
                    for (final o in orders) _orderRow(o, showName: students.length > 1),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => _order(context),
                icon: const Icon(Icons.add_shopping_cart, size: 18),
                label: Text(orders.isEmpty ? 'Order' : 'Order more'),
                style: FilledButton.styleFrom(backgroundColor: AppColors.studentAccent),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _orderRow(Map<String, dynamic> o, {required bool showName}) {
    final status = '${o['status'] ?? 'pending'}'.toLowerCase();
    final paid = status == 'paid';
    final color = paid
        ? AppColors.success
        : status == 'overdue'
            ? AppColors.error
            : AppColors.warning;
    final qty = _i(o['quantity']);
    final option = '${o['charge_option'] ?? ''}'.trim();
    final what = [
      if (showName) '${o['student_name'] ?? ''}'.trim(),
      [if (option.isNotEmpty) option, if (qty > 1) '× $qty'].join(' '),
    ].where((s) => s.isNotEmpty).join(' · ');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(what.isEmpty ? 'Ordered' : what,
                maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTextStyles.bodySmall),
          ),
          const SizedBox(width: 8),
          Text(FeeFormat.rupees(_n(o['amount'])), style: AppTextStyles.bodySmall),
          const SizedBox(width: 8),
          Text(paid ? 'Paid' : status == 'overdue' ? 'Overdue' : 'To pay',
              style: AppTextStyles.caption.copyWith(color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Order sheet: which student, which option, how many, total, Confirm.
/// Pops `true` once the order is placed.
class _OrderSheet extends StatefulWidget {
  final Map<String, dynamic> item;
  const _OrderSheet({required this.item});

  @override
  State<_OrderSheet> createState() => _OrderSheetState();
}

class _OrderSheetState extends State<_OrderSheet> {
  late final List<Map<String, dynamic>> _students = _maps(widget.item['students']);
  late final List<Map<String, dynamic>> _options = _maps(widget.item['options']);
  int? _studentId;
  Map<String, dynamic>? _option;
  int _qty = 1;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (_students.length == 1) _studentId = _i(_students.first['id']);
  }

  double get _unit => _unitPrice(widget.item, _option);

  Future<void> _confirm() async {
    if (_studentId == null) {
      setState(() => _error = 'Choose who it is for.');
      return;
    }
    if (_options.isNotEmpty && _option == null) {
      setState(() => _error = 'Choose a size / option.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final r = await sl<ApiClient>().orderFeeCharge(
        _i(widget.item['id']),
        studentId: _studentId!,
        option: _option == null ? null : '${_option!['label']}',
        quantity: _qty,
      );
      if (!mounted) return;
      if (r.statusCode == 201 || r.statusCode == 200) {
        Navigator.of(context).pop(true);
        return;
      }
      setState(() => _error =
          '${(r.data is Map ? r.data['message'] : null) ?? 'Could not place the order.'}');
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not place the order. Check the connection.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = '${widget.item['title'] ?? 'Item'}';
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: AppColors.divider, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 14),
              Text('Order $title', style: AppTextStyles.h4),
              const SizedBox(height: 16),
              if (_students.length > 1) ...[
                const Text('For', style: AppTextStyles.labelLarge),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    for (final s in _students)
                      ChoiceChip(
                        label: Text('${s['name'] ?? 'Student'}'),
                        selected: _studentId == _i(s['id']),
                        onSelected: (_) => setState(() {
                          _studentId = _i(s['id']);
                          _error = null;
                        }),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
              ] else if (_students.length == 1) ...[
                Text('For ${_students.first['name'] ?? 'Student'}',
                    style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
                const SizedBox(height: 16),
              ],
              if (_options.isNotEmpty) ...[
                const Text('Size / option', style: AppTextStyles.labelLarge),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    for (final o in _options)
                      ChoiceChip(
                        label: Text('${o['label']} · ${FeeFormat.rupees(_unitPrice(widget.item, o))}'),
                        selected: _option != null && _option!['label'] == o['label'],
                        onSelected: (_) => setState(() {
                          _option = o;
                          _error = null;
                        }),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
              Row(
                children: [
                  const Expanded(child: Text('Quantity', style: AppTextStyles.labelLarge)),
                  IconButton.outlined(
                    tooltip: 'Fewer',
                    onPressed: _qty > 1 ? () => setState(() => _qty--) : null,
                    icon: const Icon(Icons.remove),
                  ),
                  SizedBox(
                    width: 44,
                    child: Text('$_qty',
                        textAlign: TextAlign.center, style: AppTextStyles.h4),
                  ),
                  IconButton.outlined(
                    tooltip: 'More',
                    onPressed: _qty < 20 ? () => setState(() => _qty++) : null,
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
              const Divider(height: 28),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _options.isNotEmpty && _option == null
                          ? 'Total'
                          : 'Total (${FeeFormat.rupees(_unit)} × $_qty)',
                      style: AppTextStyles.bodyMedium,
                    ),
                  ),
                  Text(
                    _options.isNotEmpty && _option == null ? '—' : FeeFormat.rupees(_unit * _qty),
                    style: AppTextStyles.h3.copyWith(color: AppColors.primary, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: AppTextStyles.bodySmall.copyWith(color: AppColors.error)),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _saving ? null : _confirm,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.studentAccent,
                  minimumSize: const Size.fromHeight(48),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Confirm order'),
              ),
              const SizedBox(height: 6),
              Text('It is added to your bills; pay it under Fees.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }
}
