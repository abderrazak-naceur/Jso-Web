import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/match.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'match_detail_screen.dart';

/// Match Center tab: the fixtures/results list from `GET /api/matches`.
class MatchesScreen extends StatefulWidget {
  const MatchesScreen({super.key});

  @override
  State<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends State<MatchesScreen> {
  late Future<List<Match>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getMatches();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Match Center')),
      body: FutureBuilder<List<Match>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading matches…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load matches.',
              onRetry: () => setState(_load),
            );
          }

          final matches = snapshot.data ?? const <Match>[];
          if (matches.isEmpty) {
            return const EmptyView(
              message: 'No matches scheduled yet.',
              icon: Icons.sports_soccer_outlined,
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.md,
                vertical: JsoSpacing.sm,
              ),
              itemCount: matches.length,
              itemBuilder: (context, i) => _MatchTile(match: matches[i]),
            ),
          );
        },
      ),
    );
  }
}

class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match});

  final Match match;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => MatchDetailScreen(matchId: match.id),
          ),
        ),
        title: Text(
          JsoFormat.fixture(match),
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: JsoSpacing.xs),
            Text(
              JsoFormat.dateTime(match.kickoffAt),
              style: const TextStyle(color: JsoColors.muted),
            ),
            if (match.venue != null && match.venue!.isNotEmpty)
              Text(
                '${JsoFormat.homeAway(match)} · ${match.venue}',
                style: const TextStyle(color: JsoColors.muted2),
              )
            else
              Text(
                JsoFormat.homeAway(match),
                style: const TextStyle(color: JsoColors.muted2),
              ),
          ],
        ),
        trailing: Text(
          JsoFormat.scoreOrStatus(match),
          style: const TextStyle(
            color: JsoColors.gold,
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}
