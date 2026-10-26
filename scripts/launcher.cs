// Guy Scout "lite" launcher: a tiny Windows bootstrapper that fetches the Node runtime once
// (verified by SHA-256) and runs the embedded Guy Scout app. Compiled with the .NET Framework
// C# compiler that ships with Windows — no build tools required.
using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;

static class GuyScoutLauncher
{
    const string NodeVer = "__NODE_VER__";
    const string NodeSha = "__NODE_SHA__";
    const string AppVer = "__APP_VER__";
    const string AppHash = "__APP_HASH__"; // content hash of the embedded app — cache key, so updates refresh

    static int Main()
    {
        Console.Title = "Guy Scout";
        try { Run(); return 0; }
        catch (Exception e)
        {
            Console.WriteLine();
            Console.WriteLine("Guy Scout could not start: " + e.Message);
            Console.WriteLine("Press Enter to close.");
            Console.ReadLine();
            return 1;
        }
    }

    static void Run()
    {
        string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GuyScout");
        string nodeDir = Path.Combine(root, "node-" + NodeVer);
        string nodeExe = Path.Combine(nodeDir, "node.exe");
        string appDir = Path.Combine(root, "app-" + AppVer + "-" + AppHash);
        Directory.CreateDirectory(root);

        if (!File.Exists(nodeExe))
        {
            Console.WriteLine("First run setup: downloading the Node runtime (~28 MB), one time only...");
            string url = "https://nodejs.org/dist/" + NodeVer + "/node-" + NodeVer + "-win-x64.zip";
            string zip = Path.Combine(Path.GetTempPath(), "guyscout-node-" + NodeVer + ".zip");
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | (SecurityProtocolType)12288; // TLS 1.2 + 1.3
            using (var wc = new WebClient()) wc.DownloadFile(url, zip);

            Console.WriteLine("Verifying download...");
            if (!string.Equals(Sha256(zip), NodeSha, StringComparison.OrdinalIgnoreCase))
            {
                try { File.Delete(zip); } catch { }
                throw new Exception("the Node runtime failed its integrity check — download aborted for safety.");
            }

            Console.WriteLine("Extracting the runtime...");
            Directory.CreateDirectory(nodeDir);
            using (var za = ZipFile.OpenRead(zip))
                foreach (var e in za.Entries)
                    if (e.Name == "node.exe" && e.FullName.EndsWith("/node.exe", StringComparison.OrdinalIgnoreCase))
                    { e.ExtractToFile(nodeExe, true); break; }
            try { File.Delete(zip); } catch { }
            if (!File.Exists(nodeExe)) throw new Exception("node.exe was not found inside the downloaded runtime.");
        }

        if (!File.Exists(Path.Combine(appDir, ".ready")))
        {
            Console.WriteLine("Unpacking Guy Scout...");
            if (Directory.Exists(appDir)) Directory.Delete(appDir, true);
            Directory.CreateDirectory(appDir);
            using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.zip"))
            using (var za = new ZipArchive(s, ZipArchiveMode.Read))
                za.ExtractToDirectory(appDir);
            File.WriteAllText(Path.Combine(appDir, ".ready"), AppVer);
        }

        string exeDir = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        var psi = new ProcessStartInfo
        {
            FileName = nodeExe,
            Arguments = "guyscout.cjs",
            WorkingDirectory = appDir,
            UseShellExecute = false,
        };
        psi.EnvironmentVariables["GUYSCOUT_EXE"] = "1";
        psi.EnvironmentVariables["GUYSCOUT_DIST_DIR"] = Path.Combine(appDir, "web", "dist");
        psi.EnvironmentVariables["GUYSCOUT_DATA_DIR"] = Path.Combine(exeDir, "GuyScout-data");

        Console.WriteLine("Starting Guy Scout — your browser will open shortly.");
        Console.WriteLine("Keep this window open while you use it; close it to stop.");
        Console.WriteLine();
        var p = Process.Start(psi);
        p.WaitForExit();
    }

    static string Sha256(string file)
    {
        using (var sha = SHA256.Create())
        using (var fs = File.OpenRead(file))
            return BitConverter.ToString(sha.ComputeHash(fs)).Replace("-", "");
    }
}
