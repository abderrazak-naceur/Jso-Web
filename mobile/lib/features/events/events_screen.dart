import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/club_event.dart';
import '../../data/repositories/club_content_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'event_detail_screen.dart';

/// Splits [events] for the agenda: upcoming events — still to come or in
/// progress at [now], i.e. `(endAt ?? startAt)` after [now] — soonest first,
/// and past events most recent first.
({List<ClubEvent> upcoming, List<ClubEvent> past}) splitClubEvents(
  Iterable<ClubEvent> events, {
  required DateTime now,
}) {
  final upcoming = <ClubEvent>[];
  final past = <ClubEvent>[];
  for (final event in events) {
    (event.isUpcomingAt(now) ? upcoming : past).add(event);
  }
  upcoming.sort((a, b) => a.startAt.compareTo(b.startAt));
  past.sort((a, b) => b.startAt.compareTo(a.startAt));
  return (upcoming: upcoming, past: past);
}

/// "Agenda du club": the published club events from `GET /api/events`
/// (assemblées, entraînements ouverts, fêtes...), split into "À venir" and
/// "Événements passés". Tapping an event opens [EventDetailScreen].
class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  late Future<List<ClubEvent>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<ClubContentRepository>().getEvents();
  }

  void _open(ClubEvent event) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EventDetailScreen(slug: event.slug, initial: event),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Agenda du club')),
      body: FutureBuilder<List<ClubEvent>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement de l\'agenda…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message:
                  'Impossible de charger l\'agenda.\n'
                  '${describeApiError(snapshot.error!)}',
              onRetry: () => setState(_load),
            );
          }

          final events = snapshot.data ?? const <ClubEvent>[];
          if (events.isEmpty) {
            return const EmptyView(
              message: 'Aucun événement programmé pour le moment.',
              icon: Icons.event_outlined,
            );
          }

          final split = splitClubEvents(events, now: DateTime.now());
          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.md,
                vertical: JsoSpacing.sm,
              ),
              children: [
                const _SectionHeader('À venir'),
                if (split.upcoming.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: JsoSpacing.sm),
                    child: Text(
                      'Aucun événement à venir pour le moment.',
                      style: TextStyle(color: JsoColors.muted),
                    ),
                  )
                else
                  for (final event in split.upcoming)
                    _EventCard(event: event, onTap: () => _open(event)),
                if (split.past.isNotEmpty) ...[
                  const _SectionHeader('Événements passés'),
                  for (final event in split.past)
                    _EventCard(
                      event: event,
                      isPast: true,
                      onTap: () => _open(event),
                    ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: JsoSpacing.md, bottom: JsoSpacing.xs),
      child: Semantics(
        header: true,
        child: Text(
          label,
          style: const TextStyle(
            color: JsoColors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

/// An agenda entry: title, date span and optional location. Past events use
/// a muted accent instead of the gold one.
class _EventCard extends StatelessWidget {
  const _EventCard({
    required this.event,
    required this.onTap,
    this.isPast = false,
  });

  final ClubEvent event;
  final VoidCallback onTap;
  final bool isPast;

  @override
  Widget build(BuildContext context) {
    final accent = isPast ? JsoColors.muted : JsoColors.gold;
    final location = event.location;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.md),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: JsoColors.navy2,
                child: Icon(
                  isPast ? Icons.event_available_outlined : Icons.event,
                  color: accent,
                ),
              ),
              const SizedBox(width: JsoSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: JsoSpacing.xs),
                    Text(
                      JsoFormat.dateRange(event.startAt, event.endAt),
                      style: TextStyle(
                        color: accent,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (location != null) ...[
                      const SizedBox(height: JsoSpacing.xs),
                      Row(
                        children: [
                          const Icon(
                            Icons.place_outlined,
                            size: 16,
                            color: JsoColors.muted,
                          ),
                          const SizedBox(width: JsoSpacing.xs),
                          Expanded(
                            child: Text(
                              location,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: JsoColors.muted,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: JsoSpacing.sm),
              const Icon(Icons.chevron_right, color: JsoColors.muted2),
            ],
          ),
        ),
      ),
    );
  }
}
