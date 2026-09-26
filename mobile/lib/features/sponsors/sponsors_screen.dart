import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/sponsor.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';

/// Sponsors: the partner list from `GET /api/sponsors`; sponsors with a
/// `websiteUrl` expose a "Visit website" action opening the link externally.
class SponsorsScreen extends StatefulWidget {
  const SponsorsScreen({super.key});

  @override
  State<SponsorsScreen> createState() => _SponsorsScreenState();
}

class _SponsorsScreenState extends State<SponsorsScreen> {
  late Future<List<Sponsor>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getSponsors();
  }

  Future<void> _openWebsite(String? websiteUrl) async {
    final raw = websiteUrl?.trim() ?? '';
    final uri = raw.isEmpty ? null : Uri.tryParse(raw);
    var opened = false;
    if (uri != null) {
      // launchUrl can either return false or throw a PlatformException on
      // failure; treat a thrown exception as the same failure path so the
      // user always sees the "Could not open link." SnackBar.
      try {
        opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        opened = false;
      }
    }
    if (!opened && mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Could not open link.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sponsors')),
      body: FutureBuilder<List<Sponsor>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading sponsors…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load sponsors.',
              onRetry: () => setState(_load),
            );
          }

          final sponsors = snapshot.data ?? const <Sponsor>[];
          if (sponsors.isEmpty) {
            return const EmptyView(
              message: 'No sponsors to show yet.',
              icon: Icons.handshake_outlined,
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.md,
                vertical: JsoSpacing.sm,
              ),
              itemCount: sponsors.length,
              itemBuilder: (context, i) => _SponsorCard(
                sponsor: sponsors[i],
                onVisit: () => _openWebsite(sponsors[i].websiteUrl),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SponsorCard extends StatelessWidget {
  const _SponsorCard({required this.sponsor, required this.onVisit});

  final Sponsor sponsor;
  final VoidCallback onVisit;

  @override
  Widget build(BuildContext context) {
    final hasWebsite =
        sponsor.websiteUrl != null && sponsor.websiteUrl!.trim().isNotEmpty;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 64,
              width: double.infinity,
              decoration: BoxDecoration(
                color: JsoColors.navy2,
                borderRadius: BorderRadius.circular(JsoRadius.control),
                border: Border.all(color: JsoColors.border),
              ),
              alignment: Alignment.center,
              child: RemoteImage(
                url: sponsor.logoUrl,
                height: 64,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: JsoSpacing.sm),
            Text(
              sponsor.name,
              style: const TextStyle(
                color: JsoColors.white,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: JsoSpacing.xs),
            Text(sponsor.tier, style: const TextStyle(color: JsoColors.muted)),
            if (hasWebsite) ...[
              const SizedBox(height: JsoSpacing.sm),
              TextButton.icon(
                onPressed: onVisit,
                icon: const Icon(Icons.open_in_new, size: 16),
                label: const Text('Visit website'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
