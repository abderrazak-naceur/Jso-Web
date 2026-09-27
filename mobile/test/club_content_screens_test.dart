import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/core/config/api_config.dart';
import 'package:jso_mobile/features/archive/archive_screen.dart';
import 'package:jso_mobile/features/community/community_programs_screen.dart';
import 'package:jso_mobile/features/documents/documents_screen.dart';
import 'package:jso_mobile/features/faq/faq_screen.dart';
import 'package:jso_mobile/shared/format.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';
import 'package:jso_mobile/shared/widgets/remote_image.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';

import 'support/fake_club_content.dart';
import 'support/fake_url_launcher.dart';

/// Vertical position of the (single) widget found by [finder].
double _top(WidgetTester tester, Finder finder) => tester.getTopLeft(finder).dy;

Finder _chip(String label) => find.widgetWithText(ChoiceChip, label);

/// LOADING / EMPTY / ERROR checks shared by the four list screens.
void _stateTests({
  required String screen,
  required Widget child,
  required FakeClubContentRepository Function({
    bool populated,
    Duration? delay,
    ApiException? error,
  })
  repository,
  required String emptyMessage,
}) {
  group('$screen states', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      await pumpClubScreen(
        tester,
        repository: repository(delay: const Duration(milliseconds: 50)),
        child: child,
      );

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
      expect(find.byType(LoadingView), findsNothing);
    });

    testWidgets('shows EmptyView when nothing is published', (tester) async {
      await pumpClubScreen(
        tester,
        repository: repository(populated: false),
        child: child,
      );
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
      expect(find.text(emptyMessage), findsOneWidget);
    });

    testWidgets('shows ErrorView and reloads on Réessayer', (tester) async {
      final repo = repository(error: const NetworkException());

      await pumpClubScreen(tester, repository: repo, child: child);
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.textContaining('Connexion impossible'), findsOneWidget);

      repo.error = null;
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsNothing);
      expect(find.byType(EmptyView), findsNothing);
    });
  });
}

