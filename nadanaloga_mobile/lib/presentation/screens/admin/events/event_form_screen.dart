import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../config/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../data/models/event_model.dart';
import '../../../../di/injection_container.dart';
import '../../../bloc/event/event_bloc.dart';
import '../../../bloc/event/event_event.dart';
import '../../../bloc/event/event_state.dart';

class EventFormScreen extends StatefulWidget {
  final int? eventId;

  const EventFormScreen({super.key, this.eventId});

  bool get isEditing => eventId != null;

  @override
  State<EventFormScreen> createState() => _EventFormScreenState();
}

class _EventFormScreenState extends State<EventFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();

  DateTime? _eventDate;
  TimeOfDay? _eventTime;
  bool _isPublic = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      if (widget.isEditing) {
        final api = sl<ApiClient>();
        final response = await api.getEvents();
        if (response.statusCode == 200) {
          final events = (response.data as List)
              .map((j) => EventModel.fromJson(j))
              .toList();
          final event =
              events.where((e) => e.id == widget.eventId).firstOrNull;
          if (event != null) {
            _titleController.text = event.title;
            _descriptionController.text = event.description ?? '';
            _locationController.text = event.location ?? '';
            _isPublic = event.isPublic;
            if (event.eventDate != null) {
              _eventDate = DateTime.tryParse(event.eventDate!);
            }
            if (event.eventTime != null) {
              final parts = event.eventTime!.split(':');
              if (parts.length >= 2) {
                _eventTime = TimeOfDay(
                  hour: int.tryParse(parts[0]) ?? 0,
                  minute: int.tryParse(parts[1]) ?? 0,
                );
              }
            }
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _eventDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() => _eventDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _eventTime ?? TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() => _eventTime = picked);
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }

  String _formatTime(TimeOfDay time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final data = <String, dynamic>{
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      'event_date': _eventDate?.toIso8601String().split('T').first,
      'event_time': _eventTime != null ? _formatTime(_eventTime!) : null,
      'location': _locationController.text.trim().isEmpty
          ? null
          : _locationController.text.trim(),
      'is_public': _isPublic,
    };

    if (widget.isEditing) {
      context
          .read<EventBloc>()
          .add(UpdateEvent(id: widget.eventId!, data: data));
    } else {
      context.read<EventBloc>().add(CreateEvent(data));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<EventBloc, EventState>(
      listener: (context, state) {
        if (state is EventOperationSuccess) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message)));
          context.pop(true);
        } else if (state is EventError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.isEditing ? 'Edit Event' : 'Add Event'),
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
                      // Title
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          labelText: 'Title *',
                          prefixIcon: Icon(Icons.title),
                        ),
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
                          alignLabelWithHint: true,
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),

                      // Event Date
                      InkWell(
                        onTap: _pickDate,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Event Date',
                            prefixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            _eventDate != null
                                ? _formatDate(_eventDate!)
                                : 'Select',
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Event Time
                      InkWell(
                        onTap: _pickTime,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Event Time',
                            prefixIcon: Icon(Icons.access_time),
                          ),
                          child: Text(
                            _eventTime != null
                                ? _formatTime(_eventTime!)
                                : 'Select',
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Location
                      TextFormField(
                        controller: _locationController,
                        decoration: const InputDecoration(
                          labelText: 'Location',
                          prefixIcon: Icon(Icons.location_on),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Is Public
                      SwitchListTile(
                        title: const Text('Public Event'),
                        subtitle: const Text(
                            'Make this event visible to everyone'),
                        value: _isPublic,
                        onChanged: (v) => setState(() => _isPublic = v),
                      ),
                      const SizedBox(height: 24),

                      // Submit
                      BlocBuilder<EventBloc, EventState>(
                        builder: (context, state) {
                          final isLoading = state is EventLoading;
                          return FilledButton(
                            onPressed: isLoading ? null : _submit,
                            child: isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : Text(
                                    widget.isEditing ? 'Save' : 'Create'),
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
}
