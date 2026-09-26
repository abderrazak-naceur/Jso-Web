import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/team.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/jso_crest.dart';
import '../../shared/widgets/loading_view.dart';
import 'team_roster_screen.dart';

/// Teams list: the squads from `GET /api/teams`; tapping a team opens its
/// roster from `GET /api/teams/{id}/players`.
class TeamsScreen extends StatefulWidget {
  const TeamsScreen({super.key});

  @override
  State<TeamsScreen> createState() => _TeamsScreenState();
}

class _TeamsScreenState extends State<TeamsScreen> {
  late Future<List<Team>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getTeams();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Teams')),
      body: FutureBuilder<List<Team>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading teams…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load teams.',
              onRetry: () => setState(_load),
            );
          }

          final teams = snapshot.data ?? const <Team>[];
          if (teams.isEmpty) {
            return const EmptyView(
              message: 'No teams available yet.',
              icon: Icons.groups_outlined,
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
              itemCount: teams.length,
              itemBuilder: (context, i) => _TeamTile(team: teams[i]),
            ),
          );
        },
      ),
    );
  }
}

class _TeamTile extends StatelessWidget {
  const _TeamTile({required this.team});

  final Team team;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) =>
                TeamRosterScreen(teamId: team.id, teamName: team.name),
          ),
        ),
        leading: const JsoCrest(size: 40),
        title: Text(
          team.name,
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Text(
          team.category,
          style: const TextStyle(color: JsoColors.muted),
        ),
        trailing: Text(
          '${team.playersCount} players',
          style: const TextStyle(
            color: JsoColors.gold,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
