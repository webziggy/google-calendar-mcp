import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:googleapis/calendar/v3.dart' as cal;
import 'package:google_sign_in/google_sign_in.dart';
import 'dnd_service.dart';

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

  Future<String?> getFocusCalendarId() async {
    try {
      File prefFile = File('../mcp-server/calendar_preferences.md');
      if (await prefFile.exists()) {
        List<String> lines = await prefFile.readAsLines();
        for (String line in lines) {
          if (line.contains('**Focus/Break Calendar:**')) {
            // Extracts the email/ID before the space/parentheses
            // Example: "- **Focus/Break Calendar:** personal@example.com (Home)"
            String raw = line.split('**Focus/Break Calendar:**')[1].trim();
            return raw.split(' ')[0].trim();
          }
        }
      }
    } catch (e) {
      print("Error finding Focus Calendar: $e");
    }
    return null;
  }

  Future<List<String>> getAiManagedCalendars() async {
    List<String> aiCalendars = [];
    try {
      File prefFile = File('../mcp-server/calendar_preferences.md');
      if (await prefFile.exists()) {
        List<String> lines = await prefFile.readAsLines();
        for (String line in lines) {
          if (line.trim().startsWith('|') && !line.contains('---|')) {
            List<String> columns = line.split('|').map((e) => e.trim()).toList();
            if (columns.length >= 6) {
              String calendarId = columns[1];
              String category = columns[3];
              String status = columns[5];
              if (category == 'AI-Managed' && status != 'Ignored') {
                aiCalendars.add(calendarId);
              }
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
    
    allEvents.sort((a, b) {
      DateTime? aTime = a.start?.dateTime ?? a.start?.date;
      DateTime? bTime = b.start?.dateTime ?? b.start?.date;
      if (aTime != null && bTime != null) return aTime.compareTo(bTime);
      return 0;
    });

    return allEvents;
  }

  /// Triggers a 1-Hour Deep Work block on the designated Focus calendar
  Future<void> triggerQuickFocus() async {
    String? focusCalId = await getFocusCalendarId();
    if (focusCalId == null) {
      print("No focus calendar designated in preferences.");
      return;
    }

    DateTime now = DateTime.now();
    DateTime end = now.add(const Duration(hours: 1));

    cal.Event newEvent = cal.Event(
      summary: "Deep Work (EventHorizon)",
      description: "Auto-generated Focus Block.\n[EventHorizon][Focus]",
      start: cal.EventDateTime(dateTime: now.toUtc()),
      end: cal.EventDateTime(dateTime: end.toUtc()),
      // Set to "busy" so it blocks other meetings
      transparency: "opaque",
      extendedProperties: cal.EventExtendedProperties(
        private: {
          "_ai_managed": "true",
          "context_type": "deep_work"
        }
      )
    );

    try {
      await _api.events.insert(newEvent, focusCalId);
      // Engage the OS DND bridge immediately
      await DndService.enableDnd();
    } catch (e) {
      print("Error injecting Focus Block: $e");
    }
  }
}
