import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  ApiException(this.status, this.code, this.message);
  @override
  String toString() => '$code ($status): $message';
}

/// Client Android/iOS sans dépendance externe. Le stockage sécurisé est fourni
/// par l'application Flutter via onTokenChanged (Keychain/Keystore).
class PharmaCareApi {
  final Uri baseUri;
  final Future<void> Function(String? token) onTokenChanged;
  final HttpClient _http = HttpClient();
  String? _token;

  PharmaCareApi(String baseUrl, {required this.onTokenChanged})
      : baseUri = Uri.parse(baseUrl.endsWith('/') ? baseUrl : '$baseUrl/') {
    _http.connectionTimeout = const Duration(seconds: 15);
  }

  void restoreToken(String? token) => _token = token;
  void close() => _http.close(force: true);

  /// À créer et sauvegarder avec le panier AVANT son premier envoi.
  static String newRequestKey() {
    final random = Random.secure();
    return base64UrlEncode(List<int>.generate(24, (_) => random.nextInt(256)))
        .replaceAll('=', '');
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool authenticate = true,
  }) async {
    final uri = baseUri.resolve(path).replace(queryParameters: query);
    final req = await _http.openUrl(method, uri);
    req.headers.set(HttpHeaders.acceptHeader, 'application/json');
    if (authenticate && _token != null) {
      req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $_token');
    }
    if (body != null) {
      req.headers.contentType = ContentType.json;
      req.write(jsonEncode(body));
    }
    final response = await req.close().timeout(const Duration(seconds: 90));
    final text = await response.transform(utf8.decoder).join()
        .timeout(const Duration(seconds: 30));
    final Map<String, dynamic> data;
    try {
      data = jsonDecode(text) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(response.statusCode, 'INVALID_RESPONSE',
          'Réponse serveur illisible.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == 401 && authenticate) {
        _token = null;
        await onTokenChanged(null);
      }
      final error = data['error'] as Map<String, dynamic>?;
      throw ApiException(response.statusCode,
          error?['code'] as String? ?? 'HTTP_ERROR',
          error?['message'] as String? ?? 'Requête impossible.');
    }
    return data;
  }

  Future<Map<String, dynamic>> login(
      String email, String password, String device) async {
    final data = await _request('POST', 'auth/login', authenticate: false,
        body: {'email': email, 'motDePasse': password, 'appareil': device});
    _token = data['accessToken'] as String;
    await onTokenChanged(_token);
    return data;
  }

  Future<void> logout() async {
    // En cas de panne, conserver le jeton pour pouvoir retenter sa révocation.
    await _request('POST', 'auth/logout');
    _token = null;
    await onTokenChanged(null);
  }

  Future<Map<String, dynamic>> me() => _request('GET', 'me');
  Future<Map<String, dynamic>> stock({String q = '', int page = 1}) =>
      _request('GET', 'stock', query: {'q': q, 'page': '$page', 'limit': '30'});
  Future<Map<String, dynamic>> clients({String q = '', int page = 1}) =>
      _request('GET', 'clients', query: {'q': q, 'page': '$page'});
  Future<Map<String, dynamic>> cash({int page = 1}) =>
      _request('GET', 'caisse', query: {'page': '$page'});
  Future<Map<String, dynamic>> openCash(int amount) =>
      _request('POST', 'caisse', body: {'action': 'ouvrir', 'montant': amount});
  Future<Map<String, dynamic>> cashMovement(String id, String key, String type,
          int amount, String reason) =>
      _request('POST', 'caisse', body: {'action': 'mouvement', 'id': id,
        'cle': key, 'type': type, 'montant': amount, 'motif': reason});
  Future<Map<String, dynamic>> closeCash(String id, int counted,
          {String? reason}) =>
      _request('POST', 'caisse', body: {'action': 'cloturer', 'id': id,
        'montant': counted, if (reason != null) 'motif': reason});

  Future<Map<String, dynamic>> sell({required String requestKey,
    required List<Map<String, dynamic>> items,
    String payment = 'especes', String? clientId}) =>
      _request('POST', 'ventes', body: {'requestKey': requestKey, 'items': items,
        'methodePaiement': payment, if (clientId != null) 'clientId': clientId});

  Future<Map<String, dynamic>> sales({int page = 1, String? status,
    DateTime? from, DateTime? to}) => _request('GET', 'ventes', query: {
      'page': '$page', if (status != null) 'statut': status,
      if (from != null) 'from': from.toUtc().toIso8601String(),
      if (to != null) 'to': to.toUtc().toIso8601String(),
    });
  Future<Map<String, dynamic>> sale(String id) =>
      _request('GET', 'ventes/${Uri.encodeComponent(id)}');
  Future<Map<String, dynamic>> retryCertification(String id) =>
      _request('POST', 'ventes/${Uri.encodeComponent(id)}/certification');
  Future<Map<String, dynamic>> document(String id, {bool copy = false}) =>
      _request('GET', 'ventes/${Uri.encodeComponent(id)}/document',
          query: {if (copy) 'copie': '1'});
  Future<Map<String, dynamic>> situation({DateTime? from, DateTime? to}) =>
      _request('GET', 'me/situation', query: {
        if (from != null) 'from': from.toUtc().toIso8601String(),
        if (to != null) 'to': to.toUtc().toIso8601String(),
      });
}
