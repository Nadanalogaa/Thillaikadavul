import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../config/theme/app_text_styles.dart';
import '../../../../data/models/demo_booking_model.dart';
import '../../../bloc/demo_booking/demo_booking_bloc.dart';
import '../../../bloc/demo_booking/demo_booking_event.dart';
import '../../../bloc/demo_booking/demo_booking_state.dart';
import '../../../widgets/empty_state_widget.dart';
import 'demo_share.dart';

class DemoListScreen extends StatefulWidget {
  const DemoListScreen({super.key});

  @override
  State<DemoListScreen> createState() => _DemoListScreenState();
}

class _DemoListScreenState extends State<DemoListScreen> {
  /// Booking ids ticked for sharing. Selection mode = at least one ticked,
  /// or the user tapped "Select".
  final Set<int> _selected = {};
  bool _selecting = false;

  Color _statusColor(String? status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return AppColors.primary;
      case 'completed':
        return AppColors.success;
      case 'cancelled':
        return AppColors.error;
      default:
        return Colors.grey;
    }
  }

  List<DemoBookingModel> get _bookings {
    final state = context.read<DemoBookingBloc>().state;
    return state is DemoBookingsLoaded ? state.demoBookings : const [];
  }

  void _toggle(int id) {
    setState(() {
      if (!_selected.remove(id)) _selected.add(id);
    });
  }

  void _exitSelection() {
    setState(() {
      _selected.clear();
      _selecting = false;
    });
  }

  void _toggleAll() {
    final all = _bookings;
    setState(() {
      if (_selected.length == all.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(all.map((b) => b.id));
      }
    });
  }

  Future<void> _openDetail(DemoBookingModel booking) async {
    final bloc = context.read<DemoBookingBloc>();
    await context.push('/admin/demos/${booking.id}');
    // The detail screen may have changed the status.
    if (mounted) bloc.add(LoadDemoBookings());
  }

  PreferredSizeWidget _appBar() {
    if (!_selecting) {
      return AppBar(
        title: const Text('Demo Bookings'),
        actions: [
          if (_bookings.isNotEmpty) ...[
            TextButton(
              onPressed: () => setState(() => _selecting = true),
              child: const Text('Select'),
            ),
            IconButton(
              tooltip: 'Share all',
              icon: const Icon(Icons.share),
              onPressed: () => showDemoShareSheet(context, _bookings),
            ),
          ],
        ],
      );
    }
    final all = _bookings;
    final allSelected = all.isNotEmpty && _selected.length == all.length;
    return AppBar(
      leading: IconButton(
        tooltip: 'Done',
        icon: const Icon(Icons.close),
        onPressed: _exitSelection,
      ),
      title: Text('${_selected.length} selected'),
      actions: [
        TextButton(
          onPressed: _toggleAll,
          child: Text(allSelected ? 'None' : 'All'),
        ),
        IconButton(
          tooltip: 'Share selected',
          icon: const Icon(Icons.share),
          onPressed: _selected.isEmpty
              ? null
              : () => showDemoShareSheet(
                    context,
                    all.where((b) => _selected.contains(b.id)).toList(),
                  ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<DemoBookingBloc, DemoBookingState>(
      listener: (context, state) {
        if (state is DemoBookingOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
        } else if (state is DemoBookingError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        } else if (state is DemoBookingsLoaded) {
          // Drop ticks for bookings that no longer exist.
          final ids = state.demoBookings.map((b) => b.id).toSet();
          setState(() => _selected.retainAll(ids));
        }
      },
      builder: (context, state) {
        return PopScope(
          canPop: !_selecting,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _exitSelection();
          },
          child: Scaffold(
            appBar: _appBar(),
            body: _body(state),
          ),
        );
      },
    );
  }

  Widget _body(DemoBookingState state) {
    if (state is DemoBookingLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state is! DemoBookingsLoaded) return const SizedBox.shrink();
    if (state.demoBookings.isEmpty) {
      return const EmptyStateWidget(
        icon: Icons.calendar_today_outlined,
        title: 'No demo bookings',
        subtitle: 'Demo class requests will appear here.',
      );
    }
    return RefreshIndicator(
      onRefresh: () async =>
          context.read<DemoBookingBloc>().add(LoadDemoBookings()),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: state.demoBookings.length,
        itemBuilder: (context, index) {
          final booking = state.demoBookings[index];
          final color = _statusColor(booking.status);
          final isSelected = _selected.contains(booking.id);
          final bookedOn = formatBookedOn(booking.bookedAt);
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            color: isSelected ? AppColors.primary.withOpacity(0.08) : null,
            child: ListTile(
              leading: _selecting
                  ? Checkbox(
                      value: isSelected,
                      onChanged: (_) => _toggle(booking.id),
                    )
                  : CircleAvatar(
                      backgroundColor: color,
                      child: const Icon(Icons.calendar_today,
                          color: Colors.white),
                    ),
              title: Text(
                booking.studentName ?? 'Unknown Student',
                style: AppTextStyles.labelLarge,
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (booking.course != null && booking.course!.isNotEmpty)
                    Text(booking.course!, style: AppTextStyles.caption),
                  if (booking.phone != null && booking.phone!.isNotEmpty)
                    Text(
                      [
                        if (booking.parentName != null &&
                            booking.parentName!.isNotEmpty)
                          booking.parentName!,
                        booking.phone!,
                      ].join(' | '),
                      style: AppTextStyles.caption,
                    ),
                  if (booking.preferredDate != null ||
                      booking.preferredTime != null)
                    Text(
                      'Preferred: ${booking.preferredDate ?? ''} ${booking.preferredTime ?? ''}'
                          .trim(),
                      style: AppTextStyles.caption,
                    ),
                  if (bookedOn != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Row(
                        children: [
                          const Icon(Icons.event_available,
                              size: 13, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text('Booked on $bookedOn',
                                style: AppTextStyles.caption),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      (booking.status ?? 'unknown').toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                    ),
                  ),
                ],
              ),
              onTap: () => _selecting
                  ? _toggle(booking.id)
                  : _openDetail(booking),
              onLongPress: () => setState(() {
                _selecting = true;
                _selected.add(booking.id);
              }),
            ),
          );
        },
      ),
    );
  }
}
