import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/config/site_config.dart';
import '../auth/admin_auth_controller.dart';

/// Full role-gated web administration inside the mobile app.
/// The native login is reused; its token is only given to the configured JSO
/// website origin. The web app and API continue to enforce every permission.
class AdminWebScreen extends StatefulWidget {
  const AdminWebScreen({super.key, this.section});

  final String? section;

  static Route<void> route({String? section}) =>
      MaterialPageRoute<void>(builder: (_) => AdminWebScreen(section: section));

  @override
  State<AdminWebScreen> createState() => _AdminWebScreenState();
}

class _AdminWebScreenState extends State<AdminWebScreen> {
  WebViewController? _controller;
  bool _loading = true;
  bool _prepared = false;
  bool _ready = false;
  String? _error;
  String? _token;
  String? _userJson;
  Uri? _origin;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _open());
  }

  Future<void> _open() async {
    if (!mounted) return;
    final admin = context.read<AdminAuthController>();
    final origin = SiteConfig.origin;
    final url = widget.section == null
        ? SiteConfig.adminUrl
        : SiteConfig.adminSectionUrl(widget.section!);
    if (!admin.isAuthenticated ||
        admin.accessToken == null ||
        admin.user == null) {
      setState(
        () => _error = 'Connectez-vous comme administrateur pour continuer.',
      );
      return;
    }
    if (origin == null || url == null) {
      setState(
        () =>
            _error = 'Adresse du site JSO invalide. Vérifiez JSO_WEB_BASE_URL.',
      );
      return;
    }
    _token = admin.accessToken;
    _userJson = jsonEncode({
      'id': admin.user!.id,
      'email': admin.user!.email,
      'displayName': admin.user!.displayName,
      'role': admin.user!.role,
    });
    _origin = origin;
    try {
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..addJavaScriptChannel(
          'JsoAdminBridge',
          onMessageReceived: (message) async {
            if (message.message != 'logout' || !mounted) return;
            await context.read<AdminAuthController>().logout();
            if (mounted) Navigator.of(context).pop();
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (request) {
              final target = Uri.tryParse(request.url);
              if (target != null && SiteConfig.sameOrigin(target, origin)) {
                return NavigationDecision.navigate;
              }
              if (target != null &&
                  const {'https', 'http'}.contains(target.scheme)) {
                launchUrl(target, mode: LaunchMode.externalApplication);
              }
              return NavigationDecision.prevent;
            },
            onPageFinished: (pageUrl) => _onPageFinished(pageUrl),
            onWebResourceError: (error) {
              if (error.isForMainFrame == true && mounted) {
                setState(() {
                  _error = 'Le site d’administration est momentanément indisponible.';
                  _loading = false;
                });
              }
            },
          ),
        );
      if (!mounted) return;
      setState(() => _controller = controller);
      await controller.loadRequest(url);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Impossible d’ouvrir l’administration.');
      }
    }
  }

  Future<void> _onPageFinished(String pageUrl) async {
    final page = Uri.tryParse(pageUrl);
    final origin = _origin;
    final controller = _controller;
    if (!mounted ||
        page == null ||
        origin == null ||
        controller == null ||
        !SiteConfig.sameOrigin(page, origin)) {
      return;
    }
    if (_ready) {
      setState(() => _loading = false);
      return;
    }
    try {
      final token = _token;
      final userJson = _userJson;
      if (token == null || userJson == null) return;
      if (!_prepared) {
        // Clear only the admin bridge keys. Clearing the entire origin's
        // localStorage also erases the website's own user session and cart.
        await controller.runJavaScript(
          'localStorage.removeItem("jso_admin_token");'
          'localStorage.removeItem("jso_admin_user");',
        );
        _prepared = true;
        await controller.reload();
        return;
      }
      await controller.runJavaScript(
        'localStorage.setItem("jso_admin_token", ${jsonEncode(token)});'
        'localStorage.setItem("jso_admin_user", ${jsonEncode(userJson)});',
      );
      _ready = true;
      await controller.reload();
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'La session administrateur ne peut pas être ouverte.';
          _loading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    // The native secure store owns the session. Remove only the temporary
    // admin bridge values; preserve unrelated website state on this origin.
    _controller?.runJavaScript(
      'localStorage.removeItem("jso_admin_token");'
      'localStorage.removeItem("jso_admin_user");',
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Administration JSO'),
        actions: [
          if (_controller != null)
            IconButton(
              tooltip: 'Actualiser',
              onPressed: () => _controller?.reload(),
              icon: const Icon(Icons.refresh_rounded),
            ),
        ],
      ),
      body: SafeArea(
        child: _error != null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off_rounded, size: 40),
                      const SizedBox(height: 16),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Retour'),
                      ),
                    ],
                  ),
                ),
              )
            : Stack(
                children: [
                  if (_controller != null)
                    WebViewWidget(controller: _controller!),
                  if (_loading)
                    const ColoredBox(
                      color: Colors.white,
                      child: Center(child: CircularProgressIndicator()),
                    ),
                ],
              ),
      ),
    );
  }
}
