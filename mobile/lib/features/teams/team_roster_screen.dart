import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/player.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';

/// Team roster: the squad list for a team from
/// `GET /api/teams/{id}/players`. IDs are GUID strings.
class TeamRosterScreen extends StatefulWidget {
  const TeamRosterScreen({
    super.key,
    required this.teamId,
    required this.teamName,
  });

  final String teamId;
  final String teamName;

  @override
  State<TeamRosterScreen> createState() => _TeamRosterScreenState();
}

class _TeamRosterScreenState extends State<TeamRosterScreen> {
  late Future<List<Player>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getTeamPlayers(widget.teamId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.teamName)),
      body: FutureBuilder<List<Player>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading roster…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load the roster.',
              onRetry: () => setState(_load),
            );
          }

          final players = snapshot.data ?? const <Player>[];
          if (players.isEmpty) {
            return const EmptyView(
              message: 'No players in this squad yet.',
              icon: Icons.person_outline,
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
              itemCount: players.length,
              itemBuilder: (context, i) => _PlayerTile(player: players[i]),
            ),
          );
        },
      ),
    );
  }
}

class _PlayerTile extends StatelessWidget {
  const _PlayerTile({required this.player});

  final Player player;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: ClipOval(
          child: SizedBox(
            width: 44,
            height: 44,
            child: RemoteImage(
              url: player.photoUrl,
              width: 44,
              height: 44,
              placeholderIcon: Icons.person_outline,
            ),
          ),
        ),
        title: Text(
          player.fullName,
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: (player.position != null && player.position!.isNotEmpty)
            ? Text(
                player.position!,
                style: const TextStyle(color: JsoColors.muted),
              )
            : null,
        trailing: player.shirtNumber != null
            ? Text(
                '#${player.shirtNumber}',
                style: const TextStyle(
                  color: JsoColors.gold,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              )
            : null,
      ),
    );
  }
}
