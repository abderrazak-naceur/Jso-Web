import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/club_event.dart';
import 'package:jso_mobile/features/events/event_detail_screen.dart';
import 'package:jso_mobile/features/events/events_screen.dart';
import 'package:jso_mobile/shared/format.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_club_content.dart';

/// Vertical position of the (single) widget found by [finder].
double _top(WidgetTester tester, Finder finder) => tester.getTopLeft(finder).dy;

void main() {
  group('splitClubEvents', () {
    test('upcoming soonest first, past most recent first', () {
      final now = DateTime.utc(2026, 5, 1, 12);
      ClubEvent at(String id, Duration fromNow, [Duration? length]) {
        final start = now.add(fromNow);
        return ClubSample.event(
          id: id,
          startAt: start,
          endAt: length == null ? null : start.add(length),
        );
      }

      final split = splitClubEvents([
        at('next-week', const Duration(days: 7)),
        at('last-month', const Duration(days: -30), const Duration(hours: 2)),
        at('tomorrow', const Duration(days: 1)),
        // Started 30 minutes ago without an end date: already past.
        at('just-started', const Duration(minutes: -30)),
        // Started an hour ago, ends in two hours: still upcoming.
        at('ongoing', const Duration(hours: -1), const Duration(hours: 3)),
      ], now: now);

      expect(split.upcoming.map((e) => e.id), [
        'ongoing',
        'tomorrow',
        'next-week',
      ]);
      expect(split.past.map((e) => e.id), ['just-started', 'last-month']);
    });
  });

  group('EventsScreen', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      final repo = FakeClubContentRepository(
        events: [ClubSample.event()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventsScreen(),
      );

      expect(find.text('Agenda du club'), findsOneWidget);
      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
      expect(find.byType(LoadingView), findsNothing);
    });

    testWidgets('shows EmptyView when no event is published', (tester) async {
      final repo = FakeClubContentRepository(events: const []);

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventsScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
      expect(
        find.text('Aucun événement programmé pour le moment.'),
        findsOneWidget,
      );
    });

    testWidgets('shows ErrorView and reloads on Réessayer', (tester) async {
      final repo = FakeClubContentRepository(
        events: [
          ClubSample.event(
            startAt: DateTime.now().add(const Duration(days: 1)),
          ),
        ],
        error: const NetworkException(),
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventsScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.textContaining('Connexion impossible'), findsOneWidget);

      repo.error = null;
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsNothing);
      expect(find.text('Assemblée générale'), findsOneWidget);
      expect(repo.calls['getEvents'], 2);
    });

    testWidgets('splits upcoming and past events relative to now', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(800, 1400));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      final now = DateTime.now();
      final tournament = ClubSample.event(
        id: 'soon',
        title: 'Tournoi des jeunes',
        slug: 'tournoi-des-jeunes',
        startAt: now.add(const Duration(days: 2)),
        endAt: now.add(const Duration(days: 2, hours: 3)),
        location: 'Stade de Oudhref',
      );
      final party = ClubSample.event(
        id: 'ongoing',
        title: 'Fête du club',
        slug: 'fete-du-club',
        startAt: now.subtract(const Duration(hours: 1)),
        endAt: now.add(const Duration(hours: 4)),
        location: null,
      );
      final evening = ClubSample.event(
        id: 'recent',
        title: 'Soirée des supporters',
        slug: 'soiree-des-supporters',
        startAt: now.subtract(const Duration(days: 3)),
        location: null,
      );
      final training = ClubSample.event(
        id: 'old',
        title: 'Entraînement ouvert',
        slug: 'entrainement-ouvert',
        startAt: now.subtract(const Duration(days: 30)),
        endAt: now
            .subtract(const Duration(days: 30))
            .add(const Duration(hours: 2)),
        location: null,
      );
      final repo = FakeClubContentRepository(
        events: [training, tournament, evening, party],
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventsScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.text('À venir'), findsOneWidget);
      expect(find.text('Événements passés'), findsOneWidget);

      // Upcoming (in progress first), then the past section, most recent
      // first.
      final order = [
        find.text('À venir'),
        find.text('Fête du club'),
        find.text('Tournoi des jeunes'),
        find.text('Événements passés'),
        find.text('Soirée des supporters'),
        find.text('Entraînement ouvert'),
      ].map((finder) => _top(tester, finder)).toList();
      expect(order, List.of(order)..sort());

      expect(
        find.text(JsoFormat.dateRange(tournament.startAt, tournament.endAt)),
        findsOneWidget,
      );
      expect(find.text('Stade de Oudhref'), findsOneWidget);
      expect(find.byIcon(Icons.place_outlined), findsOneWidget);
    });

    testWidgets('notes when there is nothing upcoming', (tester) async {
      final repo = FakeClubContentRepository(
        events: [
          ClubSample.event(
            title: 'Soirée des supporters',
            startAt: DateTime.now().subtract(const Duration(days: 3)),
          ),
        ],
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventsScreen(),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Aucun événement à venir pour le moment.'),
        findsOneWidget,
      );
      expect(find.text('Événements passés'), findsOneWidget);
      expect(find.text('Soirée des supporters'), findsOneWidget);
    });

    testWidgets('hides the past section when everything is upcoming', (
      tester,
    ) async {
      final repo = FakeClubContentRepository(
        events: [
          ClubSample.event(
            startAt: DateTime.now().add(const Duration(days: 5)),
          ),
        ],
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventsScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.text('À venir'), findsOneWidget);
      expect(find.text('Événements passés'), findsNothing);
    });

    testWidgets('tapping an event opens its detail by slug', (tester) async {
      final event = ClubSample.event(
        title: 'Tournoi des jeunes',
        slug: 'tournoi-des-jeunes',
        startAt: DateTime.now().add(const Duration(days: 2)),
      );
      final repo = FakeClubContentRepository(events: [event]);

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventsScreen(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Tournoi des jeunes'));
      await tester.pumpAndSettle();

      expect(find.byType(EventDetailScreen), findsOneWidget);
      expect(find.text('Événement'), findsOneWidget);
      expect(find.text('Tournoi des jeunes'), findsOneWidget);
      expect(repo.requestedSlugs, ['tournoi-des-jeunes']);
    });
  });

  group('EventDetailScreen', () {
    testWidgets('shows the initial event at once, then the full description', (
      tester,
    ) async {
      final initial = ClubSample.event(description: 'Résumé court.');
      final full = ClubSample.event(
        description:
            'Accueil à 17 h, bilan moral et financier, puis vote du budget.',
      );
      final repo = FakeClubContentRepository(
        event: full,
        delay: const Duration(milliseconds: 50),
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: EventDetailScreen(slug: initial.slug, initial: initial),
      );

      expect(find.byType(LoadingView), findsNothing);
      expect(find.text('Assemblée générale'), findsOneWidget);
      expect(find.text('Résumé court.'), findsOneWidget);
      expect(find.text('Salle omnisports de Oudhref'), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();

      expect(find.text(full.description!), findsOneWidget);
      expect(find.text('Résumé court.'), findsNothing);
      expect(find.byType(LinearProgressIndicator), findsNothing);
      expect(repo.requestedSlugs, [initial.slug]);
    });

    testWidgets('loads by slug when opened without initial data', (
      tester,
    ) async {
      final repo = FakeClubContentRepository(
        events: [ClubSample.event()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventDetailScreen(slug: 'assemblee-generale'),
      );

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();

      expect(find.text('Assemblée générale'), findsOneWidget);
      expect(
        find.text('Bilan de la saison et élection du bureau.'),
        findsOneWidget,
      );
    });

    testWidgets('shows the unavailable message on 404', (tester) async {
      final repo = FakeClubContentRepository(
        eventError: const NotFoundException(),
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: EventDetailScreen(
          slug: 'soiree-annulee',
          initial: ClubSample.event(title: 'Soirée annulée'),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Cet événement n\'est plus disponible.'),
        findsOneWidget,
      );
      expect(find.text('Soirée annulée'), findsNothing);
      expect(find.text('Réessayer'), findsNothing);
    });

    testWidgets('keeps the initial event with a retry banner on failure', (
      tester,
    ) async {
      final repo = FakeClubContentRepository(
        events: [ClubSample.event()],
        eventError: const NetworkException(),
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: EventDetailScreen(
          slug: 'assemblee-generale',
          initial: ClubSample.event(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsNothing);
      expect(find.text('Assemblée générale'), findsOneWidget);
      expect(
        find.text('Connexion impossible. Vérifiez votre réseau.'),
        findsOneWidget,
      );

      repo.eventError = null;
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();

      expect(find.text('Réessayer'), findsNothing);
      expect(repo.calls['getEvent'], 2);
    });

    testWidgets('shows ErrorView without initial data on failure', (
      tester,
    ) async {
      final repo = FakeClubContentRepository(
        error: const ApiTimeoutException(),
      );

      await pumpClubScreen(
        tester,
        repository: repo,
        child: const EventDetailScreen(slug: 'assemblee-generale'),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Réessayer'), findsOneWidget);
      expect(
        find.textContaining('Le serveur met trop de temps à répondre.'),
        findsOneWidget,
      );
    });
  });
}
