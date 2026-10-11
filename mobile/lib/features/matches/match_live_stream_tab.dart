import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/config/jso_theme.dart';
import '../../data/repositories/public_api_repository.dart';
import '../auth/auth_controller.dart';

/// Stream playback and pay-per-view access governed by the same API checks as web.
class MatchLiveStreamTab extends StatefulWidget {
  const MatchLiveStreamTab({super.key, required this.matchId});
  final String matchId;
  @override
  State<MatchLiveStreamTab> createState() => _MatchLiveStreamTabState();
}

class _MatchLiveStreamTabState extends State<MatchLiveStreamTab> {
  Map<String, dynamic>? stream;
  WebViewController? player;
  bool loading = true, paying = false, checking = false;
  String? error, accessId;
  Timer? timer;
  int checks = 0;

  @override
  void initState() { super.initState(); load(); }
  @override
  void didUpdateWidget(covariant MatchLiveStreamTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.matchId != widget.matchId) load();
  }
  @override
  void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      final token = context.read<AuthController>().accessToken;
      final data = await context.read<PublicApiRepository>().getMatchStream(widget.matchId, token: token);
      final url = data['streamUrl']?.toString();
      WebViewController? controller;
      if (data['hasAccess'] == true && url != null && url.isNotEmpty) {
        controller = WebViewController()
          ..setJavaScriptMode(JavaScriptMode.unrestricted)
          ..setBackgroundColor(const Color(0xFF020617))
          ..loadRequest(Uri.parse(url));
      }
      if (!mounted) return;
      setState(() { stream = data; player = controller; loading = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() { stream = null; player = null; loading = false; error = 'Aucune diffusion publiée ou service temporairement indisponible.'; });
    }
  }

  Future<void> startPayment() async {
    final token = context.read<AuthController>().accessToken;
    if (token == null) {
      setState(() => error = 'Connectez-vous à votre compte supporter pour acheter le direct.');
      return;
    }
    final countryController = TextEditingController(text: 'TN');
    final country = await showDialog<String>(context: context, builder: (context) => AlertDialog(
      title: const Text('Paiement du direct'),
      content: TextField(controller: countryController, maxLength: 2, textCapitalization: TextCapitalization.characters,
        decoration: const InputDecoration(labelText: 'Pays (code ISO)', helperText: 'TN pour Tunisie, FR pour France')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Annuler')),
        FilledButton(onPressed: () => Navigator.pop(context, countryController.text.trim().toUpperCase()), child: const Text('Continuer')),
      ],
    ));
    countryController.dispose();
    if (country == null || country.length != 2 || !mounted) return;
    setState(() { paying = true; error = null; });
    try {
      final result = await context.read<PublicApiRepository>().startMatchStreamAccess(widget.matchId, country: country, token: token);
      final redirect = Uri.tryParse(result['redirectUrl']?.toString() ?? '');
      final id = result['accessId']?.toString();
      if (redirect == null || redirect.scheme != 'https' || id == null || id.isEmpty) {
        throw StateError('Il servizio di pagamento non ha restituito un link sicuro valido.');
      }
      if (!await launchUrl(redirect, mode: LaunchMode.externalApplication)) throw StateError('Impossibile aprire il pagamento.');
      if (!mounted) return;
      setState(() { accessId = id; checking = true; checks = 0; });
      timer?.cancel();
      timer = Timer.periodic(const Duration(seconds: 4), (_) => checkPayment());
    } catch (e) {
      if (mounted) setState(() => error = 'Pagamento non avviato: $e');
    } finally {
      if (mounted) setState(() => paying = false);
    }
  }

  Future<void> checkPayment() async {
    final id = accessId;
    final token = context.read<AuthController>().accessToken;
    if (id == null || token == null || !mounted) return;
    checks++;
    try {
      final row = await context.read<PublicApiRepository>().getMatchStreamAccess(id, token: token);
      if (row['status']?.toString().toLowerCase() == 'paid') {
        timer?.cancel(); timer = null;
        if (!mounted) return;
        setState(() { checking = false; accessId = null; });
        await load();
        return;
      }
    } catch (_) { /* Payment webhook can take time to arrive. */ }
    if (checks >= 30) {
      timer?.cancel(); timer = null;
      if (mounted) setState(() { checking = false; error = 'Pagamento ancora in verifica. Tocca Aggiorna tra poco.'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    final s = stream;
    if (s == null) return _empty(error ?? 'Nessuna diretta disponibile.', onRetry: load);
    final hasAccess = s['hasAccess'] == true;
    final url = s['streamUrl']?.toString();
    final paid = s['isPaid'] == true;
    final preview = s['isPreviewAccess'] == true;
    if (hasAccess && url != null && url.isNotEmpty && player != null) {
      return ListView(padding: const EdgeInsets.all(JsoSpacing.md), children: [
        Row(children: [
          const Icon(Icons.circle, color: Colors.red, size: 11),
          const SizedBox(width: 8),
          const Expanded(child: Text('DIFFUSION LIVE', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2))),
          if (preview) const Chip(label: Text('Aperçu développeur')),
        ]),
        const SizedBox(height: JsoSpacing.sm),
        AspectRatio(aspectRatio: 16 / 9, child: ClipRRect(borderRadius: BorderRadius.circular(14), child: WebViewWidget(controller: player!))),
        const SizedBox(height: JsoSpacing.sm),
        Text(preview ? 'Aperçu autorisé — accès de développement.' : 'Accès à la diffusion confirmé.',
          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w700)),
        Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: load, icon: const Icon(Icons.refresh), label: const Text('Actualiser'))),
      ]);
    }
    final amount = s['price'] is num ? (s['price'] as num).toStringAsFixed(2) : '—';
    final currency = s['currency']?.toString() ?? 'TND';
    return Center(child: SingleChildScrollView(padding: const EdgeInsets.all(JsoSpacing.lg), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.live_tv_outlined, size: 56, color: JsoColors.gold),
      const SizedBox(height: JsoSpacing.md),
      Text(paid ? 'Direct pay-per-view' : 'Direct gratuit', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
      const SizedBox(height: JsoSpacing.sm),
      Text(paid ? 'Accès au direct : $amount $currency' : 'Le lien vidéo sera disponible dès la publication de la diffusion.', textAlign: TextAlign.center, style: const TextStyle(color: JsoColors.muted)),
      if (paid && !checking) ...[
        const SizedBox(height: JsoSpacing.md),
        FilledButton.icon(onPressed: paying ? null : startPayment,
          icon: paying ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.lock_open),
          label: Text(paying ? 'Ouverture du paiement…' : 'Payer pour regarder')),
      ],
      if (checking) ...[const SizedBox(height: JsoSpacing.md), const CircularProgressIndicator(), const SizedBox(height: JsoSpacing.sm), const Text('Vérification du paiement…')],
      if (error != null) ...[const SizedBox(height: JsoSpacing.md), Text(error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.redAccent))],
      TextButton.icon(onPressed: load, icon: const Icon(Icons.refresh), label: const Text('Actualiser')),
    ])));
  }

  Widget _empty(String message, {required VoidCallback onRetry}) => Center(
    child: Padding(padding: const EdgeInsets.all(JsoSpacing.lg), child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.live_tv_outlined, size: 48, color: JsoColors.muted),
      const SizedBox(height: JsoSpacing.md),
      const Text('Direct indisponible', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
      const SizedBox(height: JsoSpacing.sm),
      Text(message, textAlign: TextAlign.center, style: const TextStyle(color: JsoColors.muted)),
      TextButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Réessayer')),
    ])));
}
