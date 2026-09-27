import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/error_text.dart';
import '../../core/config/api_config.dart';
import '../../core/config/jso_theme.dart';
import '../../data/models/club_document.dart';
import '../../data/repositories/club_content_repository.dart';
import '../../shared/format.dart';
import '../../shared/snackbars.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import 'category_filter_bar.dart';

/// Official club documents from `GET /api/documents` (communiqués,
/// règlements, formulaires...), newest first, with a client-side category
/// filter. Tapping a document opens its file in an external app (browser,
/// PDF viewer...).
class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  late Future<List<ClubDocument>> _future;

  /// Selected category chip; null means "Tous".
  String? _category;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<ClubContentRepository>().getDocuments();
  }

  Future<void> _open(ClubDocument document) async {
    final uri = _launchableUri(document.fileUrl);
    var opened = false;
    if (uri != null) {
      // launchUrl either returns false or throws (e.g. a PlatformException
      // when no app handles the file); both end in the same message.
      try {
        opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        opened = false;
      }
    }
    if (!opened && mounted) {
      showJsoMessage(context, 'Impossible d\'ouvrir le document.');
    }
  }

  /// Resolves root-relative upload paths against the API host and only lets
  /// absolute http(s) links through.
  static Uri? _launchableUri(String fileUrl) {
    final resolved = ApiConfig.resolveUrl(fileUrl);
    final uri = resolved == null ? null : Uri.tryParse(resolved);
    if (uri == null || uri.host.isEmpty) return null;
    return (uri.scheme == 'http' || uri.scheme == 'https') ? uri : null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: FutureBuilder<List<ClubDocument>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des documents…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message:
                  'Impossible de charger les documents.\n'
                  '${describeApiError(snapshot.error!)}',
              onRetry: () => setState(_load),
            );
          }

          final documents = snapshot.data ?? const <ClubDocument>[];
          if (documents.isEmpty) {
            return const EmptyView(
              message: 'Aucun document publié.',
              icon: Icons.folder_open_outlined,
            );
          }

          final categories = CategoryFilterBar.categoriesOf(
            documents.map((d) => d.category),
          );
          // A category that vanished after a refresh falls back to "Tous".
          final selected = categories.contains(_category) ? _category : null;
          final visible = selected == null
              ? documents
              : documents.where((d) => d.category == selected).toList();

          return Column(
            children: [
              if (categories.isNotEmpty)
                CategoryFilterBar(
                  categories: categories,
                  selected: selected,
                  onSelected: (category) =>
                      setState(() => _category = category),
                ),
              Expanded(
                child: RefreshIndicator(
                  color: JsoColors.gold,
                  onRefresh: () async => setState(_load),
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(
                      horizontal: JsoSpacing.md,
                      vertical: JsoSpacing.sm,
                    ),
                    itemCount: visible.length,
                    itemBuilder: (context, i) => _DocumentTile(
                      document: visible[i],
                      onOpen: () => _open(visible[i]),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DocumentTile extends StatelessWidget {
  const _DocumentTile({required this.document, required this.onOpen});

  final ClubDocument document;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final category = document.category;
    final createdAt = document.createdAt;
    final details = [
      ?category,
      if (createdAt != null) JsoFormat.date(createdAt),
    ].join(' · ');
    final (IconData icon, String kindLabel) = switch (document.kind) {
      ClubDocumentKind.pdf => (Icons.picture_as_pdf_outlined, 'Document PDF'),
      ClubDocumentKind.image => (Icons.image_outlined, 'Image'),
      ClubDocumentKind.other => (Icons.insert_drive_file_outlined, 'Fichier'),
    };

    return Card(
      child: ListTile(
        onTap: onOpen,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(JsoRadius.card),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: JsoSpacing.md,
          vertical: JsoSpacing.xs,
        ),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: JsoColors.navy2,
            borderRadius: BorderRadius.circular(JsoRadius.control),
            border: Border.all(color: JsoColors.border),
          ),
          child: Icon(icon, color: JsoColors.gold, semanticLabel: kindLabel),
        ),
        title: Text(
          document.title,
          style: const TextStyle(
            color: JsoColors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: details.isEmpty
            ? null
            : Text(details, style: const TextStyle(color: JsoColors.muted)),
        trailing: const Icon(
          Icons.open_in_new,
          size: 20,
          color: JsoColors.muted,
        ),
      ),
    );
  }
}