void main() {
  _stateTests(
    screen: 'DocumentsScreen',
    child: const DocumentsScreen(),
    emptyMessage: 'Aucun document publié.',
    repository: ({populated = true, delay, error}) => FakeClubContentRepository(
      documents: populated ? [ClubSample.document()] : const [],
      delay: delay,
      error: error,
    ),
  );
  _stateTests(
    screen: 'FaqScreen',
    child: const FaqScreen(),
    emptyMessage: 'Aucune question pour le moment.',
    repository: ({populated = true, delay, error}) => FakeClubContentRepository(
      faq: populated ? [ClubSample.faq()] : const [],
      delay: delay,
      error: error,
    ),
  );
  _stateTests(
    screen: 'ArchiveScreen',
    child: const ArchiveScreen(),
    emptyMessage: 'Les archives arrivent bientôt.',
    repository: ({populated = true, delay, error}) => FakeClubContentRepository(
      archive: populated ? [ClubSample.archiveItem()] : const [],
      delay: delay,
      error: error,
    ),
  );
  _stateTests(
    screen: 'CommunityProgramsScreen',
    child: const CommunityProgramsScreen(),
    emptyMessage: 'Aucun programme en cours.',
    repository: ({populated = true, delay, error}) => FakeClubContentRepository(
      programs: populated ? [ClubSample.program()] : const [],
      delay: delay,
      error: error,
    ),
  );

  group('DocumentsScreen', () {
    final createdAt = DateTime.utc(2026, 3, 2, 9, 30);
    final documents = [
      ClubSample.document(
        id: 'd1',
        title: 'Règlement intérieur 2026',
        category: 'Règlement',
        fileUrl: '/uploads/documents/reglement-interieur-2026.pdf',
        createdAt: createdAt,
      ),
      ClubSample.document(
        id: 'd2',
        title: 'Affiche du tournoi',
        category: 'Communiqué',
        fileUrl: 'https://cdn.jso.example.tn/affiche-tournoi.jpg',
        createdAt: createdAt,
      ),
      ClubSample.document(
        id: 'd3',
        title: 'Fiche d\'inscription',
        category: null,
        fileUrl: '/uploads/documents/inscription.docx',
        createdAt: createdAt,
      ),
    ];

    testWidgets('lists documents with a kind icon and "category · date"', (
      tester,
    ) async {
      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(documents: documents),
        child: const DocumentsScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.text('Documents'), findsOneWidget);
      expect(find.text('Règlement intérieur 2026'), findsOneWidget);
      expect(
        find.text('Règlement · ${JsoFormat.date(createdAt)}'),
        findsOneWidget,
      );
      expect(
        find.text('Communiqué · ${JsoFormat.date(createdAt)}'),
        findsOneWidget,
      );
      // No category: the date alone.
      expect(find.text(JsoFormat.date(createdAt)), findsOneWidget);
      expect(find.byIcon(Icons.picture_as_pdf_outlined), findsOneWidget);
      expect(find.byIcon(Icons.image_outlined), findsOneWidget);
      expect(find.byIcon(Icons.insert_drive_file_outlined), findsOneWidget);
    });

    testWidgets('filters by category chip', (tester) async {
      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(documents: documents),
        child: const DocumentsScreen(),
      );
      await tester.pumpAndSettle();

      expect(_chip('Tous'), findsOneWidget);
      expect(_chip('Communiqué'), findsOneWidget);
      expect(_chip('Règlement'), findsOneWidget);
      expect(tester.widget<ChoiceChip>(_chip('Tous')).selected, isTrue);

      await tester.tap(_chip('Règlement'));
      await tester.pumpAndSettle();

      expect(tester.widget<ChoiceChip>(_chip('Règlement')).selected, isTrue);
      expect(find.text('Règlement intérieur 2026'), findsOneWidget);
      expect(find.text('Affiche du tournoi'), findsNothing);
      expect(find.text('Fiche d\'inscription'), findsNothing);

      await tester.tap(_chip('Tous'));
      await tester.pumpAndSettle();

      expect(find.text('Affiche du tournoi'), findsOneWidget);
      expect(find.text('Fiche d\'inscription'), findsOneWidget);
    });

    testWidgets('opens the resolved URL in an external application', (
      tester,
    ) async {
      final launcher = installUrlLauncher(SucceedingUrlLauncher());

      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(documents: documents),
        child: const DocumentsScreen(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Règlement intérieur 2026'));
      await tester.pump();
      await tester.pump();

      final expected = ApiConfig.resolveUrl(
        '/uploads/documents/reglement-interieur-2026.pdf',
      );
      expect(expected, startsWith('http'));
      expect(launcher.launchedUrls, [expected]);
      expect(launcher.modes, [PreferredLaunchMode.externalApplication]);
      expect(find.text('Impossible d\'ouvrir le document.'), findsNothing);
    });

    testWidgets('shows the failure snackbar when launching throws', (
      tester,
    ) async {
      final launcher = installUrlLauncher(FakeUrlLauncher(throwOnLaunch: true));

      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(documents: documents),
        child: const DocumentsScreen(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Affiche du tournoi'));
      await tester.pump(); // let the async handler run
      await tester.pump(); // let the SnackBar animate in

      expect(launcher.launchedUrls, [
        'https://cdn.jso.example.tn/affiche-tournoi.jpg',
      ]);
      expect(find.text('Impossible d\'ouvrir le document.'), findsOneWidget);
    });

    testWidgets('shows the failure snackbar when launching returns false', (
      tester,
    ) async {
      final launcher = installUrlLauncher(
        FakeUrlLauncher(throwOnLaunch: false),
      );

      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(documents: documents),
        child: const DocumentsScreen(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Fiche d\'inscription'));
      await tester.pump();
      await tester.pump();

      expect(launcher.launchedUrls, hasLength(1));
      expect(find.text('Impossible d\'ouvrir le document.'), findsOneWidget);
    });

    testWidgets('never launches a non-http(s) URL', (tester) async {
      final launcher = installUrlLauncher(SucceedingUrlLauncher());

      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(
          documents: [
            ClubSample.document(
              title: 'Lien piégé',
              fileUrl: 'javascript:alert(1)',
            ),
          ],
        ),
        child: const DocumentsScreen(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Lien piégé'));
      await tester.pump();
      await tester.pump();

      expect(launcher.launchedUrls, isEmpty);
      expect(find.text('Impossible d\'ouvrir le document.'), findsOneWidget);
    });
  });

  group('FaqScreen', () {
    final entries = [
      ClubSample.faq(
        id: 'f1',
        question: 'Comment acheter un billet ?',
        answer: 'Rendez-vous dans la billetterie de l\'application.',
        category: 'Billetterie',
      ),
      ClubSample.faq(
        id: 'f2',
        question: 'Comment adhérer au club ?',
        answer: 'Remplissez la fiche d\'adhésion au secrétariat.',
        category: 'Adhésion',
      ),
      ClubSample.faq(
        id: 'f3',
        question: 'Où se trouve le stade ?',
        answer: 'Route de Gabès, Oudhref.',
        category: null,
      ),
    ];

    testWidgets('expands a question to reveal its answer', (tester) async {
      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(faq: entries),
        child: const FaqScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.text('Questions fréquentes'), findsOneWidget);
      expect(find.byType(ExpansionTile), findsNWidgets(3));
      expect(find.text('Route de Gabès, Oudhref.'), findsNothing);

      await tester.tap(find.text('Où se trouve le stade ?'));
      await tester.pumpAndSettle();

      expect(find.text('Route de Gabès, Oudhref.'), findsOneWidget);
    });

    testWidgets('filters questions by category chip', (tester) async {
      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(faq: entries),
        child: const FaqScreen(),
      );
      await tester.pumpAndSettle();

      expect(_chip('Tous'), findsOneWidget);
      expect(_chip('Adhésion'), findsOneWidget);
      expect(_chip('Billetterie'), findsOneWidget);
      // Chips are sorted alphabetically.
      expect(
        tester.getTopLeft(_chip('Adhésion')).dx,
        lessThan(tester.getTopLeft(_chip('Billetterie')).dx),
      );

      await tester.tap(_chip('Billetterie'));
      await tester.pumpAndSettle();

      expect(find.text('Comment acheter un billet ?'), findsOneWidget);
      expect(find.text('Comment adhérer au club ?'), findsNothing);
      expect(find.text('Où se trouve le stade ?'), findsNothing);

      await tester.tap(_chip('Tous'));
      await tester.pumpAndSettle();

      expect(find.byType(ExpansionTile), findsNWidgets(3));
    });

    testWidgets('hides the chips when no entry has a category', (tester) async {
      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(
          faq: [ClubSample.faq(category: null)],
        ),
        child: const FaqScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ChoiceChip), findsNothing);
      expect(find.text('Comment acheter un billet ?'), findsOneWidget);
    });
  });

  group('ArchiveScreen', () {
    final items = [
      ClubSample.archiveItem(
        id: 'undated',
        year: null,
        category: 'Milestone',
        title: 'Les couleurs du club',
        body: 'Pourquoi le bleu et l\'or ?',
      ),
      ClubSample.archiveItem(
        id: 'cup',
        year: 2019,
        category: 'Trophy',
        title: 'Coupe régionale 2019',
        mediaUrl: '/uploads/media/2019/05/coupe.jpg',
      ),
      ClubSample.archiveItem(
        id: 'team-photo',
        year: 2019,
        category: 'Photo',
        title: 'Photo officielle 2019',
        body: 'L\'effectif au complet avant la finale.',
        displayOrder: 1,
      ),
      ClubSample.archiveItem(
        id: 'season',
        year: 2008,
        category: 'Season',
        title: 'Saison 2007-2008',
        body: 'Montée historique en Ligue 2.',
      ),
    ];

    testWidgets('groups items under year headers, undated first', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(800, 1800));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(archive: items),
        child: const ArchiveScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.text('Musée du club'), findsOneWidget);
      final order = [
        find.text('Sans date'),
        find.text('Les couleurs du club'),
        find.text('2019'),
        find.text('Coupe régionale 2019'),
        find.text('Photo officielle 2019'),
        find.text('2008'),
        find.text('Saison 2007-2008'),
      ].map((finder) => _top(tester, finder)).toList();
      expect(order, List.of(order)..sort());

      expect(find.text('Montée historique en Ligue 2.'), findsOneWidget);
      expect(find.text('TROPHÉE'), findsOneWidget);
      expect(find.byType(RemoteImage), findsOneWidget);
    });

    testWidgets('filters by category with French labels', (tester) async {
      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(archive: items),
        child: const ArchiveScreen(),
      );
      await tester.pumpAndSettle();

      for (final label in ['Tous', 'Jalon', 'Photo', 'Saison', 'Trophée']) {
        expect(_chip(label), findsOneWidget, reason: label);
      }
      expect(_chip('Trophy'), findsNothing);

      await tester.tap(_chip('Trophée'));
      await tester.pumpAndSettle();

      expect(find.text('Coupe régionale 2019'), findsOneWidget);
      expect(find.text('2019'), findsOneWidget);
      expect(find.text('Photo officielle 2019'), findsNothing);
      expect(find.text('Sans date'), findsNothing);
      expect(find.text('2008'), findsNothing);
    });

    test('groupArchiveByYear keeps the API order inside a year', () {
      final groups = groupArchiveByYear([
        ClubSample.archiveItem(id: 'a', year: 2008),
        ClubSample.archiveItem(id: 'b', year: 2019),
        ClubSample.archiveItem(id: 'c', year: null),
        ClubSample.archiveItem(id: 'd', year: 2019),
      ]);

      expect(groups.map((g) => g.year), [null, 2019, 2008]);
      expect(groups[1].items.map((i) => i.id), ['b', 'd']);
    });
  });

  group('CommunityProgramsScreen', () {
    testWidgets('shows title, partner, period and description', (tester) async {
      await pumpClubScreen(
        tester,
        repository: FakeClubContentRepository(
          programs: [
            ClubSample.program(
              id: 'p1',
              title: 'Cycle foot à l\'école',
              partnerName: 'École primaire de Oudhref',
              description: 'Séances d\'initiation chaque mercredi.',
              startDate: DateTime.utc(2026, 4, 1),
              endDate: DateTime.utc(2026, 6, 30),
            ),
            ClubSample.program(
              id: 'p2',
              title: 'Tournoi de quartier',
              partnerName: 'Association Jeunesse d\'Oudhref',
              description: '',
              startDate: DateTime.utc(2025, 9, 15),
            ),
          ],
        ),
        child: const CommunityProgramsScreen(),
      );
      await tester.pumpAndSettle();

      expect(find.text('Écoles & partenaires'), findsOneWidget);
      expect(find.text('Cycle foot à l\'école'), findsOneWidget);
      expect(find.text('École primaire de Oudhref'), findsOneWidget);
      expect(find.text('Association Jeunesse d\'Oudhref'), findsOneWidget);
      expect(find.byIcon(Icons.handshake_outlined), findsNWidgets(2));
      expect(find.text('1 avr. 2026 – 30 juin 2026'), findsOneWidget);
      expect(find.text('Depuis le 15 sept. 2025'), findsOneWidget);
      expect(
        find.text('Séances d\'initiation chaque mercredi.'),
        findsOneWidget,
      );
    });
  });

  group('programPeriodLabel', () {
    final now = DateTime.utc(2026, 5, 10);

    test('formats a range from the calendar days', () {
      final program = ClubSample.program(
        startDate: DateTime.utc(2026, 4, 1),
        endDate: DateTime.utc(2026, 6, 30),
      );

      expect(
        programPeriodLabel(program, now: now),
        '1 avr. 2026 – 30 juin 2026',
      );
    });

    test('shows a single date for a one-day programme', () {
      final program = ClubSample.program(
        startDate: DateTime.utc(2026, 5, 16),
        endDate: DateTime.utc(2026, 5, 16),
      );

      expect(programPeriodLabel(program, now: now), '16 mai 2026');
    });

    test('uses "Depuis le" once an open-ended programme has started', () {
      final program = ClubSample.program(startDate: DateTime.utc(2026, 4, 1));

      expect(programPeriodLabel(program, now: now), 'Depuis le 1 avr. 2026');
    });

    test('uses "À partir du" before an open-ended programme starts', () {
      final program = ClubSample.program(startDate: DateTime.utc(2026, 9, 1));

      expect(programPeriodLabel(program, now: now), 'À partir du 1 sept. 2026');
    });
  });
}
