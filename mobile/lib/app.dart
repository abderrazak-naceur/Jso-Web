import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/config/jso_theme.dart';
import 'data/repositories/public_api_repository.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/profile_screen.dart';
import 'features/club/club_screen.dart';
import 'features/home/home_screen.dart';
import 'features/matches/matches_screen.dart';
import 'features/media/media_screen.dart';
import 'features/news/news_screen.dart';

/// Root widget: installs the JSO theme and provides both the public API
/// repository and the fan [AuthController] to the widget tree via
/// [MultiProvider], then hosts the bottom-navigation shell.
class JsoApp extends StatelessWidget {
  const JsoApp({
    super.key,
    required this.repository,
    required this.authController,
  });

  final PublicApiRepository repository;
  final AuthController authController;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Keep the existing repository injection so the 5 public screens keep
        // working exactly as before (anonymous, no auth header).
        Provider<PublicApiRepository>.value(value: repository),
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

/// Bottom-navigation shell with the five public tabs.
///
/// The account entry point is a person icon overlaid on the top-right of the
/// shell rather than a sixth tab: the public tabs stay usable anonymously and
/// the bottom bar keeps its five-item layout (see mobile/README.md). Tapping it
/// pushes the [ProfileScreen], which itself branches on the auth state.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const List<Widget> _tabs = [
    HomeScreen(),
    MatchesScreen(),
    NewsScreen(),
    MediaScreen(),
    ClubScreen(),
  ];

  void _openAccount() {
    Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => const ProfileScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _index, children: _tabs),
          const _AccountButton(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        backgroundColor: JsoColors.navy,
        selectedItemColor: JsoColors.gold,
        unselectedItemColor: JsoColors.muted,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.sports_soccer_outlined),
            activeIcon: Icon(Icons.sports_soccer),
            label: 'Matches',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.article_outlined),
            activeIcon: Icon(Icons.article),
            label: 'News',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.photo_library_outlined),
            activeIcon: Icon(Icons.photo_library),
            label: 'Media',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shield_outlined),
            activeIcon: Icon(Icons.shield),
            label: 'Club',
          ),
        ],
      ),
    );
  }
}

/// Account entry point: a person icon in the top-right safe area of the shell.
///
/// Kept private to app.dart to minimise merge collisions with the parallel
/// live-blog work. It reads the [AuthController] only to switch the icon
/// between anonymous and authenticated; the tap always opens [ProfileScreen].
class _AccountButton extends StatelessWidget {
  const _AccountButton();

  @override
  Widget build(BuildContext context) {
    final authenticated = context.select<AuthController, bool>(
      (auth) => auth.isAuthenticated,
    );
    final shell = context.findAncestorStateOfType<_HomeShellState>();
    return Positioned(
      top: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(JsoSpacing.sm),
          child: Material(
            color: JsoColors.navy2,
            shape: const CircleBorder(
              side: BorderSide(color: JsoColors.border),
            ),
            clipBehavior: Clip.antiAlias,
            child: IconButton(
              tooltip: 'Mon compte',
              onPressed: shell?._openAccount,
              icon: Icon(
                authenticated ? Icons.account_circle : Icons.person_outline,
                color: authenticated ? JsoColors.gold : JsoColors.white,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
