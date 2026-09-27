import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/match_lineup_entry.dart';
import '../../data/models/match_official.dart';
import '../../data/repositories/match_center_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';

/// French label for a match official role.
///
/// Roles are free text in the admin (server default `Referee`), so the usual
/// English values are matched ignoring case, spaces, `_`, `-` and `.`, and an
/// assistant keeps its number ("Assistant 1" → "Arbitre assistant 1").
/// Anything else is shown as entered.
String officialRoleLabel(String role) {
  final key = role.toLowerCase().replaceAll(RegExp(r'[\s_.\-]'), '');
  final assistant = RegExp(
    r'^(?:assistant(?:referee)?|ar|linesman)(\d?)$',
  ).firstMatch(key);
  if (assistant != null) {
    final number = assistant.group(1)!;
    return number.isEmpty ? 'Arbitre assistant' : 'Arbitre assistant $number';
  }
  return switch (key) {
    'referee' || 'mainreferee' || 'centralreferee' => 'Arbitre principal',
    'fourth' || 'fourthofficial' || 'fourthreferee' => 'Quatrième arbitre',
    'var' || 'videoassistantreferee' => 'VAR',
    'avar' || 'assistantvar' => 'Assistant VAR',
    _ => role.trim(),
  };
}

/// "Compos" tab of the match center: the match sheet from
/// `GET /api/matches/{id}/lineup`, split into starters and substitutes, then
/// the officials from `GET /api/matches/{id}/officials`.
///
/// Both calls start together when the tab is first shown and each part keeps
/// its own loading/error/empty state, so one failing never hides the other.
/// The futures live in this State, which is kept alive across tab switches,
/// so nothing is refetched on rebuilds; retry and pull-to-refresh reload
/// explicitly.
class MatchLineupTab extends StatefulWidget {
  const MatchLineupTab({super.key, required this.matchId});

  final String matchId;

  @override
  State<MatchLineupTab> createState() => _MatchLineupTabState();
}

