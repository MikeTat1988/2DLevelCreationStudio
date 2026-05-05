using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Automation;
using System.Windows.Forms;

return await CliProgram.MainAsync(args);

internal static class CliProgram
{
    [STAThread]
    public static async Task<int> MainAsync(string[] args)
    {
        try
        {
            var command = CliArguments.Parse(args);
            var driver = new WindowsCodexUiDriver();
            await driver.SendPromptAsync(command);
            Console.WriteLine("Prompt submitted to Codex.");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            Console.Error.WriteLine();
            Console.Error.WriteLine(CliArguments.Usage);
            return 1;
        }
    }
}

internal sealed record CliCommand(string Project, string Conversation, string PromptFile);

internal static class CliArguments
{
    public static CliCommand Parse(IReadOnlyList<string> args)
    {
        if (args.Count == 0 || !string.Equals(args[0], "send", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Expected command: send --project <path-or-name> --conversation <title> --prompt-file <path>");
        }

        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 1; i < args.Count; i++)
        {
            var key = args[i];
            if (!key.StartsWith("--", StringComparison.Ordinal) || i + 1 >= args.Count)
            {
                throw new ArgumentException($"Invalid argument near '{key}'.");
            }

            values[key[2..]] = args[++i];
        }

        return new CliCommand(
            Required(values, "project"),
            values.GetValueOrDefault("conversation", string.Empty),
            Required(values, "prompt-file"));
    }

    public static string Usage =>
        "codex-studio-uiauto send --project <path-or-name> [--conversation <title>] --prompt-file <path>";

    private static string Required(IReadOnlyDictionary<string, string> values, string key)
    {
        if (!values.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException($"Missing --{key}.");
        }

        return value;
    }
}

internal sealed class WindowsCodexUiDriver
{
    private static readonly TimeSpan StepTimeout = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan UiSettleDelay = TimeSpan.FromMilliseconds(350);
    private static readonly string[] PromptInputNameHints = ["prompt", "message", "ask", "input"];

    public async Task SendPromptAsync(CliCommand command, CancellationToken cancellationToken = default)
    {
        var restoreHandle = NativeMethods.GetForegroundWindow();
        var prompt = await System.IO.File.ReadAllTextAsync(command.PromptFile, cancellationToken);

        try
        {
            var window = await FindCodexWindowAsync(cancellationToken);
            FocusWindow(window);

            if (!string.IsNullOrWhiteSpace(command.Project))
            {
                await ActivateByVisibleNameOrSearchAsync(window, command.Project, "^k", cancellationToken);
                window = await FindCodexWindowAsync(cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(command.Conversation))
            {
                await ActivateByVisibleNameOrSearchAsync(window, command.Conversation, "^k", cancellationToken);
                window = await FindCodexWindowAsync(cancellationToken);
            }

            await PastePromptAsync(window, prompt, cancellationToken);
            SendKeys.SendWait("{ENTER}");
            await DelayAsync(cancellationToken);
        }
        finally
        {
            RestoreWindow(restoreHandle);
        }
    }

    private static async Task ActivateByVisibleNameOrSearchAsync(AutomationElement root, string text, string hotKey, CancellationToken cancellationToken)
    {
        if (TryActivateVisibleElement(root, text))
        {
            await DelayAsync(cancellationToken);
            return;
        }

        SendKeys.SendWait(hotKey);
        await DelayAsync(cancellationToken);
        Clipboard.SetText(text);
        SendKeys.SendWait("^v");
        await DelayAsync(cancellationToken);
        SendKeys.SendWait("{ENTER}");
        await DelayAsync(cancellationToken);
    }

    private static async Task PastePromptAsync(AutomationElement root, string prompt, CancellationToken cancellationToken)
    {
        var input = FindPromptInput(root);
        if (input is not null && !TrySetFocus(input.SetFocus) && !input.Current.BoundingRectangle.IsEmpty)
        {
            ClickCenter(input.Current.BoundingRectangle);
            await DelayAsync(cancellationToken);
        }

        Clipboard.SetText(prompt);
        SendKeys.SendWait("^v");
        await DelayAsync(cancellationToken);
    }

    private static async Task<AutomationElement> FindCodexWindowAsync(CancellationToken cancellationToken)
    {
        var deadline = DateTimeOffset.UtcNow + StepTimeout;
        while (DateTimeOffset.UtcNow <= deadline)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var byProcess = FindWindowByProcess();
            if (byProcess is not null) return byProcess;

            var byTitle = FindWindowByTitle();
            if (byTitle is not null) return byTitle;

            await Task.Delay(200, cancellationToken);
        }

        throw new InvalidOperationException("Could not find a Codex window.");
    }

