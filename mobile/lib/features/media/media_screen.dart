import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/media_asset.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';

/// Media tab: a gallery grid from `GET /api/media`.
class MediaScreen extends StatefulWidget {
  const MediaScreen({super.key});

  @override
  State<MediaScreen> createState() => _MediaScreenState();
}

class _MediaScreenState extends State<MediaScreen> {
  late Future<List<MediaAsset>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getMedia();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Media')),
      body: FutureBuilder<List<MediaAsset>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading media…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load media.',
              onRetry: () => setState(_load),
            );
          }

          final assets = snapshot.data ?? const <MediaAsset>[];
          if (assets.isEmpty) {
            return const EmptyView(
              message: 'No media available yet.',
              icon: Icons.photo_library_outlined,
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: GridView.builder(
              padding: const EdgeInsets.all(JsoSpacing.md),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: JsoSpacing.md,
                mainAxisSpacing: JsoSpacing.md,
                childAspectRatio: 0.85,
              ),
              itemCount: assets.length,
              itemBuilder: (context, i) => _MediaTile(asset: assets[i]),
            ),
          );
        },
      ),
    );
  }
}

class _MediaTile extends StatelessWidget {
  const _MediaTile({required this.asset});

  final MediaAsset asset;

  @override
  Widget build(BuildContext context) {
    // Prefer the thumbnail; fall back to the full media URL.
    final imageUrl =
        (asset.thumbnailUrl != null && asset.thumbnailUrl!.isNotEmpty)
        ? asset.thumbnailUrl
        : asset.url;
    final label = asset.caption?.isNotEmpty == true
        ? asset.caption!
        : asset.title;

    return ClipRRect(
      borderRadius: BorderRadius.circular(JsoRadius.card),
      child: Container(
        color: JsoColors.navy3,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  RemoteImage(url: imageUrl),
                  Positioned(
                    top: JsoSpacing.sm,
                    left: JsoSpacing.sm,
                    child: _TypeBadge(type: asset.type),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(JsoSpacing.sm),
              child: Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: JsoColors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.type});

  final String type;

  @override
  Widget build(BuildContext context) {
    final isVideo = type.toLowerCase() == 'video';
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: JsoSpacing.sm,
        vertical: JsoSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: JsoColors.ink.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(JsoRadius.pill),
        border: Border.all(color: JsoColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isVideo ? Icons.videocam : Icons.image,
            size: 12,
            color: JsoColors.gold,
          ),
          const SizedBox(width: JsoSpacing.xs),
          Text(
            isVideo ? 'Video' : 'Image',
            style: const TextStyle(
              color: JsoColors.white,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
