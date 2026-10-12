import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/match.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../matches/match_detail_screen.dart';

/// Ticket discovery entry point for the mobile mockup.
/// Match details link into the existing ticket reservation flow; this screen
/// never invents ticket prices or pretends to complete a payment.
class MobileTicketingScreen extends StatefulWidget {
  const MobileTicketingScreen({super.key});

  @override
  State<MobileTicketingScreen> createState() => _MobileTicketingScreenState();
}

class _MobileTicketingScreenState extends State<MobileTicketingScreen> {
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
    return Theme(
      data: JsoTheme.paper(),
      child: Scaffold(
        backgroundColor: JsoColors.paper,
        appBar: AppBar(
          title: const Text('Billetterie'),
          backgroundColor: JsoColors.paper,
          foregroundColor: JsoColors.inkText,
        ),
        body: FutureBuilder<List<Match>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const LoadingView(message: 'Chargement des matchs…');
            }
            if (snapshot.hasError) {
              return ErrorView(
                message: 'Impossible de charger les matchs.',
                onRetry: () => setState(_load),
              );
            }
            final matches =
                (snapshot.data ?? const <Match>[])
                    .where(
                      (match) =>
                          match.kickoffAt.isAfter(DateTime.now()) &&
                          match.status.toLowerCase() != 'cancelled',
                    )
                    .toList()
                  ..sort((a, b) => a.kickoffAt.compareTo(b.kickoffAt));
            if (matches.isEmpty) {
              return const EmptyView(
                message: 'Aucune partie à venir pour le moment.',
                icon: Icons.confirmation_number_outlined,
              );
            }
            return RefreshIndicator(
              color: JsoColors.blue,
              onRefresh: () async => setState(_load),
              child: ListView(
                padding: const EdgeInsets.all(JsoSpacing.md),
                children: [
                  Container(
                    padding: const EdgeInsets.all(JsoSpacing.lg),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [JsoColors.navy, Color(0xFF123F91)],
                      ),
                      borderRadius: BorderRadius.circular(JsoRadius.hero),
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.confirmation_number_rounded,
                          color: JsoColors.gold,
                          size: 34,
                        ),
                        SizedBox(width: JsoSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'La prossima partita, dal vivo',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 18,
                                ),
                              ),
                              SizedBox(height: 5),
                              Text(
                                'Scegli un match per vedere i dettagli e le opzioni biglietto disponibili.',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: JsoSpacing.md),
                  for (final match in matches) _MatchTicketCard(match: match),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _MatchTicketCard extends StatelessWidget {
  const _MatchTicketCard({required this.match});
  final Match match;

  @override
  Widget build(BuildContext context) {
    final title = match.isHome
        ? 'JSO — ${match.opponentName}'
        : '${match.opponentName} — JSO';
    return Card(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: JsoSpacing.md),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(JsoRadius.card),
        side: const BorderSide(color: JsoColors.borderLight),
      ),
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 54,
                  height: 62,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF1FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        match.kickoffAt.day.toString().padLeft(2, '0'),
                        style: const TextStyle(
                          color: JsoColors.navy,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        match.kickoffAt.month.toString().padLeft(2, '0'),
                        style: const TextStyle(
                          color: JsoColors.blue,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: JsoSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: JsoColors.inkText,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        JsoFormat.dateTime(match.kickoffAt),
                        style: const TextStyle(
                          color: JsoColors.inkMuted,
                          fontSize: 12,
                        ),
                      ),
                      if (match.venue != null && match.venue!.isNotEmpty)
                        Text(
                          match.venue!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.inkMuted,
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: JsoSpacing.md),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => MatchDetailScreen(matchId: match.id),
                  ),
                ),
                icon: const Icon(Icons.event_seat_rounded),
                label: const Text('Dettagli e biglietti'),
                style: FilledButton.styleFrom(
                  backgroundColor: JsoColors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