class _MatchLineupTabState extends State<MatchLineupTab>
    with AutomaticKeepAliveClientMixin {
  late Future<List<MatchLineupEntry>> _lineup;
  late Future<List<MatchOfficial>> _officials;

  @override
  bool get wantKeepAlive => true;

  MatchCenterRepository get _repository =>
      context.read<MatchCenterRepository>();

  @override
  void initState() {
    super.initState();
    _lineup = _repository.getLineup(widget.matchId);
    _officials = _repository.getOfficials(widget.matchId);
  }

  void _reloadLineup() {
    setState(() {
      _lineup = _repository.getLineup(widget.matchId);
    });
  }

  void _reloadOfficials() {
    setState(() {
      _officials = _repository.getOfficials(widget.matchId);
    });
  }

  /// Pull-to-refresh: reloads both parts; each one renders its own outcome.
  Future<void> _refresh() async {
    setState(() {
      _lineup = _repository.getLineup(widget.matchId);
      _officials = _repository.getOfficials(widget.matchId);
    });
    await Future.wait<void>([
      _lineup.then<void>((_) {}, onError: (Object _) {}),
      _officials.then<void>((_) {}, onError: (Object _) {}),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    // A non-lazy scroll view keeps both FutureBuilders mounted, so scrolling
    // a long match sheet never resets a section to its loading state.
    return RefreshIndicator(
      color: JsoColors.gold,
      onRefresh: _refresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FutureBuilder<List<MatchLineupEntry>>(
              future: _lineup,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting &&
                    !snapshot.hasData) {
                  return const LoadingView(
                    message: 'Chargement de la composition…',
                  );
                }
                if (snapshot.hasError) {
                  return ErrorView(
                    message:
                        'Impossible de charger la composition.\n'
                        '${describeApiError(snapshot.error!)}',
                    onRetry: _reloadLineup,
                  );
                }
                final entries = snapshot.data ?? const <MatchLineupEntry>[];
                if (entries.isEmpty) {
                  return const EmptyView(
                    message: 'Composition non communiquée.',
                    icon: Icons.groups_outlined,
                  );
                }
                return _LineupSections(entries: entries);
              },
            ),
            const SizedBox(height: JsoSpacing.lg),
            const _SectionTitle('Arbitres'),
            FutureBuilder<List<MatchOfficial>>(
              future: _officials,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting &&
                    !snapshot.hasData) {
                  return const LoadingView(
                    message: 'Chargement des arbitres…',
                  );
                }
                if (snapshot.hasError) {
                  return ErrorView(
                    message:
                        'Impossible de charger les arbitres.\n'
                        '${describeApiError(snapshot.error!)}',
                    onRetry: _reloadOfficials,
                  );
                }
                final officials = snapshot.data ?? const <MatchOfficial>[];
                if (officials.isEmpty) {
                  return const EmptyView(
                    message: 'Arbitres non communiqués.',
                    icon: Icons.sports,
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: officials
                      .map((o) => _OfficialTile(official: o))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Starters then substitutes, in the server order.
class _LineupSections extends StatelessWidget {
  const _LineupSections({required this.entries});

  final List<MatchLineupEntry> entries;

  @override
  Widget build(BuildContext context) {
    final starters = entries.where((e) => !e.isSubstitute).toList();
    final substitutes = entries.where((e) => e.isSubstitute).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (starters.isNotEmpty) ...[
          _SectionTitle('Titulaires', count: starters.length),
          ...starters.map((e) => _PlayerTile(entry: e)),
        ],
        if (starters.isNotEmpty && substitutes.isNotEmpty)
          const SizedBox(height: JsoSpacing.lg),
        if (substitutes.isNotEmpty) ...[
          _SectionTitle('Remplaçants', count: substitutes.length),
          ...substitutes.map((e) => _PlayerTile(entry: e)),
        ],
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {this.count});

  final String title;
  final int? count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: JsoSpacing.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: JsoColors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          if (count != null)
            Text(
              '$count',
              style: const TextStyle(
                color: JsoColors.muted2,
                fontWeight: FontWeight.w700,
              ),
            ),
        ],
      ),
    );
  }
}

class _PlayerTile extends StatelessWidget {
  const _PlayerTile({required this.entry});

  final MatchLineupEntry entry;

  @override
  Widget build(BuildContext context) {
    final number = entry.shirtNumber;
    final position = entry.displayPosition;
    return Card(
      child: ListTile(
        leading: Semantics(
          container: true,
          label: number == null ? null : 'Numéro $number',
          excludeSemantics: true,
          child: CircleAvatar(
            backgroundColor: JsoColors.navy2,
            child: number == null
                ? const Icon(Icons.person_outline, color: JsoColors.muted)
                : Text(
                    '$number',
                    style: const TextStyle(
                      color: JsoColors.gold,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
          ),
        ),
        title: Text(
          entry.fullName,
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: position == null
            ? null
            : Text(position, style: const TextStyle(color: JsoColors.muted)),
        trailing: entry.isCaptain ? const _CaptainBadge() : null,
      ),
    );
  }
}

/// Gold "C" armband, announced as "Capitaine" by screen readers.
class _CaptainBadge extends StatelessWidget {
  const _CaptainBadge();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Capitaine',
      excludeSemantics: true,
      child: Container(
        width: 28,
        height: 28,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: JsoColors.gold,
          shape: BoxShape.circle,
        ),
        child: const Text(
          'C',
          style: TextStyle(
            color: JsoColors.ink,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _OfficialTile extends StatelessWidget {
  const _OfficialTile({required this.official});

  final MatchOfficial official;

  @override
  Widget build(BuildContext context) {
    final role = officialRoleLabel(official.role);
    return Card(
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: JsoColors.navy2,
          child: Icon(Icons.sports, color: JsoColors.gold, size: 20),
        ),
        title: Text(
          official.name,
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: role.isEmpty
            ? null
            : Text(role, style: const TextStyle(color: JsoColors.muted)),
      ),
    );
  }
}
