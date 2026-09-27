import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/community_program.dart';
import '../../data/repositories/club_content_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';

/// Period line of a programme: "1 avr. 2026 – 30 juin 2026", a single date
/// for a one-day programme, or — without an end date — "Depuis le 1 avr.
/// 2026" ("À partir du …" while it has not started yet at [now]).
///
/// Programme dates are calendar days (the admin form stores them as UTC
/// midnight), so they are formatted from their UTC date to show the same day
/// in every time zone.
String programPeriodLabel(CommunityProgram program, {DateTime? now}) {
  final start = _calendarDay(program.startDate);
  final endDate = program.endDate;
  if (endDate == null) {
    final started = !program.startDate.isAfter(now ?? DateTime.now());
    return started
        ? 'Depuis le ${JsoFormat.date(start)}'
        : 'À partir du ${JsoFormat.date(start)}';
  }
  final end = _calendarDay(endDate);
  if (end == start) return JsoFormat.date(start);
  return '${JsoFormat.date(start)} – ${JsoFormat.date(end)}';
}

/// The UTC calendar day of [value], as a local midnight so [JsoFormat.date]
/// (which formats in local time) prints that same day.
DateTime _calendarDay(DateTime value) {
  final utc = value.toUtc();
  return DateTime(utc.year, utc.month, utc.day);
}

/// "Écoles & partenaires": the published community programmes run with local
/// schools, associations and partner clubs, from
/// `GET /api/community-programs` (ordered by start date).
class CommunityProgramsScreen extends StatefulWidget {
  const CommunityProgramsScreen({super.key});

  @override
  State<CommunityProgramsScreen> createState() =>
      _CommunityProgramsScreenState();
}

class _CommunityProgramsScreenState extends State<CommunityProgramsScreen> {
  late Future<List<CommunityProgram>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<ClubContentRepository>().getCommunityPrograms();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Écoles & partenaires')),
      body: FutureBuilder<List<CommunityProgram>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des programmes…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message:
                  'Impossible de charger les programmes.\n'
                  '${describeApiError(snapshot.error!)}',
              onRetry: () => setState(_load),
            );
          }

          final programs = snapshot.data ?? const <CommunityProgram>[];
          if (programs.isEmpty) {
            return const EmptyView(
              message: 'Aucun programme en cours.',
              icon: Icons.volunteer_activism_outlined,
            );
          }

          final now = DateTime.now();
          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.md,
                vertical: JsoSpacing.sm,
              ),
              itemCount: programs.length,
              itemBuilder: (context, i) =>
                  _ProgramCard(program: programs[i], now: now),
            ),
          );
        },
      ),
    );
  }
}

class _ProgramCard extends StatelessWidget {
  const _ProgramCard({required this.program, required this.now});

  final CommunityProgram program;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              program.title,
              style: const TextStyle(
                color: JsoColors.white,
                fontSize: 17,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            if (program.partnerName.isNotEmpty)
              _IconLine(
                icon: Icons.handshake_outlined,
                text: program.partnerName,
                color: JsoColors.gold,
              ),
            _IconLine(
              icon: Icons.date_range_outlined,
              text: programPeriodLabel(program, now: now),
            ),
            if (program.description.isNotEmpty) ...[
              const SizedBox(height: JsoSpacing.xs),
              Text(
                program.description,
                style: const TextStyle(color: JsoColors.white, height: 1.45),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _IconLine extends StatelessWidget {
  const _IconLine({
    required this.icon,
    required this.text,
    this.color = JsoColors.muted,
  });

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: JsoSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: JsoSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: color, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
