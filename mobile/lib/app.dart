import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/config/jso_theme.dart';
import 'data/repositories/club_content_repository.dart';
import 'data/repositories/match_center_repository.dart';
import 'data/repositories/public_api_repository.dart';
import 'data/repositories/shop_repository.dart';
import 'data/repositories/tickets_repository.dart';
import 'features/auth/auth_controller.dart';
import 'features/club/club_screen.dart';
import 'features/home/home_screen.dart';
import 'features/matches/matches_screen.dart';
import 'features/news/news_screen.dart';
import 'features/shop/cart_controller.dart';
import 'features/shop/shop_screen.dart';

/// Root widget: installs the global dark theme for legacy and pushed screens,
/// provides the app-lifetime dependencies, and hosts the five-tab shell.
class JsoApp extends StatelessWidget {
  const JsoApp({
    super.key,
    required this.repository,
    required this.ticketsRepository,
    required this.clubContentRepository,
    required this.shopRepository,
    required this.matchCenterRepository,
    required this.cartController,
    required this.authController,
  });

  final PublicApiRepository repository;
  final TicketsRepository ticketsRepository;
  final ClubContentRepository clubContentRepository;
  final ShopRepository shopRepository;
  final MatchCenterRepository matchCenterRepository;
  final CartController cartController;
  final AuthController authController;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<PublicApiRepository>.value(value: repository),
        Provider<TicketsRepository>.value(value: ticketsRepository),
        Provider<ClubContentRepository>.value(value: clubContentRepository),
        Provider<ShopRepository>.value(value: shopRepository),
        Provider<MatchCenterRepository>.value(value: matchCenterRepository),
        ChangeNotifierProvider<CartController>.value(value: cartController),
        ChangeNotifierProvider<AuthController>.value(value: authController),
      ],
      child: MaterialApp(
        title: 'JSO',
        debugShowCheckedModeBanner: false,
        theme: JsoTheme.dark(),
        home: const HomeShell(),
      ),
    );
  }
}

/// Root shell matching the five primary destinations of the mobile app.
///
/// [IndexedStack] keeps every tab alive while the account entry point lives in
/// the Home header and in the Plus hub, rather than floating over all screens.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  late final List<Widget> _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = [
      HomeScreen(onViewAllNews: _showNews),
      const MatchesScreen(),
      const ShopScreen(),
      const NewsScreen(),
      const ClubScreen(),
    ];
  }

  void _showNews() => _selectTab(3);

  void _selectTab(int index) {
    if (_index == index) return;
    setState(() => _index = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        ),
        child: BottomNavigationBar(
          currentIndex: _index,
          onTap: _selectTab,
          backgroundColor: Colors.white,
          selectedItemColor: JsoColors.navy,
          unselectedItemColor: JsoColors.inkMuted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          iconSize: 25,
          selectedFontSize: 12,
          unselectedFontSize: 12,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w800),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600),
          items: const [
            BottomNavigationBarItem(
              icon: _BottomTabIcon(
                icon: Icons.home_outlined,
                semanticLabel: 'Accueil',
              ),
              activeIcon: _BottomTabIcon(
                icon: Icons.home_rounded,
                semanticLabel: 'Accueil',
                selected: true,
              ),
              label: 'Accueil',
            ),
            BottomNavigationBarItem(
              icon: _BottomTabIcon(
                icon: Icons.sports_soccer_outlined,
                semanticLabel: 'Matchs',
              ),
              activeIcon: _BottomTabIcon(
                icon: Icons.sports_soccer,
                semanticLabel: 'Matchs',
                selected: true,
              ),
              label: 'Matchs',
            ),
            BottomNavigationBarItem(
              icon: _BottomTabIcon(
                icon: Icons.storefront_outlined,
                semanticLabel: 'Boutique',
              ),
              activeIcon: _BottomTabIcon(
                icon: Icons.storefront,
                semanticLabel: 'Boutique',
                selected: true,
              ),
              label: 'Boutique',
            ),
            BottomNavigationBarItem(
              icon: _BottomTabIcon(
                icon: Icons.newspaper_outlined,
                semanticLabel: 'Actualités',
              ),
              activeIcon: _BottomTabIcon(
                icon: Icons.newspaper,
                semanticLabel: 'Actualités',
                selected: true,
              ),
              label: 'Actualités',
            ),
            BottomNavigationBarItem(
              icon: _BottomTabIcon(
                icon: Icons.more_horiz,
                semanticLabel: 'Plus',
              ),
              activeIcon: _BottomTabIcon(
                icon: Icons.more_horiz,
                semanticLabel: 'Plus',
                selected: true,
              ),
              label: 'Plus',
            ),
          ],
        ),
      ),
    );
  }
}

/// Accessible icon with the gold selection marker from the mobile reference.
class _BottomTabIcon extends StatelessWidget {
  const _BottomTabIcon({
    required this.icon,
    required this.semanticLabel,
    this.selected = false,
  });

  final IconData icon;
  final String semanticLabel;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      selected: selected,
      button: true,
      excludeSemantics: true,
      child: Tooltip(
        message: semanticLabel,
        child: Container(
          width: 44,
          padding: const EdgeInsets.only(top: 7),
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: selected ? JsoColors.gold : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          child: Icon(icon),
        ),
      ),
    );
  }
}
