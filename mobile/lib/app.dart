import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/config/jso_theme.dart';
import 'data/repositories/public_api_repository.dart';
import 'features/home/home_screen.dart';
import 'features/matches/matches_screen.dart';
import 'features/media/media_screen.dart';
import 'features/news/news_screen.dart';

/// Root widget: installs the JSO theme and provides the API repository to the
/// widget tree via Provider, then hosts the bottom-navigation shell.
class JsoApp extends StatelessWidget {
  const JsoApp({super.key, required this.repository});

  final PublicApiRepository repository;

  @override
  Widget build(BuildContext context) {
    return Provider<PublicApiRepository>.value(
      value: repository,
      child: MaterialApp(
        title: 'JSO',
        debugShowCheckedModeBanner: false,
        theme: JsoTheme.dark(),
        home: const HomeShell(),
      ),
    );
  }
}

/// Bottom-navigation shell with the four public tabs.
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
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
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
        ],
      ),
    );
  }
}
