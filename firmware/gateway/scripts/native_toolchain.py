Import("env")

import os
import shutil
from pathlib import Path


project_root = Path(env.subst("$PROJECT_DIR")).resolve().parents[1]
configured = os.environ.get("SC_NATIVE_TOOLCHAIN_BIN")
local = project_root / ".toolchains" / "winlibs" / "mingw64" / "bin"
toolchain_bin = Path(configured).resolve() if configured else local

if os.name == "nt" and toolchain_bin.is_dir():
    env["ENV"]["PATH"] = str(toolchain_bin) + os.pathsep + env["ENV"].get("PATH", "")

    def copy_native_runtime(source, target, env):
        output_dir = Path(env.subst("$BUILD_DIR"))
        for name in ("libgcc_s_seh-1.dll", "libstdc++-6.dll", "libwinpthread-1.dll"):
            runtime = toolchain_bin / name
            if runtime.is_file():
                shutil.copy2(runtime, output_dir / name)

    env.AddPostAction("$BUILD_DIR/${PROGNAME}${PROGSUFFIX}", copy_native_runtime)
