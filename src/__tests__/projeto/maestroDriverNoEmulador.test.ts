import fs from "fs";
import path from "path";

// bateria 25/10 01:28: 10 etapas caíram em "prepara a etapa". O logcat: "Unable to freeze binder for <pid>: -11"
// e "Sending oneway calls to frozen process" antes de "Crash of app dev.mobile.maestro" — o congelador de apps
// do Android congela o driver do Maestro. O preparo do emulador o desliga, (a 2ª tentativa com driver novo entra no bateria.sh quando a bateria em curso terminar).
const ler = (f: string) => fs.readFileSync(path.resolve(__dirname, "../../..", f), "utf8");

describe("Maestro no emulador — o driver não pode ser congelado", () => {
  const setup = ler(".maestro/setup.sh");

  it("o preparo do emulador desliga o congelador de apps e o modo soneca", () => {
    const emulador = setup.slice(setup.indexOf("emulator-*)"), setup.indexOf("# 5. Acordar o staging"));
    expect(emulador).toContain("settings put global cached_apps_freezer disabled");
    expect(emulador).toContain("device_config put activity_manager_native_boot use_freezer false");
    expect(emulador).toContain("dumpsys deviceidle disable");
    expect(emulador).toContain("settings put global app_standby_enabled 0");
  });

  it("isso vale só no emulador, não no celular do André", () => {
    const antes = setup.slice(0, setup.indexOf("cached_apps_freezer"));
    expect(antes.lastIndexOf("emulator-*)")).toBeGreaterThan(antes.lastIndexOf("esac"));
  });
});
