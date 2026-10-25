// Minimal read-only Win32 bindings (via koffi FFI) used to locate the FM process and
// read its memory. Nothing here can write to another process.
import koffi from 'koffi';

const kernel32 = koffi.load('kernel32.dll');

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const PROCESS_VM_READ = 0x0010;
const TH32CS_SNAPPROCESS = 0x2;
const TH32CS_SNAPMODULE = 0x8;
const TH32CS_SNAPMODULE32 = 0x10;
const INVALID_HANDLE = 0xffffffffffffffffn;

const PROCESSENTRY32W = koffi.struct('PROCESSENTRY32W', {
  dwSize: 'uint32',
  cntUsage: 'uint32',
  th32ProcessID: 'uint32',
  th32DefaultHeapID: 'uintptr',
  th32ModuleID: 'uint32',
  cntThreads: 'uint32',
  th32ParentProcessID: 'uint32',
  pcPriClassBase: 'int32',
  dwFlags: 'uint32',
  szExeFile: koffi.array('char16_t', 260),
});

const MODULEENTRY32W = koffi.struct('MODULEENTRY32W', {
  dwSize: 'uint32',
  th32ModuleID: 'uint32',
  th32ProcessID: 'uint32',
  GlblcntUsage: 'uint32',
  ProccntUsage: 'uint32',
  modBaseAddr: 'uintptr',
  modBaseSize: 'uint32',
  hModule: 'uintptr',
  szModule: koffi.array('char16_t', 256),
  szExePath: koffi.array('char16_t', 260),
});

const CreateToolhelp32Snapshot = kernel32.func('uintptr_t __stdcall CreateToolhelp32Snapshot(uint32_t flags, uint32_t pid)');
const Process32FirstW = kernel32.func('int __stdcall Process32FirstW(uintptr_t snap, _Inout_ PROCESSENTRY32W *entry)');
const Process32NextW = kernel32.func('int __stdcall Process32NextW(uintptr_t snap, _Inout_ PROCESSENTRY32W *entry)');
const Module32FirstW = kernel32.func('int __stdcall Module32FirstW(uintptr_t snap, _Inout_ MODULEENTRY32W *entry)');
const OpenProcess = kernel32.func('uintptr_t __stdcall OpenProcess(uint32_t access, int inherit, uint32_t pid)');
const CloseHandle = kernel32.func('int __stdcall CloseHandle(uintptr_t h)');
const GetExitCodeProcess = kernel32.func('int __stdcall GetExitCodeProcess(uintptr_t h, _Out_ uint32_t *code)');
const GetLastError = kernel32.func('uint32_t __stdcall GetLastError()');
// lpBaseAddress is declared as uint64 so plain JS numbers can be passed (user-space addresses fit in 47 bits).
export const ReadProcessMemory = kernel32.func(
  'int __stdcall ReadProcessMemory(uintptr_t h, uint64_t addr, _Out_ uint8_t *buf, size_t size, _Out_ size_t *read)',
);

export interface ProcessInfo {
  pid: number;
  exe: string;
}

export interface ModuleInfo {
  base: number;
  size: number;
  path: string;
}

export function findProcess(exeName: string): ProcessInfo | null {
  const snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) as bigint;
  if (snap === INVALID_HANDLE) return null;
  try {
    const entry: Record<string, unknown> = { dwSize: koffi.sizeof(PROCESSENTRY32W) };
    let ok = Process32FirstW(snap, entry);
    while (ok) {
      const exe = String(entry.szExeFile);
      if (exe.toLowerCase() === exeName.toLowerCase()) {
        return { pid: Number(entry.th32ProcessID), exe };
      }
      ok = Process32NextW(snap, entry);
    }
    return null;
  } finally {
    CloseHandle(snap);
  }
}

export function mainModule(pid: number): ModuleInfo | null {
  const snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid) as bigint;
  if (snap === INVALID_HANDLE) return null;
  try {
    const entry: Record<string, unknown> = { dwSize: koffi.sizeof(MODULEENTRY32W) };
    if (!Module32FirstW(snap, entry)) return null;
    return { base: Number(entry.modBaseAddr), size: Number(entry.modBaseSize), path: String(entry.szExePath) };
  } finally {
    CloseHandle(snap);
  }
}

export function openForRead(pid: number): bigint {
  const h = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) as bigint;
  if (!h) throw new Error(`OpenProcess failed (error ${GetLastError()})`);
  return h;
}

export function isAlive(handle: bigint): boolean {
  const code = [0];
  if (!GetExitCodeProcess(handle, code)) return false;
  return code[0] === 259; // STILL_ACTIVE
}

export function closeHandle(handle: bigint): void {
  CloseHandle(handle);
}