    private static AutomationElement? FindWindowByProcess()
    {
        foreach (var process in Process.GetProcesses())
        {
            if (process.MainWindowHandle == IntPtr.Zero) continue;
            if (!process.ProcessName.Contains("Codex", StringComparison.OrdinalIgnoreCase)) continue;
            return AutomationElement.FromHandle(process.MainWindowHandle);
        }

        return null;
    }

    private static AutomationElement? FindWindowByTitle()
    {
        var children = AutomationElement.RootElement.FindAll(TreeScope.Children, Condition.TrueCondition);
        foreach (AutomationElement child in children)
        {
            if (child.Current.Name.Contains("Codex", StringComparison.OrdinalIgnoreCase))
            {
                return child;
            }
        }

        return null;
    }

    private static void FocusWindow(AutomationElement window)
    {
        var handle = new IntPtr(window.Current.NativeWindowHandle);
        NativeMethods.SetForegroundWindow(handle);
        if (window.TryGetCurrentPattern(WindowPattern.Pattern, out var patternObject)
            && patternObject is WindowPattern windowPattern)
        {
            windowPattern.SetWindowVisualState(WindowVisualState.Normal);
        }

        TrySetFocus(window.SetFocus);
    }

    private static void RestoreWindow(IntPtr handle)
    {
        if (handle == IntPtr.Zero || !NativeMethods.IsWindow(handle)) return;
        NativeMethods.SetForegroundWindow(handle);
    }

    private static bool TryActivateVisibleElement(AutomationElement root, string text)
    {
        var descendants = root.FindAll(TreeScope.Descendants, Condition.TrueCondition);
        foreach (AutomationElement element in descendants)
        {
            if (string.IsNullOrWhiteSpace(element.Current.Name)
                || !element.Current.Name.Contains(text, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (element.TryGetCurrentPattern(InvokePattern.Pattern, out var invokeObject)
                && invokeObject is InvokePattern invokePattern)
            {
                invokePattern.Invoke();
                return true;
            }

            if (element.TryGetCurrentPattern(SelectionItemPattern.Pattern, out var selectionObject)
                && selectionObject is SelectionItemPattern selectionPattern)
            {
                selectionPattern.Select();
                return true;
            }

            if (!element.Current.BoundingRectangle.IsEmpty)
            {
                ClickCenter(element.Current.BoundingRectangle);
                return true;
            }
        }

        return false;
    }

    private static AutomationElement? FindPromptInput(AutomationElement root)
    {
        var edits = root.FindAll(
            TreeScope.Descendants,
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit));

        AutomationElement? fallback = null;
        foreach (AutomationElement edit in edits)
        {
            fallback ??= edit;
            if (PromptInputNameHints.Any(hint => edit.Current.Name.Contains(hint, StringComparison.OrdinalIgnoreCase)))
            {
                return edit;
            }
        }

        return fallback;
    }

    private static bool TrySetFocus(Action action)
    {
        try
        {
            action();
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static void ClickCenter(System.Windows.Rect rectangle)
    {
        var x = (int)(rectangle.Left + rectangle.Width / 2);
        var y = (int)(rectangle.Top + rectangle.Height / 2);
        NativeMethods.SetCursorPos(x, y);
        NativeMethods.MouseEvent(NativeMethods.MouseEventLeftDown, 0, 0, 0, UIntPtr.Zero);
        NativeMethods.MouseEvent(NativeMethods.MouseEventLeftUp, 0, 0, 0, UIntPtr.Zero);
    }

    private static Task DelayAsync(CancellationToken cancellationToken) =>
        Task.Delay(UiSettleDelay, cancellationToken);

    private static class NativeMethods
    {
        public const uint MouseEventLeftDown = 0x0002;
        public const uint MouseEventLeftUp = 0x0004;

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool SetCursorPos(int x, int y);

        [DllImport("user32.dll", EntryPoint = "mouse_event")]
        public static extern void MouseEvent(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
    }
}
