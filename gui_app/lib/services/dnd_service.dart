import 'dart:io';

class DndService {
  /// Because macOS Monterey+ locked down the Do Not Disturb APIs, 
  /// we use the macOS native 'shortcuts' CLI to toggle a Focus Mode.
  /// Note: The user must have a Shortcut named "Toggle DND" for this to fully hook into the OS.
  
  static Future<void> enableDnd() async {
    try {
      // In a full production macOS app, this would use an XPC service or NSWorkspace.
      // For local tools, triggering a shortcut is the most robust way to trigger Focus Mode.
      await Process.run('shortcuts', ['run', 'Turn Do Not Disturb On']);
      print("DND Enabled via OS");
    } catch (e) {
      print("Could not enable OS DND: $e");
    }
  }

  static Future<void> disableDnd() async {
    try {
      await Process.run('shortcuts', ['run', 'Turn Do Not Disturb Off']);
      print("DND Disabled via OS");
    } catch (e) {
      print("Could not disable OS DND: $e");
    }
  }
}
