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
      appBar: AppBar(title: const Text('Équipes')),
      body: FutureBuilder<List<Team>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des équipes…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Impossible de charger les équipes.',
              onRetry: () => setState(_load),
            );
          }

          final teams = snapshot.data ?? const <Team>[];
          if (teams.isEmpty) {
            return const EmptyView(
              message: 'Aucune équipe pour le moment.',
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
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) =>
                TeamRosterScreen(teamId: team.id, teamName: team.name),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.md),
          child: Row(
            children: [
              // Crest on a brand gradient medallion, for a stronger identity.
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [JsoColors.navy3, JsoColors.navy],
                  ),
                  border: Border.all(color: JsoColors.gold, width: 1.5),
                ),
                child: const Center(child: JsoCrest(size: 34)),
              ),
              const SizedBox(width: JsoSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      team.name,
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      team.category,
                      style: const TextStyle(color: JsoColors.muted),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: JsoSpacing.sm),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: JsoColors.gold,
                  borderRadius: BorderRadius.circular(JsoRadius.pill),
                ),
                child: Text(
                  '${team.playersCount}',
                  style: const TextStyle(
                    color: JsoColors.navy,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
