import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/core/config/jso_theme.dart';
import 'package:jso_mobile/features/home/home_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

void main() {
  group('HomeScreen', () {
    testWidgets('affiche le chargement en français', (tester) async {
      final repo = FakeRepository(
        homeData: Sample.home(),
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(tester, repository: repo, child: const HomeScreen());

      expect(find.byType(LoadingView), findsOneWidget);
      expect(find.text('Chargement de l’accueil…'), findsOneWidget);
      expect(find.text('Bonjour,'), findsOneWidget);

      await tester.pumpAndSettle();
    });

    testWidgets('affiche les données réelles et appelle Voir tout', (
      tester,
    ) async {
      var viewAllCalls = 0;
      final repo = FakeRepository(homeData: Sample.home());

      await pumpScreen(
        tester,
        repository: repo,
        child: HomeScreen(onViewAllNews: () => viewAllCalls++),
      );
      await tester.pumpAndSettle();

      expect(find.text('Bonjour,'), findsOneWidget);
      expect(find.text('supporters'), findsOneWidget);
      expect(find.text('Plus qu’un club, une famille 💛'), findsOneWidget);
      expect(find.text('Prochain match'), findsOneWidget);
      expect(find.text('Match officiel'), findsOneWidget);
      expect(find.text('JSO'), findsWidgets);
      expect(find.text('CS Sfaxien'), findsWidgets);
      expect(find.text('Stade de Oudhref'), findsOneWidget);
      expect(find.byType(EmptyView), findsNothing);

      // Scroll the vertical home list explicitly (the carousel adds a
      // horizontal PageView Scrollable, so target the list's Scrollable by key).
      // The list itself is the first Scrollable under its key; the carousel's
      // horizontal PageView is a nested Scrollable, so take the outer one.
      final homeList = find
          .descendant(
            of: find.byKey(const PageStorageKey<String>('home-scroll-view')),
            matching: find.byType(Scrollable),
          )
          .first;
      await tester.scrollUntilVisible(
        find.text('Actualités'),
        180,
        scrollable: homeList,
      );
      expect(find.text('Actualités'), findsOneWidget);
      // The lead article now also appears in the "À la une" carousel, so its
      // title can be present more than once (carousel card + featured card).
      expect(find.text('Victoire à domicile'), findsWidgets);
      expect(find.text('Voir tout'), findsOneWidget);

      await tester.ensureVisible(find.text('Voir tout'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Voir tout'));
      expect(viewAllCalls, 1);

      await tester.scrollUntilVisible(
        find.text('Derniers résultats'),
        180,
        scrollable: homeList,
      );
      expect(find.text('Derniers résultats'), findsOneWidget);
      expect(find.text('hero.title'), findsNothing);

      // The header greeting may be scrolled off-screen after paging down, so
      // read the applied theme from a widget that is always mounted.
      final themedContext = tester.element(find.byType(Scaffold).first);
      expect(Theme.of(themedContext).brightness, Brightness.light);
      expect(Theme.of(themedContext).scaffoldBackgroundColor, JsoColors.paper);
    });

    testWidgets('masque Voir tout sans callback', (tester) async {
      final repo = FakeRepository(homeData: Sample.home());

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.text('Actualités'), findsOneWidget);
      expect(find.text('Voir tout'), findsNothing);
    });

    testWidgets('affiche uniquement les valeurs du contenu À propos', (
      tester,
    ) async {
      final repo = FakeRepository(homeData: Sample.homeContentOnly());

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsNothing);
      expect(find.text('À propos du club'), findsOneWidget);
      expect(find.text('JSO is the pride of Oudhref.'), findsOneWidget);
      expect(find.text('about'), findsNothing);
    });

    testWidgets('affiche EmptyView lorsque le payload est vide', (
      tester,
    ) async {
      final repo = FakeRepository(homeData: Sample.home(populated: false));

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
      expect(
        find.text('Aucun contenu disponible pour le moment.'),
        findsOneWidget,
      );
    });

    testWidgets('affiche ErrorView avec Réessayer en cas d’échec', (
      tester,
    ) async {
      final repo = FakeRepository(error: const NetworkException());

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Impossible de charger l’accueil.'), findsOneWidget);
      expect(find.text('Réessayer'), findsOneWidget);
    });

    testWidgets('expose le compte et les notifications', (tester) async {
      final repo = FakeRepository(homeData: Sample.home(populated: false));

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.byTooltip('Mon compte'), findsOneWidget);
      expect(find.byTooltip('Notifications'), findsOneWidget);

      final accountButton = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.person_outline_rounded),
      );
      final notificationButton = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.notifications_none_rounded),
      );
      expect(accountButton.onPressed, isNotNull);
      // The bell now opens the in-app notifications centre.
      expect(notificationButton.onPressed, isNotNull);
      // No fake unread badge: there is no push backend yet.
      expect(find.byType(Badge), findsNothing);
    });

    testWidgets('ne déborde pas sur un écran de 320 pixels', (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 700));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final repo = FakeRepository(homeData: Sample.home());

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);

      await tester.drag(find.byType(Scrollable).first, const Offset(0, -700));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text('Actualités'), findsOneWidget);
    });
  });
}
