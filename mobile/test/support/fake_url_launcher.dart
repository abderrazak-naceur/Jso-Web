import 'package:flutter/services.dart';
// ignore: implementation_imports
import 'package:url_launcher_platform_interface/link.dart' show LinkDelegate;
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';

/// A test double for [UrlLauncherPlatform] that makes `launchUrl` fail
/// deterministically without touching real platform channels.
///
/// When [throwOnLaunch] is true it throws a [PlatformException] to exercise the
/// throwing failure path documented by url_launcher; otherwise it returns
/// `false`. Install it with `UrlLauncherPlatform.instance = FakeUrlLauncher()`
/// and restore the original instance in a tearDown.
class FakeUrlLauncher extends UrlLauncherPlatform {
  FakeUrlLauncher({this.throwOnLaunch = true});

  /// Whether [launchUrl] throws (true) or simply returns `false`.
  final bool throwOnLaunch;

  /// URLs passed to [launchUrl], in call order.
  final List<String> launchedUrls = <String>[];

  @override
  LinkDelegate? get linkDelegate => null;

  @override
  Future<bool> canLaunch(String url) async => true;

  @override
  Future<bool> launchUrl(String url, LaunchOptions options) async {
    launchedUrls.add(url);
    if (throwOnLaunch) {
      throw PlatformException(
        code: 'ACTIVITY_NOT_FOUND',
        message: 'No Activity found to handle Intent',
      );
    }
    return false;
  }
}
