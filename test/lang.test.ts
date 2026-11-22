import { describe, expect, it } from "vitest";
import { brand, resolveLang, translate } from "../src/lang";

describe("lang (port of src/lang.rs)", () => {
  it("follows the saved language, then the browser locale", () => {
    expect(resolveLang("", "ru-RU")).toBe("ru");
    expect(resolveLang("", "ru_RU")).toBe("ru");
    expect(resolveLang("default", "ru")).toBe("ru");
    expect(resolveLang("en", "ru-RU")).toBe("en");
  });

  it("translates to Russian and falls back to English, then to the key", () => {
    expect(translate("ru-RU", "Address book", "")).toBe("Адресная книга");
    expect(translate("en-US", "Address book", "")).toBe("Address book");
    expect(translate("ru-RU", "no-such-key-zz", "")).toBe("no-such-key-zz");
    // unknown locale uses the English table (desk_tip has an English text)
    expect(translate("xx", "desk_tip", "")).not.toBe("desk_tip");
  });

  it("fills {placeholders}", () => {
    expect(translate("en", "{3} sessions", "")).toContain("3");
  });
});

describe("lang placeholders are literal", () => {
  it("keeps $ patterns in the value as they are", () => {
    expect(translate("en", "{$&$'} sessions", "")).toContain("$&$'");
  });
});

describe("brand WorkDesk", () => {
  it("shows WorkDesk instead of the original product name", () => {
    expect(translate("ru-RU", "Confirm RustDesk password", "")).not.toMatch(/RustDesk/);
    expect(translate("en", "About RustDesk", "")).toBe("About WorkDesk");
  });
  it("keeps server product names and the based-on notice", () => {
    expect(brand("RustDesk Server Pro")).toBe("RustDesk Server Pro");
    expect(brand("Основано на RustDesk")).toBe("Основано на RustDesk");
    expect(brand("Показать RustDesk")).toBe("Показать WorkDesk");
  });
});
