import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/error_text.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/match.dart';
import '../../data/models/match_stat.dart';
import '../../data/repositories/match_center_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';

/// "Stats" tab of the match center: one row per team statistic from
/// `GET /api/matches/{id}/stats`.
///
/// Columns follow the fixture: the home side on the left (JSO for a home
/// match, the opponent otherwise), the away side on the right. Each row shows
/// both values ("–" when missing) above a bar splitting their total, JSO in
/// gold and the opponent in blue. The future lives in this State, which is
/// kept alive across tab switches; retry and pull-to-refresh reload it.
class MatchStatsTab extends StatefulWidget {
  const MatchStatsTab({super.key, required this.matchId, required this.match});

  final String matchId;
  final Match match;

  @override
  State<MatchStatsTab> createState() => _MatchStatsTabState();
}

class _MatchStatsTabState extends State<MatchStatsTab>
    with AutomaticKeepAliveClientMixin {
  late Future<List<MatchStat>> _stats;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _stats = _fetch();
  }

  Future<List<MatchStat>> _fetch() =>
      context.read<MatchCenterRepository>().getStats(widget.matchId);

  void _reload() {
    setState(() {
      _stats = _fetch();
    });
  }

  Future<void> _refresh() {
    _reload();
    return _stats.then<void>((_) {}, onError: (Object _) {});
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return FutureBuilder<List<MatchStat>>(
      future: _stats,
      builder: (context, snapshot) {
        // Keep the current rows on screen during a pull-to-refresh.
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const LoadingView(message: 'Chargement des statistiques…');
        }
        if (snapshot.hasError) {
          return ErrorView(
            message:
                'Impossible de charger les statistiques.\n'
                '${describeApiError(snapshot.error!)}',
            onRetry: _reload,
          );
        }

        final stats = snapshot.data ?? const <MatchStat>[];
        final sides = _Sides.of(widget.match);
        return RefreshIndicator(
          color: JsoColors.gold,
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(JsoSpacing.md),
            children: stats.isEmpty
                ? const [
                    EmptyView(
                      message: 'Statistiques non disponibles.',
                      icon: Icons.bar_chart,
                    ),
                  ]
                : [
                    _SidesHeader(sides: sides),
                    ...stats.map((s) => _StatRow(stat: s, sides: sides)),
                  ],
          ),
        );
      },
    );
  }
}

/// Names and colours of the fixture's home (left) and away (right) sides.
class _Sides {
  _Sides.of(Match match)
    : home = match.isHome ? 'JSO' : match.opponentName,
      away = match.isHome ? match.opponentName : 'JSO',
      homeColor = match.isHome ? JsoColors.gold : JsoColors.blue,
      awayColor = match.isHome ? JsoColors.blue : JsoColors.gold;

  final String home;
  final String away;
  final Color homeColor;
  final Color awayColor;
}

class _SidesHeader extends StatelessWidget {
  const _SidesHeader({required this.sides});

  final _Sides sides;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: JsoSpacing.sm,
        vertical: JsoSpacing.xs,
      ),
      child: Row(
        children: [
          Expanded(
            child: _SideLabel(name: sides.home, color: sides.homeColor),
          ),
          const SizedBox(width: JsoSpacing.md),
          Expanded(
            child: _SideLabel(
              name: sides.away,
              color: sides.awayColor,
              alignEnd: true,
            ),
          ),
        ],
      ),
    );
  }
}

class _SideLabel extends StatelessWidget {
  const _SideLabel({
    required this.name,
    required this.color,
    this.alignEnd = false,
  });

  final String name;
  final Color color;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    final dot = Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
    final label = Flexible(
      child: Text(
        name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: alignEnd ? TextAlign.end : TextAlign.start,
        style: const TextStyle(
          color: JsoColors.white,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
    const gap = SizedBox(width: JsoSpacing.sm);
    return Row(
      mainAxisAlignment: alignEnd
          ? MainAxisAlignment.end
          : MainAxisAlignment.start,
      children: alignEnd ? [label, gap, dot] : [dot, gap, label],
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({required this.stat, required this.sides});

  final MatchStat stat;
  final _Sides sides;

  static String _shown(int? value) => value?.toString() ?? '–';

  static String _spoken(int? value) => value?.toString() ?? 'non communiqué';

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      excludeSemantics: true,
      label:
          '${stat.name} : ${sides.home} ${_spoken(stat.homeValue)}, '
          '${sides.away} ${_spoken(stat.awayValue)}',
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.md),
          child: Column(
            children: [
              Row(
                children: [
                  SizedBox(
                    width: 56,
                    child: Text(
                      _shown(stat.homeValue),
                      style: TextStyle(
                        color: sides.homeColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      stat.name,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: JsoColors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 56,
                    child: Text(
                      _shown(stat.awayValue),
                      textAlign: TextAlign.end,
                      style: TextStyle(
                        color: sides.awayColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: JsoSpacing.sm),
              _StatBar(
                homeShare: stat.homeShare,
                homeColor: sides.homeColor,
                awayColor: sides.awayColor,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bar splitting a statistic's total between the two sides; a plain neutral
/// track when there is nothing to compare.
class _StatBar extends StatelessWidget {
  const _StatBar({
    required this.homeShare,
    required this.homeColor,
    required this.awayColor,
  });

  final double? homeShare;
  final Color homeColor;
  final Color awayColor;

  @override
  Widget build(BuildContext context) {
    final share = homeShare;
    return ClipRRect(
      borderRadius: BorderRadius.circular(JsoRadius.pill),
      child: SizedBox(
        height: 6,
        width: double.infinity,
        child: ColoredBox(
          color: share == null ? JsoColors.navy2 : awayColor,
          child: share == null
              ? null
              : Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: FractionallySizedBox(
                    widthFactor: share,
                    heightFactor: 1,
                    child: ColoredBox(color: homeColor),
                  ),
                ),
        ),
      ),
    );
  }
}
