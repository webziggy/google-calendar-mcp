import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:googleapis/calendar/v3.dart' as cal;
import 'package:google_sign_in/google_sign_in.dart';

class GoogleAuthClient extends http.BaseClient {
  final Map<String, String> _headers;
  final http.Client _client = http.Client();

  GoogleAuthClient(this._headers);

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    return _client.send(request..headers.addAll(_headers));
  }
}

class CalendarService {
  final GoogleSignInAccount currentUser;
  late cal.CalendarApi _api;

  CalendarService(this.currentUser);

  Future<void> init() async {
    final headers = await currentUser.authHeaders;
    final client = GoogleAuthClient(headers);
    _api = cal.CalendarApi(client);
  }

  Future<List<String>> getAiManagedCalendars() async {
    List<String> aiCalendars = [];
    
    try {
      // Find the mcp-server preferences file relative to the execution context
      // For local development, we'll navigate up the tree. In production, this would be global app data.
      File prefFile = File('../mcp-server/calendar_preferences.md');
      
      if (await prefFile.exists()) {
        List<String> lines = await prefFile.readAsLines();
        for (String line in lines) {
          // Parse the markdown table line: | ID | Name | Category | Role |
          if (line.contains('|') && line.contains('AI-Managed')) {
            List<String> columns = line.split('|').map((e) => e.trim()).toList();
            if (columns.length > 2) {
              String calendarId = columns[1];
              aiCalendars.add(calendarId);
            }
          }
        }
      }
    } catch (e) {
      print("Error parsing preferences: $e");
    }
    
    return aiCalendars;
  }

  Future<List<cal.Event>> fetchAiEvents() async {
    if (_api == null) await init();
    
    List<String> calendars = await getAiManagedCalendars();
    List<cal.Event> allEvents = [];

    DateTime now = DateTime.now();
    DateTime nextWeek = now.add(const Duration(days: 7));

    for (String calId in calendars) {
      try {
        var events = await _api.events.list(
          calId,
          timeMin: now.toUtc(),
          timeMax: nextWeek.toUtc(),
          singleEvents: true,
          orderBy: 'startTime',
        );
        if (events.items != null) {
          allEvents.addAll(events.items!);
        }
      } catch (e) {
        print("Error fetching calendar $calId: $e");
      }
    }
    
    // Sort all fetched events chronologically
    allEvents.sort((a, b) {
      DateTime? aTime = a.start?.dateTime ?? a.start?.date;
      DateTime? bTime = b.start?.dateTime ?? b.start?.date;
      if (aTime != null && bTime != null) return aTime.compareTo(bTime);
      return 0;
    });

    return allEvents;
  }
}
