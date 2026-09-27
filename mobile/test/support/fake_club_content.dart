import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';

import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/archive_item.dart';
import 'package:jso_mobile/data/models/club_document.dart';
import 'package:jso_mobile/data/models/club_event.dart';
import 'package:jso_mobile/data/models/community_program.dart';
import 'package:jso_mobile/data/models/faq_entry.dart';
import 'package:jso_mobile/data/repositories/club_content_repository.dart';

import 'fake_repository.dart';
import 'fake_url_launcher.dart';
import 'test_harness.dart';

/// A test double for [ClubContentRepository] that never touches the network.
///
/// Each method resolves from an injected list (empty by default) or throws
/// [error]; [delay] keeps the future pending long enough for a test to observe
/// the LOADING state. [getEvent] resolves [event], else the item of [events]
/// with the requested slug, else throws [NotFoundException] — unless
/// [eventError] is set.
class FakeClubContentRepository extends ClubContentRepository {
  FakeClubContentRepository({
    this.events = const [],
    this.event,
    this.documents = const [],
    this.faq = const [],
    this.archive = const [],
    this.programs = const [],
    this.error,
    this.eventError,
    this.delay,
  }) : super(ApiClient());

  final List<ClubEvent> events;
  final ClubEvent? event;
  final List<ClubDocument> documents;
  final List<FaqEntry> faq;
  final List<ArchiveItem> archive;
  final List<CommunityProgram> programs;

  /// When set, every method throws it. Mutable so a test can clear it and
  /// then exercise the "Réessayer" path.
  ApiException? error;

  /// When set, only [getEvent] throws it (e.g. a [NotFoundException]).
  ApiException? eventError;

  /// Optional artificial latency so tests can assert the LOADING state.
  final Duration? delay;

  /// Number of calls per method name, e.g. `calls['getEvents']`.
  final Map<String, int> calls = <String, int>{};

  /// Slugs passed to [getEvent], in call order.
  final List<String> requestedSlugs = <String>[];

  Future<T> _resolve<T>(
    String method,
    T Function() value, {
    ApiException? failure,
  }) async {
    calls.update(method, (count) => count + 1, ifAbsent: () => 1);
    if (delay != null) {
      await Future<void>.delayed(delay!);
    }
    final thrown = failure ?? error;
    if (thrown != null) {
      throw thrown;
    }
    return value();
  }

  @override
  Future<List<ClubEvent>> getEvents() => _resolve('getEvents', () => events);

  @override
  Future<ClubEvent> getEvent(String slug) {
    requestedSlugs.add(slug);
    return _resolve(
      'getEvent',
      () =>
          event ??
          events.firstWhere(
            (e) => e.slug == slug,
            orElse: () => throw const NotFoundException(),
          ),
      failure: eventError,
    );
  }

  @override
  Future<List<ClubDocument>> getDocuments({String? category}) =>
      _resolve('getDocuments', () => documents);

  @override
  Future<List<FaqEntry>> getFaq({String? category}) =>
      _resolve('getFaq', () => faq);

  @override
  Future<List<ArchiveItem>> getArchive({int? year, String? category}) =>
      _resolve('getArchive', () => archive);

  @override
  Future<List<CommunityProgram>> getCommunityPrograms() =>
      _resolve('getCommunityPrograms', () => programs);
}

/// Pumps [child] through the shared [pumpScreen] harness with a
/// [ClubContentRepository] provider backed by [repository] (above the
/// MaterialApp, so pushed routes can read it too).
Future<void> pumpClubScreen(
  WidgetTester tester, {
  required FakeClubContentRepository repository,
  required Widget child,
}) {
  return pumpScreen(
    tester,
    repository: FakeRepository(),
    child: child,
    providers: [Provider<ClubContentRepository>.value(value: repository)],
  );
}

/// Installs [launcher] as the url_launcher platform for the current test and
/// restores the original instance on tear-down.
T installUrlLauncher<T extends UrlLauncherPlatform>(T launcher) {
  final original = UrlLauncherPlatform.instance;
  UrlLauncherPlatform.instance = launcher;
  addTearDown(() => UrlLauncherPlatform.instance = original);
  return launcher;
}

/// A [FakeUrlLauncher] whose launches succeed; records the requested launch
/// [modes] so tests can assert the external-application mode.
class SucceedingUrlLauncher extends FakeUrlLauncher {
  SucceedingUrlLauncher() : super(throwOnLaunch: false);

  final List<PreferredLaunchMode> modes = <PreferredLaunchMode>[];

  @override
  Future<bool> launchUrl(String url, LaunchOptions options) async {
    launchedUrls.add(url);
    modes.add(options.mode);
    return true;
  }
}

/// Sample "Vie du club" data used by the screen tests.
class ClubSample {
  const ClubSample._();

  static ClubEvent event({
    String id = 'ev-1',
    String title = 'Assemblée générale',
    String slug = 'assemblee-generale',
    DateTime? startAt,
    DateTime? endAt,
    String? description = 'Bilan de la saison et élection du bureau.',
    String? location = 'Salle omnisports de Oudhref',
  }) {
    return ClubEvent(
      id: id,
      title: title,
      slug: slug,
      startAt: startAt ?? DateTime.utc(2026, 6, 20, 17),
      endAt: endAt,
      description: description,
      location: location,
    );
  }

  static ClubDocument document({
    String id = 'doc-1',
    String title = 'Règlement intérieur 2026',
    String? category = 'Règlement',
    String fileUrl = '/uploads/documents/reglement-interieur-2026.pdf',
    DateTime? createdAt,
  }) {
    return ClubDocument(
      id: id,
      title: title,
      category: category,
      fileUrl: fileUrl,
      createdAt: createdAt ?? DateTime.utc(2026, 3, 2, 9, 30),
    );
  }

  static FaqEntry faq({
    String id = 'faq-1',
    String question = 'Comment acheter un billet ?',
    String answer = 'Rendez-vous dans la billetterie de l\'application.',
    String? category = 'Billetterie',
    int sortOrder = 0,
  }) {
    return FaqEntry(
      id: id,
      question: question,
      answer: answer,
      category: category,
      sortOrder: sortOrder,
    );
  }

  static ArchiveItem archiveItem({
    String id = 'ar-1',
    int? year = 2019,
    String category = 'Trophy',
    String title = 'Coupe régionale 2019',
    String body = 'La JSO remporte la coupe régionale face à l\'US Ben Arous.',
    String? mediaUrl,
    int displayOrder = 0,
  }) {
    return ArchiveItem(
      id: id,
      year: year,
      category: category,
      title: title,
      body: body,
      mediaUrl: mediaUrl,
      displayOrder: displayOrder,
      createdAt: DateTime.utc(2026, 1, 10, 8),
    );
  }

  static CommunityProgram program({
    String id = 'cp-1',
    String title = 'Journée portes ouvertes',
    String partnerName = 'École primaire de Oudhref',
    String description = 'Initiation au football pour les élèves de CM1.',
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return CommunityProgram(
      id: id,
      title: title,
      partnerName: partnerName,
      description: description,
      startDate: startDate ?? DateTime.utc(2026, 4, 1),
      endDate: endDate,
    );
  }
}
